# Teddy V16 — Watertight implicit plush surface
Baseline: `main` at `4260371d8e7652ac2cebe0be1b02b641f6a28baf` (PR #24 already merged, all five baseline workflows green).

## Derived user intent
The bear must no longer be made of visibly overlapping separate fur spheres and capsules in **WebGL2**. It must present **one shared closed, indexed, connected 3D fur surface** whose joints move naturally under the existing anatomical rig. Preserve facial overlays, texture toggle, gait, 32 named routines, Reset, floor, shadow, safety and Canvas2D union fallback. Do not disguise seams with alpha blending or pass only static geometry tests.

## Semantic supply chain and PR slices
1. **Implicit field + topology**: capture all current 36 canonical `fur` primitives *after* cinematic/refinement/pose transformations. Convert spherical and capsule-like volumes into oriented superellipsoid distance fields. Compute bounded polynomial smooth minimum (k=0.12), sample on a bounded 0.075-unit voxel lattice, extract the zero-isosurface by six-tetra cell decomposition. Intern every lattice edge intersection once, produce indexed triangles oriented toward outside, and recompute surface normals.
2. **Reusable rig deformation + GPU**: construct skin influences for four nearest primitive bind groups on each shared vertex, and cache inverse bind matrices. At every WebGL frame, compute skinned vertices by blending the existing current group matrices, update two GPU dynamic buffers, and draw the **single indexed implicitSkin mesh** with opaque depth-writing, original lighting/fur shader and bind-coordinate fiber noise. No remeshing per frame. Render eyes, muzzle, belly and other non-fur details through existing draw calls.
3. **Real installation + falsification**: install from CSP-safe external boot module after existing cinematic/refinement/movement modules; draw WebGL fused body by default and suppress all individually shaded `fur` body pieces only when the fused mesh actually drew. If mesh extraction/validation/GPU fails, do not leave Teddy invisible: report the reason and use original segmented 3D fur renderer. Continue unchanged Canvas2D union fallback.
4. **Test contract + 1M**: assert all edges of the indexed mesh have exactly two face incidences, exactly one connected component, finite normals, positive triangle count and size bounds; validate real Teddy model at bind pose, skin weight normalization, neutral identity, actual posed vertex displacement, stable topology, one WebGL indexed draw, no topology reupload per frame; execute 1,000,000 deterministic semantic SDF mutations plus 50 full topological mesh re-extractions, preserving all existing 50M+100M+1M+1M workflows. A real Chrome WebGL2/SwiftShader smoke under production CSP must observe the `teddy:implicit-skin-ready` event with closed mesh and changed Chrome compositor screenshot pixels after actual UI click (without enabling preserveDrawingBuffer).

## Atomic Definition of Done
| ID | Requirement | Threshold / falsifier |
|---|---|---|
| W-01 | Single WebGL fur surface | `geometry:implicitSkin` drawn **once**, original `fur` parts skipped when active |
| W-02 | Watertight | `openEdges=0`, `nonmanifoldEdges=0`, each edge face-incidence exactly 2 |
| W-03 | Connected | `components=1` on the canonical real Teddy bind pose |
| W-04 | Finite | vertices/normals/weights finite, nonzero/normalized influences |
| W-05 | Animatable | same MotionEngine/skinning rig; moving named routine changes vertex positions |
| W-06 | Stable topology | index and skin influence structure allocated once; only position/normal buffers updated |
| W-07 | Opaque and texture-coherent | alpha=1/depth write, procedural pelt texture uses original bind coordinates `aRest` |
| W-08 | Good failure mode | explicit one-shot fallback with error report, never invisible bear |
| W-09 | UI remains wired | 32 movements, Reset, fur toggle, production CSP and existing browser smoke |
| W-10 | 1M mutation evidence | exact N=1,000,000, deterministic seed, 50% valid/50% invalid, zero unexpected survivors; 50 actual topology reconstructions |
| W-11 | Regression | existing tests, security, local, container, 50M, 100M, v8 1M+1M all green at PR final SHA |
| W-12 | Appearance audit | no pixel discontinuity/hide/joint separation across real browser angles; **requires manual multi-angle golden video and remains an external visual criterion** |

## Runtime / complexity budget
CPU surface extraction is one-time on first WebGL render; in isolated model-level execution the real Teddy bind pose yielded **11,548 vertices / 23,096 triangles / 34,644 unique edges / zero boundary or non-manifold edges / 1 connected component** at ~1.65 s startup on test host. A 120k-vertex and 180k-cell safety bound prevents runaway memory. Subsequent frames do not re-extract SDF: bone matrices deform the same indexed surface, normals are recomputed and uploaded with `bufferSubData`. This is true topology continuity, not one million topology re-extractions.

## Honest architectural boundary
The surface is an actual **single watertight polygonal mesh extracted by implicit smooth union**. It is then *skinned*, not implicitly re-evaluated at every pose. Hence connectivity survives animation by construction but large deformations can still create triangle inversion, self-intersection, stretch or shrink; per-pose true implicit remeshing or dual-quaternion skinning would address those separately. Belly, eye, nose, pad and mouth materials remain intentionally separate accessory geometry; watertightness claim is specifically for the unified **fur/body** surface. No evidence here certifies 60 FPS on every GPU or subjective ideal appeal.

## Headless WebGL2 visual falsification refinement
The Chrome/SwiftShader runner can activate a real WebGL2 context and a topologically closed single-component skinned mesh. Unlike Canvas2D, a WebGL2 canvas can discard its drawing buffer after presenting a frame; therefore `canvas.toDataURL()` outside the compositing tick is not a reliable visual oracle. The v16 acceptance flow instead uses CDP `Page.captureScreenshot` clipped to the bear, before and after an actual button click, and requires multiple corresponding `teddy:motion-frame` events. The test does not enable costly `preserveDrawingBuffer` just to pass CI.
