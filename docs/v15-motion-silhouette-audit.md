# Teddy V15 — Audit post-PR22, semantic dependency graph and atomic DoD
Date: 2026-10-14. Baseline: main merge of PR22 `388638a296a5176117acd9e34158edb766cc701f`.

## Forensic findings (source-supported)
- PR22 successfully wired a single routine timeline, 32 authored pose sets, reset and the same skeleton into WebGL2 and Canvas2D; previous CI was successful.
- `sampleExpressivePose` used per-segment `smoothstep` A/B/A/B curves that explicitly force near-zero tangent at each keypose and create a mechanical cadence.
- Previously only the union of keys in **adjacent** frames was materialized: unmentioned joints dropped and reappeared. V15 keeps every authored joint present across all frames.
- The v11 cinematic override specified joint spheres substantially narrower than adjoining limb capsules (e.g. elbow radius .105 vs forearm width .18, knee radius .115 vs shin .19). As Teddy turns, the profile reads as protruding disconnected primitives or a constricted mechanical hinge. Merely adding surface fur cannot fix volumetric overlap.
- Full watertight smooth CSG/SDF union is not provided by this mesh architecture. This PR reduces protrusions and pinching with bounded envelope matching; it does not claim a seamless single manifold mesh.

## End-to-end dependency graph
`Movimento → Base/Complessi → renderMotionPanel → app.js → enqueueMotion → MotionEngine.routineTimeline → expressive-v14.js → motion-dynamics-v15.js → descendant skeletal matrices → cinematicPart → silhouette-v15.js joint envelopes → partTransform → WebGL2/Canvas2D → screen`.

Safety/evidence edges: `motion-falsifiers-v15.js → 50M parameter campaign`, `motion-silhouette-v15.test.mjs → per-routine/projected overlap/C1 velocity`, inherited `motion-v8` synthetic mutation and 100M clip-contract tests, `browser-motion-smoke-v13` verifies shipped CSP + actual pixels from UI.

## Atomic DoD
- [x] DOD-M01: exactly 32 typed and uniquely parameterized behavior characteristics, no unexplained fallback name.
- [x] DOD-M02: Hermite C1 interpolator with bounded tangents at every keyframe, zero neutral at beginning and end.
- [x] DOD-M03: stable deterministic local wrist/head follow-through, intermediate limb lag, global spinal/pelvic carry; no injected non-deterministic noise.
- [x] DOD-M04: all authored joint keys remain materialized across whole timeline; no key absence popping.
- [x] DOD-M05: angular values finite, clipped to ±1.2 rad, bounded maximum per-frame jump at 120 Hz, correct recovery.
- [x] DOD-S01: six anatomical categories × two sides (shoulder, elbow, wrist, hip, knee, ankle) share calibrated opaque envelope shapes.
- [x] DOD-S02: accessory joint radii cannot exceed adjacent limb-dependent envelope bounds; no new transparent shells or orphan geometry.
- [x] DOD-S03: joint position/volume overlap checked at sampled runtime frames for all 32 routines from front, three-quarter, side views.
- [x] DOD-C01: add exactly 50,000,000 deterministic mutation candidates across local/intermediate/global validators; expected 25M conforming and 25M deliberately malformed; fail CI on survivors.
- [x] DOD-C02: retain v14 100M, v8 1M-scenario + 1M-mutation, strict source-report diff gates.
- [x] DOD-E01: browser CSP smoke must still observe actual UI click and pixel movement; no fake headless screenshot claimed.
- [ ] DOD-V01: human-rated, 32 routine video-golden 1080p visual acceptance across multiple camera angles; remains independent from CI.
- [ ] DOD-V02: formal watertight smooth-union skinning or SDF/mesh rigging, plus dynamic 3D foot-contact IK; remains outside minimal runtime slice.

## Granular 32-case kinetic characteristics
Each row is a *distinct tuned behavior*, not just a relabelled primitive. Beats denote relative within-clip oscillation frequency, not a tempo promised in BPM. Follow=maximum radians of local distal micro-motion before layer attenuation. Skew biases left/right anticipatory timing. Combined with existing anatomical authored v14 poses and support modes.

| # | Routine | Kinetic class | Beats/clip | Follow (rad) | Temporal skew |
|---:|---|---|---:|---:|---:|
| 1 | `greet` | social | 2.1 | 0.052 | 0.024 |
| 2 | `farewell` | social | 1.8 | 0.045 | -0.018 |
| 3 | `yes` | head | 2.6 | 0.034 | 0.012 |
| 4 | `noThanks` | head | 2.2 | 0.044 | -0.018 |
| 5 | `shy` | emotion | 1.5 | 0.025 | -0.034 |
| 6 | `proud` | emotion | 1.2 | 0.031 | 0.028 |
| 7 | `curious` | head | 1.6 | 0.052 | 0.031 |
| 8 | `celebrate` | energetic | 2.3 | 0.055 | -0.015 |
| 9 | `applaud` | rhythm | 3.5 | 0.060 | 0.012 |
| 10 | `stretch` | slow | 1 | 0.021 | -0.018 |
| 11 | `pointLeft` | directed | 1.4 | 0.024 | -0.026 |
| 12 | `pointRight` | directed | 1.4 | 0.024 | 0.026 |
| 13 | `march` | locomotion | 2.8 | 0.044 | -0.013 |
| 14 | `retreat` | locomotion | 1.7 | 0.026 | 0.016 |
| 15 | `approach` | locomotion | 2.2 | 0.035 | -0.021 |
| 16 | `pivot` | turn | 1.2 | 0.029 | 0.031 |
| 17 | `sway` | flow | 1.6 | 0.032 | -0.036 |
| 18 | `bounce` | energetic | 2.4 | 0.043 | 0.013 |
| 19 | `stepLeft` | locomotion | 1.7 | 0.033 | -0.025 |
| 20 | `stepRight` | locomotion | 1.7 | 0.033 | 0.025 |
| 21 | `balanceLeft` | balance | 1.1 | 0.026 | -0.027 |
| 22 | `balanceRight` | balance | 1.1 | 0.026 | 0.027 |
| 23 | `warmup` | flow | 1.9 | 0.040 | 0.014 |
| 24 | `coolDown` | slow | 0.85 | 0.015 | -0.009 |
| 25 | `salute` | directed | 1.4 | 0.031 | 0.027 |
| 26 | `bow` | slow | 1 | 0.017 | -0.015 |
| 27 | `surprise` | emotion | 1.4 | 0.031 | 0.019 |
| 28 | `ponder` | head | 1.2 | 0.028 | 0.035 |
| 29 | `spin` | turn | 1.8 | 0.032 | -0.016 |
| 30 | `victory` | energetic | 1.8 | 0.033 | 0.011 |
| 31 | `dance` | dance | 3.1 | 0.074 | -0.029 |
| 32 | `lightningBolt` | iconic | 1.3 | 0.023 | 0.033 |

## Geometric silhouette envelope metrics
| Joint | Radius X/Y/Z | Maximum bounded radius | Intended containment |
|---|---|---:|---|
| shoulderSocket ×2 | 0.164 / 0.177 / 0.167 | 0.195 | upperArm, torso |
| elbowPad ×2 | 0.171 / 0.174 / 0.172 | 0.180 | upperArm, forearm |
| wristPad ×2 | 0.164 / 0.164 / 0.170 | 0.181 | forearm, paw |
| hipSocket ×2 | 0.220 / 0.225 / 0.222 | 0.245 | pelvis, thigh |
| kneePad ×2 | 0.178 / 0.176 / 0.176 | 0.190 | thigh, shin |
| anklePad ×2 | 0.175 / 0.172 / 0.182 | 0.190 | shin, foot |

## Mutational epistemic ledger
50M total exact candidates processed as 3 independent contract tiers (local joint/angle/phase, intermediate parent-child/bend/envelope/follow, global routine/support/world/tempo). Use one deterministic PR-head CI execution with seed + distribution counts + rolling checksum, and record actual result from CI. Additional ~24,415 sampled interpolated whole-body poses are assessed for finite bounded angles. These are **not** 50M real physical animations, 50M novel creative candidates, or GPU captures.

## Falsification thresholds
- **Syntax import:** all module entries parse in Node 24 and execute under production CSP.
- **Type/cadence:** 32/32 motion identities; ≥8 kinetic classes; 3 motion layers.
- **Derivative continuity:** at each interior keypose abs(left angular speed − right angular speed) <0.16 rad/unit phase over ±0.00015; 120 Hz angular sample delta <0.06 rad for every mapped joint.
- **Support/shape:** 12/12 joint envelopes valid; for sampled poses and yaw 0/.55/1.15 rad, joints overlap both adjacent segments within envelope margin 0.19 model units.
- **Safety:** no NaN or ±1.2 limit breaches; mutation 50M has zero survivors, both invalid and accepted populations tracked.
- **Regression:** existing browser/reset/material/CI checks must remain green on final HEAD.
- **Not established:** no perceptual metric can prove 'realistic' from unit tests; note remaining visual-debt and surface intersections as such.
