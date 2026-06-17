# Epic Forts — Fort Builder

A fun, adventurous web app for the **National Geographic Epic Forts™** kit.
Design your fort with a drag-and-drop builder, keep a live parts count, and
save, share, or print your blueprint.

> Project with Erin 🏕️

## Features

- **Drag-and-drop fort builder canvas** — drag parts from the kit onto a
  survey-grid build site, then reposition, rotate, or remove them.
- **Expedition kit sidebar** — walls, roof panels, doors, tunnels, and
  connector clips, each with a live "remaining" badge.
- **Live parts count & checklist** — every part is tracked against the
  official Epic Forts manifest with a progress bar.
- **Save & share** — download your blueprint as a file, or copy a shareable
  link that encodes the whole build in the URL.
- **Print-friendly layout** — a clean build sheet with a parts manifest.
- **National Geographic style** — the signature yellow rectangle, bold
  expedition typography, compass, and topographic survey grid.

## Run it

It's a static site — no build step, no dependencies. Either:

```bash
# Option A: just open the file
xdg-open index.html    # Linux  (use 'open' on macOS)

# Option B: serve it locally (recommended so Share links resolve)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How it works

| Action | How |
| --- | --- |
| Place a part | Drag it from the kit onto the canvas (or double-click it) |
| Move a part | Drag it around the canvas |
| Rotate / remove | Tap a placed part, use the round controls (or press `Delete`) |
| Toggle grid snap | Use the **SNAP** switch above the canvas |
| Save / Share / Print | Buttons in the top bar |

Your build is auto-saved to the browser, so it's still there when you return.

## Files

- `index.html` — markup & layout
- `styles.css` — National Geographic theme + print styles
- `app.js` — builder logic (drag-and-drop, counts, save/share/print)

_National Geographic and Epic Forts are referenced for this themed concept app._
