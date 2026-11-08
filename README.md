# Fucking Color This! — web edition

A free, browser-based swear-word coloring book, built from the paperback series
*Fucking Color This!* by Dano Unsupervised and author Daniel C Willox.

- 40 one-slogan designs, each dressed in doodles (flowers, mushrooms, skulls, checkerboards, waves, cupcakes...)
- Tap or drag to fill, eraser, eyedropper, "Fuck it" random coloring, undo/redo
- Six color sets plus a custom picker and recent colors
- The Filthy Lineup: checkbox tracker with Not started / In progress / Finished filters
- Pick by Mood: five levels from gentle eye-roll to the nuclear option, plus Surprise me
- Save PNG, Share (Web Share API), print colored or print blank, zoom slider
- Adults-only gate; progress saved in the browser (localStorage)

Static site, no build step. Open `index.html` through any web server, e.g.

    python -m http.server 8657

## Files

- `index.html` / `style.css` — shell and look
- `motifs.js` — doodle library (each motif = fillable shapes in local coordinates)
- `designs.js` — the 40 slogans, themes, moods, and the composer that lays out a page
- `render.js` — SVG renderer (screen) and canvas renderer (PNG export), same item list
- `app.js` — routing, views, coloring desk, storage

Designs are generated from a seed, so every page is the same each visit; add a line to the
`D` list in `designs.js` to add a page (slogan, font, theme, mood 1-5, background, bounce).
