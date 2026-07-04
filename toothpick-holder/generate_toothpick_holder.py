#!/usr/bin/env python3
"""Parametric toothpick holder: hollow handle (stores ~20 toothpicks),
external slot rib that friction-holds one ready-to-use pick, and a
friction-fit cap. Both parts are arranged flat on the plate in one STL.

Usage:  pip install trimesh manifold3d numpy
        python3 generate_toothpick_holder.py  ->  toothpick_holder.stl

All dimensions in millimetres. Sized for standard round toothpicks
(~65 mm long, ~2.0-2.2 mm diameter). Print with no supports:
body stands on its base, cap lies top-face down.
"""

import numpy as np
import trimesh
from trimesh.creation import cylinder, box

SEG = 96  # circle resolution

# ---- body -----------------------------------------------------------------
BODY_H = 78.0        # overall handle height
OUT_R = 9.0          # outer radius (18 mm diameter grip)
BORE_R = 7.0         # storage bore radius (14 mm) -> 2 mm wall
FLOOR = 3.0          # solid floor thickness
RIB_W = 7.0          # rib width (tangential)
RIB_PROUD = 4.0      # how far the rib stands off the outer wall
SLOT_W = 2.3         # slot width, grips a ~2.1 mm toothpick
SLOT_DEPTH = 3.2     # slot depth measured inward from rib face
SLOT_FLOOR = 8.0     # slot starts here so the held pick rests on a ledge

# ---- cap ------------------------------------------------------------------
CAP_R = 10.0         # cap disc radius (overhangs body 1 mm for grip)
CAP_H = 5.0          # cap disc thickness
PLUG_R = BORE_R - 0.25   # 0.5 mm diametral clearance for friction fit
PLUG_H = 8.0


def _cyl(r, h, z0=0.0):
    c = cylinder(radius=r, height=h, sections=SEG)
    c.apply_translation([0, 0, z0 + h / 2])
    return c


def _box(sx, sy, sz, cx, cy, z0):
    b = box(extents=[sx, sy, sz])
    b.apply_translation([cx, cy, z0 + sz / 2])
    return b


def build_body():
    shell = _cyl(OUT_R, BODY_H)
    rib_face = OUT_R + RIB_PROUD
    # rib spans from inside the wall out to rib_face
    rib = _box(rib_face, RIB_W, BODY_H, rib_face / 2, 0, 0)
    body = shell.union(rib)

    bore = _cyl(BORE_R, BODY_H - FLOOR + 1, FLOOR)  # +1 opens the top cleanly
    slot = _box(SLOT_DEPTH + 1, SLOT_W, BODY_H - SLOT_FLOOR + 1,
                rib_face - SLOT_DEPTH / 2 + 0.5, 0, SLOT_FLOOR)
    return body.difference(bore).difference(slot)


def build_cap():
    # modelled print-side down: disc on the plate, plug pointing up
    return _cyl(CAP_R, CAP_H).union(_cyl(PLUG_R, PLUG_H, CAP_H))


def main():
    body = build_body()
    cap = build_cap()
    cap.apply_translation([OUT_R + RIB_PROUD + CAP_R + 8, 0, 0])
    scene = trimesh.util.concatenate([body, cap])

    assert body.is_watertight and cap.is_watertight, "mesh not watertight"
    scene.export("toothpick_holder.stl")
    ext = scene.bounds[1] - scene.bounds[0]
    print(f"toothpick_holder.stl  {len(scene.faces)} triangles  "
          f"{ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm")


if __name__ == "__main__":
    main()
