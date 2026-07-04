#!/usr/bin/env python3
"""Screwdriver-style toothpick holder, two printed parts:

  01 HANDLE  - fluted grip with a tapered nose; a 2.4 mm axial socket in the
               tip holds one toothpick pointing out like a screwdriver bit.
               The handle is hollow (~20 toothpicks) and the back mouth has
               an internal thread.
  02 SCREW CAP - scalloped knob with a male-threaded plug that closes the
               storage compartment.

Threads are generated as radius-modulated surfaces (trapezoid profile swept
on a helix), so both meshes are watertight by construction - no booleans.

Usage:  pip install trimesh numpy
        python3 generate_toothpick_holder.py  ->  toothpick_holder.stl

Dimensions in mm. Sized for standard round toothpicks (~65 x 2.1 mm).
Print with no supports: handle stands on its threaded mouth, cap knob-down.
"""

import numpy as np
import trimesh

TH_N = 96                                  # points per ring
THETA = np.linspace(0, 2 * np.pi, TH_N, endpoint=False)

# ---- thread spec (shared) ---------------------------------------------------
PITCH = 2.5
DEPTH = 1.0          # radial thread depth
MALE_CORE = 7.0      # male core radius -> crest at 8.0 (M16-ish, coarse)
CLEAR = 0.3          # radial clearance added to the female form
THREAD_LEN = 8.0

# ---- handle -----------------------------------------------------------------
BODY_H = 94.0
GRIP_R = 10.5        # Ø21 grip
NOSE_Z = 76.0        # taper starts here
NOSE_TIP_R = 4.5
BORE_R = MALE_CORE + CLEAR      # 7.3 -> Ø14.6 storage bore
CONE_Z0, CONE_Z1 = 76.0, 82.0   # internal funnel down to the socket
SOCKET_R = 1.2       # Ø2.4 socket, tapered picks wedge in
FLUTES = 9
FLUTE_D = 0.45

# ---- cap --------------------------------------------------------------------
KNOB_R = 11.0        # +0.5 scallop -> Ø23 max
KNOB_H = 6.0
COLLAR_R = 7.6       # unthreaded neck, clears the female mouth flare
CAP_H = 15.0         # knob 0-6, neck 6-7, threaded plug 7-15
SCALLOPS = 12


def f_trap(phase):
    """Trapezoidal thread form, 0..1 over one pitch (25% crest / 25% root)."""
    p = np.mod(phase, 1.0)
    up = np.clip((p - 0.2) / 0.2, 0, 1)
    down = np.clip((0.8 - p) / 0.2, 0, 1)
    return np.minimum(up, down)


def thread_r(core, z, envelope):
    phase = z / PITCH - THETA / (2 * np.pi)
    return core + DEPTH * f_trap(phase) * envelope


# ---- radius functions r(theta, z) -------------------------------------------

def body_outer(z):
    if z <= NOSE_Z:
        env = np.clip(min((z - 14) / 6, (64 - z) / 6, 1), 0, 1)
        return GRIP_R - FLUTE_D * (0.5 + 0.5 * np.cos(FLUTES * THETA)) * env
    t = (z - NOSE_Z) / (BODY_H - NOSE_Z)
    return np.full(TH_N, GRIP_R - (GRIP_R - NOSE_TIP_R) * t)


def body_inner(z):
    if z <= THREAD_LEN:
        env = np.clip((THREAD_LEN - z) / 1.0, 0, 1)      # run-out at cavity end
        flare = max(0.0, 1.0 - z) * 0.6                  # entry flare at mouth
        return thread_r(BORE_R, z, env) + flare
    if z <= CONE_Z0:
        return np.full(TH_N, BORE_R)
    if z <= CONE_Z1:
        t = (z - CONE_Z0) / (CONE_Z1 - CONE_Z0)
        return np.full(TH_N, BORE_R - (BORE_R - SOCKET_R) * t)
    return np.full(TH_N, SOCKET_R)


def cap_outer(z):
    if z <= KNOB_H:
        return KNOB_R + 0.5 * np.cos(SCALLOPS * THETA)
    if z <= KNOB_H + 1.0:
        t = z - KNOB_H
        return KNOB_R + (COLLAR_R - KNOB_R) * t + 0.5 * np.cos(SCALLOPS * THETA) * (1 - t)
    env = np.clip(min((z - (KNOB_H + 1)) / 1.0, (CAP_H - z) / 2.0, 1), 0, 1)
    return thread_r(MALE_CORE, z, env)


# ---- z sampling ---------------------------------------------------------------

def zs(*segments):
    """segments of (z0, z1, step); returns sorted unique row heights."""
    out = []
    for z0, z1, step in segments:
        out.append(np.arange(z0, z1, step))
    out.append([segments[-1][1]])
    return np.unique(np.round(np.concatenate(out), 4))


BODY_OUT_Z = zs((0, 76, 2.0), (76, BODY_H, 2.0))
BODY_IN_Z = zs((0, 9.5, 0.15), (9.5, 76, 4.0), (76, 82, 1.0), (82, BODY_H, 3.0))
CAP_Z = zs((0, 6, 1.5), (6, 7, 0.25), (7, CAP_H, 0.15))


# ---- mesh assembly ------------------------------------------------------------

def ring(z, rfn):
    r = rfn(z)
    return np.stack([r * np.cos(THETA), r * np.sin(THETA), np.full(TH_N, z)], 1)


def strip_faces(a, b, flip=False):
    """Quads between ring starting at index a (below) and b (above)."""
    f = []
    for j in range(TH_N):
        j1 = (j + 1) % TH_N
        if flip:
            f += [[a + j, b + j1, a + j1], [a + j, b + j, b + j1]]
        else:
            f += [[a + j, a + j1, b + j1], [a + j, b + j1, b + j]]
    return f


def tube(z_out, r_out, z_in, r_in):
    """Solid with an axial channel: outer wall, inner wall, end annuli."""
    Vo = np.concatenate([ring(z, r_out) for z in z_out])
    Vi = np.concatenate([ring(z, r_in) for z in z_in])
    no, ni = len(z_out), len(z_in)
    V = np.concatenate([Vo, Vi])
    F = []
    for i in range(no - 1):
        F += strip_faces(i * TH_N, (i + 1) * TH_N)
    base = no * TH_N
    for i in range(ni - 1):
        F += strip_faces(base + i * TH_N, base + (i + 1) * TH_N, flip=True)
    F += strip_faces(base, 0, flip=True)                       # bottom annulus
    F += strip_faces((no - 1) * TH_N, base + (ni - 1) * TH_N)  # top annulus
    return trimesh.Trimesh(V, np.array(F), process=True)


def solid(z_rows, r_out):
    """Solid of revolution: side wall plus fan-capped ends."""
    V = np.concatenate([ring(z, r_out) for z in z_rows])
    n = len(z_rows)
    bot = len(V); top = len(V) + 1
    V = np.concatenate([V, [[0, 0, z_rows[0]], [0, 0, z_rows[-1]]]])
    F = []
    for i in range(n - 1):
        F += strip_faces(i * TH_N, (i + 1) * TH_N)
    for j in range(TH_N):
        j1 = (j + 1) % TH_N
        F.append([bot, j1, j])                                  # bottom fan
        F.append([top, (n - 1) * TH_N + j, (n - 1) * TH_N + j1])  # top fan
    return trimesh.Trimesh(V, np.array(F), process=True)


def check(mesh, name):
    if mesh.volume < 0:
        mesh.invert()
    assert mesh.is_watertight, f"{name} not watertight"
    return mesh


def main():
    body = check(tube(BODY_OUT_Z, body_outer, BODY_IN_Z, body_inner), "body")
    cap = check(solid(CAP_Z, cap_outer), "cap")
    cap.apply_translation([GRIP_R + KNOB_R + 8.5, 0, 0])
    scene = trimesh.util.concatenate([body, cap])
    scene.export("toothpick_holder.stl")
    ext = scene.bounds[1] - scene.bounds[0]
    print(f"toothpick_holder.stl  {len(scene.faces)} triangles  "
          f"{ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm")


if __name__ == "__main__":
    main()
