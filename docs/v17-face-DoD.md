# Teddy V17 — Expressive facial micro-animation and standalone facial materials
Baseline: PR #25 merged on `main` at `7e58497b6bdfbefb5bf4c9e3dcafa7cf34fb998c`.

## Intent interpreted as a visual and runtime contract
Make Teddy *cuter, more legible and less synthetic* at conversational distances while preserving the V16 **watertight plush-body skin**. Differentiate eye whites, irises, pupils, wet catchlights, velvet nose, cheeks, snout, lips, mouth opening, brows and eyelids using deliberately controlled color, roughness, geometry/depth and tiny movements. Do **not** make one bobbing eye shader or implement a second rig. The same facial response must survive WebGL2, Canvas2D, voice, idle, listening, thinking, concerned, and all 32 movement names.

## Root cause (audited)
- V16 rendered `fur` as **one fused mesh**, including both `cheekL/R` primitives. Simply moving those original objects is ineffectual in WebGL2 (the old primitives are skipped). New micro-cheek motion must deform **V16's existing indexed vertices** locally without changing topology.
- The existing ExpressionRig already supplies smoothing, jaw, wide/round speech morphs, blinks, face attention and `voice` evidence. It is the epistemic authority. V17 introduces only an authored *local facial delta*, not an independent emotional state machine.
- Cinematic V11 and refinement V7 overwrite dimensions/poses for several part IDs. Facial animation must occur **after** those overrides; pre-transform edits would be silently declassified.
- Original eyes used a single dark mass per side plus a highlight; no layered sclera, iris, eyelid, micro-saccade, or eye material roughness separation. Mouth and nose materials were coarsely shaded.

## Minimal runtime supplier lattice
`ExpressionRig.step → pose/mode/voice + MovementEngine.routine.phase → facialMicroPose (pure, bounded, deterministic) → partTransform after cinematic/refinement → WebGL2 accessories / Canvas2D projected overlays`.
For cheeks: `existing V16 deformImplicitMesh → deformFacialSkinV17 positions-in-place (head-local bounded Gaussian cheek support) → vertexNormals → one original WebGL draw of fused fur skin`. **No new triangles, no second transparent cheek shell.**

Face material additions include 2 warm sclerae, 2 chestnut irises, 2 fur eyelids and 2 understated cheek-dimple highlights. Existing eye spheres become small dark pupils; catchlights remain anchored to gaze; brows, nose, snout and mouth reuse existing objects/parent groups. Nose gets a distinct matte velvet material. All accessories are opaque and explicitly depth-tested.

## Atomic DoD and falsifiers
| ID | Requirement | Measured failure threshold |
|---|---|---|
| F-01 | Every facial subsystem separately addressable | Eyes, lids, iris/pupil, brows, nose/snout, lips/mouth, cheeks present and independently tested |
| F-02 | 32 routine motifs × 5 modes | 160 distinct name/mode cells covered in deterministic mutation campaign |
| F-03 | Bounded gaze and blinks | Saccade ≤0.020 world units; lid closure ∈[0,.94], no pupil flight outside sclera |
| F-04 | Natural speech | Loud active `teddy:voice` increases lip opening (>0.25) and cheek expression (>0.025) in production WebGL2 Chrome |
| F-05 | Cheeks really modify V16 geometry | Local cheek position delta >0.008 and <0.042; unrelated head/body vertices stable; number of vertices/indices unchanged |
| F-06 | No cinematic override regression | Assert facial transforms *after* V11/V7 differ for brow, pupil and lower lip in runtime tests |
| F-07 | Support low-motion users | Reduced motion attenuates gaze/tremble/routine bias; speech articulators remain available |
| F-08 | Realistic close-up lighting | Separate low-roughness eye+iris/highlight vs matte velvet nose and warm colored sclera, opaque skin tint |
| F-09 | Cross-backend material supply | V17 palette + Canvas2D material router map every new material, same `partTransform` |
| F-10 | Safely repeatable init | Exactly eight accessory pieces, unique IDs, no duplicate layers |
| F-11 | V16 invariant | Fur primitive count unchanged, fused mesh preserved; face GPU path only updates vertex positions and normals |
| F-12 | Mutation-grade safety | 1,000,000 deterministic face state candidate checks, half invalid injected, zero survivors |
| F-13 | Browser evidence | Real Chrome with production CSP and WebGL2: fused skin active, `teddy:face-frame` reception, speech input increases numerical facial expression AND composited screenshot pixels change |
| F-14 | No regressions | Existing 1M/50M/100M body gates, Reset, toggle, security, local, container, conversation workflows green on exact final HEAD |

## Per-behavior expression character
- **Social** (greet/farewell/approach): softened eyes, rising cheeks, staggered corner smile.
- **Curiosity** (curious/ponder/thinking/listening): raised brow, gaze shift, slight cheek asymmetry and controlled eye openness.
- **Joy** (celebrate/victory/dance): broader cheek lift, brows follow rhythm but remain bounded; nonrepeating incommensurate microsaccades.
- **Restraint** (shy/noThanks/concerned): subdued smile, slight pinch/soft squint without uncanny wide-eyed stare.
- **Speech**: `jaw`, `level`, `attack`, `high`, `brightness` feed lower lip, mouth cavity, tongue, puffy muzzle, brow reaction.
- **Iconic gestures** (lightningBolt, salute, point, bow): directed ocular intention tied to normalized whole-body routine phase; neutral at phase 0 and 1.

## Epistemic boundary
A green 1M test does not mean 1M frames visually inspected. Screenshots and numeric proofs demonstrate deployed movement and response to a voice input, not subjective *cuteness*. Golden multi-angle facial videos and human scoring for pleasantness, eye contact, blink believability, mouth-audio sync and absence of face penetration remain editorial visual acceptance. The unified V16 body remains mathematically closed, but this PR does not claim full dynamic self-intersection-free geometry of all accessories.
