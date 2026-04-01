# 🍴 My Recipe Collection

A lightweight personal recipe portfolio — paste Instagram captions, parse them instantly into structured recipes, and browse your collection from any device.

No accounts. No backend. No build step. Just one HTML file.

---

## What it does

- **Paste & parse** — copy a recipe caption from Instagram (or anywhere), paste it in, and the tool automatically extracts ingredients and instructions
- **Review & edit** — tweak anything before saving: title, steps, ingredients, time, servings, and tags
- **Smart suggestions** — title and tag suggestions generated from the recipe text so you can tap instead of type
- **Browse & search** — search across recipe names, ingredients, and tags; filter by tag from the top bar
- **Zero friction** — works offline, no login, no API keys

---

## How to use it

### Adding a recipe
1. See a recipe on Instagram — make it, test it, love it
2. Copy the caption text
3. Click **＋ Add Recipe** and paste the text
4. Hit **Parse Recipe** — ingredients and steps are extracted automatically
5. Pick a title, select tags, adjust anything if needed
6. Hit **Save to Collection**

### Publishing to GitHub Pages
1. Create a new GitHub repository
2. Upload `index.html`
3. Go to **Settings → Pages → Deploy from branch → main / root**
4. Your collection is live at `https://yourusername.github.io/your-repo-name`

### Keeping recipes after closing the page
Each time you save a recipe, the page downloads an updated `recipes.json`. Push that file to your repo alongside `index.html` and your collection will persist across visits.

---

## Tips

- **No section headers?** The parser detects ingredients and steps from context, so messy or headerless captions still work
- **Wrong parse?** Everything is editable in the review step before saving
- **Tags** — tap suggestion chips to toggle on/off, or type your own and press comma or Enter

---

## Stack

React via CDN · plain HTML/CSS/JS · no build tools · no dependencies
