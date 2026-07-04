# Toothpick Holder — 3D print files

Screwdriver-style pocket toothpick holder, two printed parts:

- **Handle** — fluted grip with a tapered nose. A Ø2.4 mm axial socket in the
  tip wedges one tapered toothpick so it points out like a screwdriver bit.
  The grip is hollow (Ø14.6 mm bore, holds ~20 standard 65 mm toothpicks) and
  the back mouth carries an internal thread.
- **Screw cap** — Ø23 mm scalloped knob with a male-threaded plug
  (Ø16 mm × 2.5 mm-pitch trapezoid thread, 0.3 mm radial clearance, ~3 turns)
  that seals the storage compartment in the handle.

Threads are generated as radius-modulated helical surfaces, so both meshes
are watertight with no boolean artifacts.

## Files

| File | What it is |
|------|-----------|
| `toothpick_holder.stl` | Print file — handle + cap arranged on the plate (binary STL, mm) |
| `viewer.html` | Self-contained 3D web viewer — open in any browser, drag to rotate, download the STL from the page |
| `generate_toothpick_holder.py` | Parametric source — edit dimensions at the top, re-run to regenerate the STL |
| `viewer_template.html` | Viewer source with a `__STL_BASE64__` placeholder (see below) |

## Print settings

- Layer 0.2 mm, 3 perimeters, 15–20 % infill, PLA or PETG
- No supports — the handle stands on its threaded mouth, the cap prints knob-down
- ~22 g of filament

## Dimensions

- Handle: Ø21 × 94 mm; storage bore Ø14.6 × 68 mm free depth; tip socket Ø2.4 × 12 mm
- Thread: 2.5 mm pitch, 1.0 mm deep trapezoid form, 8 mm engagement,
  1 mm entry flare and run-out fades at both ends for easy starting
- Cap: Ø23 × 15 mm overall

If the cap threads too tight/loose on your printer, adjust `CLEAR` (radial
thread clearance) in the generator; if the toothpick doesn't wedge snugly,
adjust `SOCKET_R`. Re-run to regenerate.

## Regenerating

```bash
pip install trimesh numpy
python3 generate_toothpick_holder.py            # -> toothpick_holder.stl
python3 - <<'EOF'                               # -> viewer.html (STL embedded as base64)
import base64
b64 = base64.b64encode(open("toothpick_holder.stl","rb").read()).decode()
open("viewer.html","w").write(open("viewer_template.html").read().replace("__STL_BASE64__", b64))
EOF
```
