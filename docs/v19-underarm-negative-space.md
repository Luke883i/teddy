# Teddy V19 — Anatomical underarm negative space, not a fur texture trick

**Baseline:** main at `1243938399012014be25855066557387cf87fb0e`; PR #28 merged and green. User screenshot and live feedback establish that a continuous sheet of fur persists between the inner arm and the torso under the axilla. The previous V18 weighting correction does not solve an invalid **bind-pose isosurface**.

## Decisive falsification of V18
- V16 `skinField` smooth-unions **every** fur primitive. The torso and arm volumes overlap; a uniform smoothing factor (`k=.12`) fills the space between independently articulated limbs.
- V18 `anatomicalInfluences` restricts bone weights, but only **after** the webbed mesh has been extracted. No blend of joints can open a hole that does not exist in the bind topology.
- A watertight single-component triangle mesh and green pixel-change tests are **insufficient** to prove correct negative-space silhouette.

## Minimal runtime supply chain
`anatomical fur primitives -> signed field -> two local rounded through-slots beneath actual shoulder landmarks -> marching tetrahedra (same indexed mesh) -> V18 weighted skinning -> V17 facial morph -> existing WebGL2 draw -> real browser camera / UI`.

Both gaps are computed from **actual posed bind landmarks** of `shoulderSocketL/R`, `upperArmL/R` and `torso`. The slot cuts across the arm–torso interface below the upper shoulder cap, is open through the body depth, and never adds transparent overlay geometry or a disconnected hand mesh. Above the slot, shoulder geometry stays connected so global topology remains one watertight component. No new animation system or material is introduced. The fallback stays observable.

## Hard semantic DoD lattice — falsifiable
| Gate | Exact target | Proof route |
|---|---|---|
| U19-01 | Two bilateral underarm slots from actual anatomy, not fixed camera pixels | exact L/R field cut probes |
| U19-02 | Both underarms: sign distance at slot center **> +.012** (air), *unmodified field* **< 0** (former solid web) | before/after SDF probes at multiple depths |
| U19-03 | Adjacent chest center and outward arm core remain inside material (SDF < 0) | paired control probes |
| U19-04 | Shoulder top connection retained; single component, zero boundary and nonmanifold edges after subtraction | real canonical Teddy topology |
| U19-05 | Existing inverse-bind weights and identity pose preserved (max position error < 1e-4), not rigid immobilization | runtime mesh tests |
| U19-06 | Saluta, Dance, Fulmine, bilateral balance move visible vertices; transformed positions finite and indexed geometry remains closed | 5 routine × 6 frame sampling |
| U19-07 | 1,000,000 seeded width mutants, 500k good and 500k injected invalid, no survivor | `mutate-underarm-v19.mjs` |
| U19-08 | 12 real Teddy iso-extractions across slot-width parameter space, each closed / connected / with bilateral gap | mutation suite actual meshes |
| U19-09 | Startup refuses false welded-skin claim when underarm proof fails; info exposed in `teddy:implicit-skin-ready` and diagnostics | guarded runtime + browser event |
| U19-10 | Chrome/SwiftShader with production CSP: fused WebGL skin active, bilateral gap proof present, and real click changes compositor pixels | `browser-visual-v18.mjs` enhanced |
| U19-11 | Existing face V17, motion, reset, fur toggle, V16 topology, V18 visual tests and inherited CI mutation saturation pass at final SHA | 6 GitHub checks |

## What this does not prove
A closed connected surface can still self-intersect or have silhouette defects from some camera angles or extreme poses. This cut is **bind-pose anatomy-aware relief**, not collision-aware dynamic boolean meshing, per-pose IK, contact-preserving solver, real-time SDF remesh or a 288-frame human-reviewed aesthetic validation. Dynamic arm-torso collisions remain an explicit follow-up candidate for geometric distance analysis and local corrective blendshape, but must not be declared resolved from green topology checks alone.

## Interpret evaluation
The decisive acceptance here is not shader noise or skin weight normalization: **was there solid arm–torso material at the probed axilla coordinates before, and is there open air there after?** Runtime and CI record both numerical facts. Full side/three-quarter poses still require human visual evaluation of uploaded screenshots and video.
