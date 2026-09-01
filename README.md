# Playables portfolio

Static site. No build step. Deploys as-is to GitHub Pages.

```
index.html            landing page (playable list = PLAYABLES array at the bottom)
play/<slug>.html      one self-contained playable per file
assets/               optional card screenshots
scripts/debrand.mjs   strips store redirect links from a build
```

## Add a playable

```bash
node scripts/debrand.mjs "path/to/build.zip" my-slug
```

Removes Google Play / App Store redirect links only, verifies none remain, writes
`play/my-slug.html`, and prints a manifest row. Paste that row into the PLAYABLES
array in `index.html`, then fill in the title and role text.

Optionally drop a screenshot into `assets/` and set `poster` on that row to replace
the plain colour tile on the card.

## Local preview

```bash
npx serve .
```
