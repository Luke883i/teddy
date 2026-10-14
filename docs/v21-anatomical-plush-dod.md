# Teddy V21 · From globally welded skin to believable anatomical plush

**Baseline:** merged main `7393efc07d3ad3e857b13ee8fca2f32387100761`, PR #32. Two real screenshots of Teddy (arms at rest and raised) reject the visual quality of V16–V20 despite 5/5 green workflows.

## Actual visual failure (P0)
1. V16 extracts one unified isosurface from **every** fur primitive (torso, both arms, head, legs), so arm/torso geometry becomes globally connected in bind pose.
2. V19 subtracts large rectangular depth-through SDF slots from this body to restore arm–torso air. This yields **black rectangular axillae** in neutral pose and thin free-standing slot walls.
3. V18/V20 skinning blends incompatible joint transforms across these thin walls. The V20 monotone strain limiter can reduce some edge stretch but cannot create a natural anatomical topology: giant fan-shaped *accordion surfaces* remain.
4. V18's procedural `power=4` arm capsules are too squared; the independent belly disc is thick and appears pasted onto the torso.
5. Existing CI wrongly treats watertightness and pixel change as aesthetic approval. User-provided screenshots are definitive P0 counterexamples.

## Mining last ten merged PRs (2026-10-14)
| PR | What it delivered | Visual lesson |
|---|---|---|
| 32 | monotone V20 strain relaxation | algebraic edge improvement ≠ no arm web |
| 31 | local model file fixes | not geometry |
| 30 | local dialog runtime | not geometry |
| 29 | bind-pose SDF axilla excavation | false-looking through-walls |
| 27 | remote/local text chat | not geometry |
| 28 | V18 weights & fur AA | skinning after extraction cannot repair topology |
| 26 | V17 micro-faces | correct facial animation, independent of body web |
| 25 | V16 global welded SDF surface | model overconstraint: arms welded to torso |
| 24 | Canvas2D unified opaque silhouette | different backend |
| 23 | V15 body movement | large movement exposes geometry artifacts |

## Solution architecture selection: 1000 → one, with explicit trade-off
Scoring 1,000 **deterministic parameter candidates** favors a low-poly-budget, softly rounded local shape: seed index **806**, `coreVoxel=.06690`, `armVoxel=.06719`, `armPower=2.36118`, `coreSmooth=.10465`, `armSmooth=.08473`, `bellyDepthFactor=.6233`. Parameter search is not image-generation and does not demonstrate taste; selection is a reproducible structural proxy with runtime visual verification next.

**V21 is an architectural correction, not another shim:** assign each original fur piece once to `core`, `armL` or `armR`. Extract exactly **three independent connected, closed implicit meshes**. Arms are posed by their existing shoulder/elbow/wrist groups; body and head/legs by their existing groups. Keep both opaque, slightly overlapping at shoulder sockets, with correct depth testing. This makes **cross-arm/torso triangles mathematically impossible** by index partitioning. Neither a long negative-space cutter nor axillary strain relaxer is run on these new meshes. The face morph still deforms the `core` mesh. Each element keeps existing pixel shader and default fur toggle.

**Explicit declassification:** the *entire plush* is **no longer a single watertight connected shell**; instead it is three **independently watertight, one-component** meshes. This is necessary to remove unintended skin bridges with the current low-cost static skinned-surface architecture. All API/telemetry/UI must report `mode='anatomical-islands', components=3, globalWatertight=false`. It would be scientifically dishonest to report `components=1` for this solution. Transparent masking and disconnected fingers are not used. Eyes, muzzle and pads remain deliberate accessory meshes.

## Rigorous semantic DoD
| ID | Requirement | Numeric or observable gate |
|---|---|---|
| V21-01 | No arm–torso triangle | Core, armL, armR have separate index and vertex buffers; no cross-family triangle possible |
| V21-02 | Closed, connected individual plush pieces | Every mesh `closed=true`, `components=1`, 0 open/nonmanifold edges |
| V21-03 | Full anatomical coverage | All existing `material='fur'` pieces assigned exactly once; no missing arms |
| V21-04 | Rounder limbs | Arm superellipsoid power ≤2.7, no old square p=4 arm capsules |
| V21-05 | Less pasted-on belly | Existing independent belly depth compressed (~0.623×) and retracted in local z |
| V21-06 | Live motion + expression | Greet, Dance, LightningBolt, Victory, Balance deform grouped mesh, finite vertices and unchanged indices |
| V21-07 | UI/renderer truth | WebGL2 status explicitly states anatomical fur; 3 components and absence of cross-arm triangles from real readiness event |
| V21-08 | Reproducible parameter search | Exactly 1000 seeded scored candidates; winning set compiled into production, test asserts consistency |
| V21-09 | Mutation saturation | Exactly 10,000,000 deterministic morphology tests, half realistic conforming/half injected-invalid, zero unexpected survivors |
| V21-10 | Chrome E2E | CSP production WebGL2 uses default new anatomical meshes; real screenshots neutral/Saluta/Fulmine/Victory show changing pixel regions |
| V21-11 | No regression | Existing 32 UI movement routines, Reset, voice facial expression, Canvas2D fallback, skin toggle and security gates green |
| V21-12 | CI all-green | 6/6 checks on exact PR HEAD, not prior commit |

## Unclosed visual DoD (not laundering uncertainty)
- **V21-H01:** Both user screenshots must be compared to fresh head-on neutral + raised-arms Chrome frames, and a human must confirm no black slots, no shoulder membrane, and pleasant plush geometry. Merely changing pixels is not enough.
- **V21-H02:** visual quality at 3/4 and side, including visible shoulder overlap/collars rather than unnatural seams.
- **V21-H03:** naturalness of ankles/feet and face material layout across actual device GPUs, 60 FPS at P95 and contact IK.
- **V21-H04:** no self-intersection, shoulder popping or collision throughout continuous 32-routine playback; not implied by topological separation alone.

## Cost/compatibility notes
Three closed meshes require three opaque WebGL draw calls instead of one, not 36 individual textured primitives. Geometry is extracted once at startup, with existing finite weighted skin updates and indexed normals per frame. GPU buffers remain reusable and updates use `bufferSubData`. If the new path fails, original segmented WebGL body fallback remains; this fallback must be labeled as degraded. Legacy V16 unit tests may still test the old extractor in isolation, but production runtime must be independently proven to install V21 after V17 and before app mount.
