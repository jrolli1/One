# Toothpick Holder — 3D print files

A pocket toothpick holder: a hollow handle that stores ~20 standard toothpicks
inside, a side rib with a slot that friction-holds one ready-to-use pick, and a
friction-fit cap. Both parts print together, no supports.

## Files

| File | What it is |
|------|-----------|
| `toothpick_holder.stl` | Print file — body + cap arranged on the plate (binary STL, mm) |
| `viewer.html` | Self-contained 3D web viewer — open in any browser, drag to rotate, download the STL from the page |
| `generate_toothpick_holder.py` | Parametric source — edit dimensions at the top, re-run to regenerate the STL |
| `viewer_template.html` | Viewer source with a `__STL_BASE64__` placeholder (see below) |

## Print settings

- Layer 0.2 mm, 3 perimeters, 15–20 % infill, PLA or PETG
- No supports — the body stands on its base, the cap lies top-face down
- ~14 g of filament

## Dimensions

- Body: Ø18 × 78 mm; Ø14 mm bore, 75 mm deep (fits 65 mm toothpicks)
- Slot: 2.3 mm wide, grips a ~2.1 mm round toothpick; the pick rests on a
  ledge 8 mm up so it can't slide through
- Cap: Ø20 mm disc, Ø13.5 mm plug (0.5 mm diametral clearance for a push fit)

If the cap is too tight/loose or the slot doesn't grip on your printer, adjust
`PLUG_R` or `SLOT_W` in the generator and re-run.

## Regenerating

```bash
pip install trimesh manifold3d numpy
python3 generate_toothpick_holder.py            # -> toothpick_holder.stl
python3 - <<'EOF'                               # -> viewer.html (STL embedded as base64)
import base64
b64 = base64.b64encode(open("toothpick_holder.stl","rb").read()).decode()
open("viewer.html","w").write(open("viewer_template.html").read().replace("__STL_BASE64__", b64))
EOF
```
