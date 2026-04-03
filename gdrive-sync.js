/**
 * gdrive-sync.js  — shared Google Drive sync module
 * ─────────────────────────────────────────────────
 * Drop this file next to any project's index.html.
 * Each project uses a different FILENAME so they all live
 * side-by-side in the same appDataFolder without colliding.
 *
 * SETUP (one-time, shared across all your projects):
 *   1. https://console.cloud.google.com → new project
 *   2. APIs & Services → Enable → "Google Drive API"
 *   3. Credentials → + Create → OAuth client ID
 *      • Type: Web application
 *      • Origins: https://yourname.github.io  +  http://localhost
 *   4. Paste the Client ID into EVERY project that uses this module:
 *        const sync = new DriveSync("YOUR_CLIENT_ID.apps.googleusercontent.com", "my-project.json");
 *
 * USAGE IN ANY PROJECT:
 *   const sync = new DriveSync(CLIENT_ID, "project-name.json");
 *
 *   await sync.load()          → returns parsed JS value (or null if no file yet)
 *   await sync.save(data)      → writes JSON to Drive; returns true on success
 *   sync.isConfigured()        → false when CLIENT_ID is still the placeholder
 *   sync.status                → "idle"|"loading"|"saving"|"synced"|"error"
 *   sync.onStatusChange = fn   → called with (status, message) on every change
 */

class DriveSync {
  // ── Public API ────────────────────────────────────────────────────
  constructor(clientId, filename) {
    if (!filename) throw new Error("DriveSync: filename is required");
    this._clientId  = clientId;
    this._filename  = filename;
    this._scope     = "https://www.googleapis.com/auth/drive.appdata";
    this._token     = null;          // cached access token
    this._gisReady  = false;
    this.status     = "idle";
    this.onStatusChange = null;      // optional callback: (status, message) => {}

    this._pollForGIS();
  }

  /** True once the Client ID has been filled in. */
  isConfigured() {
    return this._clientId && !this._clientId.startsWith("739039916071-ematentftfchllf6asdtsq6hruvvk0ip.apps.googleusercontent.com");
  }

  /**
   * Load data from Drive.
   * Returns the parsed JS value, or null if the file doesn't exist yet
   * (first run). Triggers the Google sign-in popup if needed.
   */
  async load() {
    if (!this.isConfigured()) { this._emit("disabled", "Drive sync not configured"); return null; }
    this._emit("loading", "Loading from Google Drive…");
    try {
      const token  = await this._getToken();
      const fileId = await this._findFileId(token);
      if (!fileId) { this._emit("synced", "No Drive file yet — will create on first save"); return null; }
      const res  = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._emit("synced", `Loaded from Drive ✓`);
      return data;
    } catch (e) {
      if (e.message === "access_denied" || e.message === "popup_closed_by_user") {
        this._emit("idle", ""); return null;
      }
      this._emit("error", `Load failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Save data to Drive (creates or updates the project file).
   * Returns true on success, false on failure.
   */
  async save(data) {
    if (!this.isConfigured()) return false;
    this._emit("saving", "Saving to Google Drive…");
    try {
      const token  = await this._getToken();
      const fileId = await this._findFileId(token);
      const blob   = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });

      if (fileId) {
        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: blob }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const meta = JSON.stringify({ name: this._filename, parents: ["appDataFolder"] });
        const form = new FormData();
        form.append("metadata", new Blob([meta], { type: "application/json" }));
        form.append("file", blob);
        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      this._emit("synced", "Saved to Drive ✓");
      return true;
    } catch (e) {
      this._emit("error", `Save failed: ${e.message}`);
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────
  _emit(status, message) {
    this.status = status;
    if (typeof this.onStatusChange === "function") this.onStatusChange(status, message);
  }

  _pollForGIS() {
    if (window.google?.accounts?.oauth2) { this._gisReady = true; return; }
    const iv = setInterval(() => {
      if (window.google?.accounts?.oauth2) { this._gisReady = true; clearInterval(iv); }
    }, 150);
  }

  _getToken() {
    return new Promise((resolve, reject) => {
      // Return cached token if still valid
      if (this._token) { resolve(this._token); return; }
      // Wait for GIS script to load (max 10 s)
      const deadline = Date.now() + 10_000;
      const wait = setInterval(() => {
        if (this._gisReady) { clearInterval(wait); this._requestToken(resolve, reject); return; }
        if (Date.now() > deadline) { clearInterval(wait); reject(new Error("Google Identity Services failed to load")); }
      }, 150);
    });
  }

  _requestToken(resolve, reject) {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: this._clientId,
      scope: this._scope,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        this._token = resp.access_token;
        // Clear token ~60 s before expiry
        setTimeout(() => { this._token = null; }, (resp.expires_in - 60) * 1000);
        resolve(this._token);
      },
    });
    client.requestAccessToken({ prompt: "" }); // silent if already consented
  }

  async _findFileId(token) {
    const q   = encodeURIComponent(`name="${this._filename}"`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.files?.[0]?.id || null;
  }
}

// Export for ES-module environments; also attach to window for plain <script> use
if (typeof module !== "undefined") module.exports = { DriveSync };
else window.DriveSync = DriveSync;
