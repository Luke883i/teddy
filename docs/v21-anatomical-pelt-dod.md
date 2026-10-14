# V21 Teddy — anatomical pelt recovery, visual first, no fake watertight claims

**Source-of-truth images:** the user's two 14 October front-on captures (neutral, arms opened). Both are currently **FAIL / visual P0**, not golden outputs. Baseline: main `7393efc07d3ad3e857b13ee8fca2f32387100761` (PR #32 merged).

## Visual mining and causal trace
Neutral: long **rectangular black axillary trenches**, detached-looking oversized oval belly patch, squared capsule-like limbs, carved hip/ankle abrupt contours, frozen tired eyebrows. Arms raised: huge fan-like accordion strips spanning torso to limb, triangular light/dark microfolds, obvious geometrical webbing rather than soft skin. A pleasant teddy should have a broad rounded skull, short plush muzzle, soft head/neck transition, comfortable shoulders, arms that hang beside the sides (ending near the hip/thigh, not fused to the legs), rounded paws, short clear feet and a **natural open negative space** under moving arms. The pelt material should not shimmer or reveal polygon strips.

## Last ten MERGED PR audit (chronological order newest first)
| PR | Topic | Actual architectural benchmark and missed falsifier |
|---|---|---|
| #32 | V20 weighted shoulder collar/PBD monotonic edge solver | Some stretched edges improved, but retained existing arm-to-torso geometry. The photograph still fails. |
| #31 | Text install SHA-256 | Orthogonal to visual quality; no anatomical evidence. |
| #30 | Local text-only runtime | Orthogonal to visual quality; no anatomical evidence. |
| #29 | V19 rectangular rounded SDF underarm subtractors | Proved signed empty space only at probed locations; physically created straight black voids and sharp cut walls. |
| #27 | Text dialogue models | Orthogonal to skinning and face topology. |
| #28 | V18 anatomical closest-volume skin weights, fur alias damping | Bone ownership and anti-aliasing improved yet the underlying single fused web remained. |
| #26 | V17 layered expressive facial accessories | Face parts work but do not correct character proportions. |
| #25 | V16 single watertight union skin | Correct topology; joined geometrically unrelated limbs into one mesh, creating a topological obligation to bridge surfaces. |
| #24 | Continuous Canvas2D silhouette | Fallback did not fix WebGL2 skin. |
| #23 | V15 movement and joint visual embedding | Proved motion contract, not visually credible cloth/skin deformation. |

**Pattern:** after a correct V16 single-component topology goal, each follow-up altered a secondary condition (weighting, negative field, edge strain), but never challenged the original *semantic topology*: torso and arms should not be connected by extensible cloth-like polygon webs. "One globally watertight component" and "beautiful soft moving toy" are not equivalent.

## Reverse designed target
At rest: body outline smooth; arm–torso gap narrow and organic, without straight-sided SDF excavation; arms/paws close to hips; belly a subtle fur pigment, not a sticker ball; feet and legs softly rounded. During arm opening: no polygon edge ever joins a thoracic vertex to an arm vertex; shoulders overlap as independently watertight plush pieces so motion cannot stretch a torso–arm triangle. Keep V17 eye and mouth articulation, Reset, fur toggle and 32 movements.

## 1000 options ranked, physical meaning
A deterministic 5×5×5×8 grid combines voxel size, smooth union width, primitive exponent and eight topology/render strategies. **Hard feasibility priority**: no interregional arm–torso triangles, maintain a bounded WebGL2 indexed draw, no per-frame remeshing, reuse rig and face. Winners are compared on voxel and smoothness quality/cost with *analytical proxy scoring*, not 1000 real video A/B tests. Chosen **six anatomical SDF components batched in one indexed draw**, voxel .060, smoothing .145 and capsule exponent 2.2. Alternatives rejected for this slice: legacy global union, extra rectangular cutters, global PBD, full CPU per-frame implicit extraction and GPU raymarch; their costs/visual failure modes would need separate benchmarks.

## Semantic PR slices
1. Six **independently closed** SDF parts: trunk, head, left/right arms, left/right legs, without rectangular cuts; concatenate once into one GPU indexed buffer (no triangles or weights crossing anatomical regions). This is intentionally **six closed components, not one global connected component**. Each component must be individually watertight.
2. Group-local Gaussian-softened joint weights (shoulder, elbow, wrist; hip, knee, ankle; head/ears; torso); deform with same rig and matrix contract. Remove global edge pulling and per-pose SDF overdraw. V17 facial delta still applied to same head vertices.
3. Reduce capsule power 4 → 2.2 for round, cuddly geometry; flatten the prior belly patch and apply a soft color/tint to the actual fur rest-space shader in WebGL2. Do not render a detached belly ball on the active V21 body. Canvas2D fallback remains supported, though its shape parity is not perfect.
4. Instrument actual active region mode and topology in browser/UI, exact real viewport screenshots in neutral/Saluta/Fulmine/Victory, headless real Chrome CSP, no fake image stand-ins.
5. Falsify with the canonical 36-part Teddy: all six components closed; zero cross-region triangle and weight; one GPU draw; genuine joint motions; face, Reset, UI tests; rank 1000 structural candidate combinations and execute **10,000,000** deterministic preseeded family/pose semantic mutants. The latter are *parameter mutations*, not 10 million full GPU frames.

## Atomic hard DoD / evidence status
| ID | Gate | Threshold / falsifier |
|---|---|---|
| T01 | Anatomical topology | Exactly 6 mesh components, individually watertight; zero boundary/nonmanifold edges |
| T02 | No extensible underarm skin | Exactly **zero cross-region triangles**; any arm-to-torso shared indexed face is a hard fail |
| T03 | Skin weight isolation | Zero bone influences crossing assigned family; weights finite, sum 1 ±1e-6 |
| T04 | Preserve animation | 5 routines × 6 phases; >.08 displacement and no nonfinite positions |
| T05 | Posed deform quality | Rest/posed finite; monitored maximum edge stretch and zero degenerate sampled edges |
| T06 | Rendering/E2E | Exactly 1 indexed GPU draw of all fur, only dynamic position/normal uploads per frame |
| T07 | Semantic material | Shader applies diffuse graded fur belly pigment; oversized belly accessory suppressed on active WebGL2 V21; capsule exponent ≤2.2 |
| T08 | Browser real | Production CSP Chrome: mode anatomical-pelt-v21, 6 watertight regions, 0 cross-region triangles/bones; UI click and changed real compositor pixels |
| T09 | Regression archive | Real screenshots: neutral, Saluta, Fulmine, Victory with arms raised; exact SHA artifact in Actions |
| T10 | Search | 1000 enumerated *structural combinations*, winner reproducible |
| T11 | Mutation-grade | 10,000,000 seeded family/angle cases, 5M valid / 5M deliberately invalid, zero unexpected survivors |
| T12 | All CI | All six required status checks on exact final PR head green |
| H01 | Human aesthetic | No cutout, square limbs, obvious panel seams in front, side, 3/4 and wide gesture **requires human screenshot/video sign-off** |
| H02 | Dynamic contacts | Zero self-intersection, foot-lock IK, robust 60 FPS on every device: **not proven**, do not claim |

## Explicit epistemic and engineering tradeoff
A closed anatomical region can visually overlap another without polygonal interconnection. This deliberately trades global watertight **one-component** topology for six individually closed pieces; it is NOT physically continuous living skin. The character is a plush assembled toy, so an overlapping visually blended shoulder seam can be better than a physically implausible membrane. This prevents the precise arm–torso bridge mechanism by construction but does not guarantee ideal seams, joint penetration-free animation or a cute score. Final acceptance of the two failure images must be based on new matching screenshots reviewed by a person. Do not re-label old V16 topology checks as V21 proof.
