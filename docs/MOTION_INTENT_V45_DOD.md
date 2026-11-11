# Teddy V45 — semantic movement intent, physical kinematics and human-facing quality

## Desired product outcome

Every button must mean what an observer understands from its Italian label. `Saluta` means the **right paw rises above the right shoulder** and visibly waves, not merely that `greet` is queued. `Applauso` means both paws move towards one another **without passing through each other**. `Passo a sinistra/destra` must translate in world X, not turn and move forward. `Piroetta` needs a full real-body rotation, not a left/right cancellation. The wearer of the artistic intent is the visible Teddy avatar; the repository and the code are supporting evidence, not the product itself.

## Domains and provenance

- **Repository/R:** 32 named labels and matching frozen contracts; source-bound, replayable 3.2M source-mutant receipt; original CORA ontology/artifact audit and SHA-pinned CI; no auto-approval or merge authority.
- **Software/S:** one semantic oracle per label; actual 16-joint articulated group transforms and transformed paw/head/ankle landmarks, nonfinite guard, real walking-world action, GL skinning test, real renderer screenshot capture under production CSP. Tuner controls call the same routine parser and keep intensity/tempo bounded; reduced-motion preference remains authoritative.
- **Product/P:** label-to-visible gesture interpretability, soft anatomy and no bizarre seam: browser PNGs are a *review substrate*, not independent aesthetic validation. Human observational rating, cross-device GPU performance, interface comprehension and contact-robustness remain BLOCKED_EXTERNAL until judged.

## Scope of mutation study and selection

Each of the 32 routines executes exactly 100,000 deterministic **physical trajectory candidates**, with two actual `applyExpressivePose` descendant-matrix transformations and landmark extractions per candidate (6.4M actual kinematic poses). Phase offset, intensity and joint coordination create different physical states; a per-routine physical SHA256 digest of 200k pose records is retained. The highest-scoring sampled candidate is **a bounded search winner**, not the global kinematic optimum and not 100,000 separately rendered GPU video sequences. The initial `main` comparison reuses exactly the same independently authored V45 oracle and preserves old source; no retrospective best-case baseline is substituted.

The authored candidate selects a soft default intensity of **0.95** and a **user-adjustable** amplitude range 0.55–1.0, tempo 0.7–1.4×. The sampled winners are evidence for review, NOT automatically loaded as unreviewed runtime parameters. Human aesthetic review of actual screenshots remains mandatory. Six independent closed plush pelts are preserved; source test runs 32×3=96 actual deformations with zero cross-region triangles, 0 invalid binds and bounded edge stretch.

## 32-label inventory, adversarial before/after and required oracles

| Source key | UI label | Shared semantic primitive | Physical oracle | Old main | Candidate | Signed margin | Rig mutants |
|---|---|---|---|---|---|---:|---:|
| `greet` | Saluta | `social.waveRight` | `pawHighRight` | FAIL | PASS | +0.186 | 100,000 |
| `farewell` | Arrivederci | `social.waveLeft` | `pawHighLeft` | FAIL | PASS | +0.174 | 100,000 |
| `yes` | Fai sì | `head.nod` | `headPitch` | PASS | PASS | +0.293 | 100,000 |
| `noThanks` | Declina | `head.shake` | `headYaw` | PASS | PASS | +0.389 | 100,000 |
| `shy` | Timido | `posture.close` | `close` | PASS | PASS | +0.241 | 100,000 |
| `proud` | Fiero | `posture.open` | `open` | PASS | PASS | +0.559 | 100,000 |
| `curious` | Curioso | `head.explore` | `headYaw` | PASS | PASS | +0.512 | 100,000 |
| `celebrate` | Festeggia | `arms.bothHigh` | `bothHigh` | FAIL | PASS | +0.219 | 100,000 |
| `applaud` | Applauso | `arms.clap` | `clap` | FAIL | PASS | +0.082 | 100,000 |
| `stretch` | Stretching | `arms.bothHigh` | `bothHigh` | FAIL | PASS | +0.253 | 100,000 |
| `pointLeft` | Indica a sinistra | `arm.pointLeft` | `pointLeft` | PASS | PASS | +0.387 | 100,000 |
| `pointRight` | Indica a destra | `arm.pointRight` | `pointRight` | PASS | PASS | +0.373 | 100,000 |
| `march` | Marcia | `locomotion.alternate` | `alternateLegs` | PASS | PASS | +1.265 | 100,000 |
| `retreat` | Indietreggia | `locomotion.backward` | `worldBackward` | PASS | PASS | +0.275 | 100,000 |
| `approach` | Avvicinati | `locomotion.forward` | `worldForward` | PASS | PASS | +0.280 | 100,000 |
| `pivot` | Cambio direzione | `locomotion.pivot` | `worldTurn` | FAIL | PASS | +0.480 | 100,000 |
| `sway` | Oscilla | `posture.sway` | `spineSway` | PASS | PASS | +0.279 | 100,000 |
| `bounce` | Saltella | `locomotion.jump` | `worldJump` | PASS | PASS | +0.249 | 100,000 |
| `stepLeft` | Passo a sinistra | `locomotion.lateralLeft` | `worldLeft` | FAIL | PASS | +0.172 | 100,000 |
| `stepRight` | Passo a destra | `locomotion.lateralRight` | `worldRight` | FAIL | PASS | +0.172 | 100,000 |
| `balanceLeft` | Equilibrio sinistro | `balance.leftLegUp` | `leftLegUp` | FAIL | PASS | +0.711 | 100,000 |
| `balanceRight` | Equilibrio destro | `balance.rightLegUp` | `rightLegUp` | FAIL | PASS | +0.703 | 100,000 |
| `warmup` | Riscaldamento | `body.alternate` | `alternateArms` | PASS | PASS | +0.758 | 100,000 |
| `coolDown` | Rilassati | `body.settle` | `calm` | PASS | PASS | +0.105 | 100,000 |
| `salute` | Saluto militare | `social.forehead` | `pawNearFace` | FAIL | PASS | +0.248 | 100,000 |
| `bow` | Inchino | `body.bow` | `spineBow` | PASS | PASS | +0.209 | 100,000 |
| `surprise` | Sorpresa | `emotion.open` | `open` | PASS | PASS | +0.681 | 100,000 |
| `ponder` | Rifletti | `social.chin` | `pawNearFace` | FAIL | PASS | +0.109 | 100,000 |
| `spin` | Piroetta | `locomotion.fullTurn` | `fullTurn` | FAIL | PASS | +0.083 | 100,000 |
| `victory` | Vittoria | `arms.victory` | `bothHigh` | FAIL | PASS | +0.260 | 100,000 |
| `dance` | Ballo | `body.dance` | `alternateArms` | PASS | PASS | +1.165 | 100,000 |
| `lightningBolt` | Posa del Fulmine | `body.asymmetric` | `asymmetricArms` | PASS | PASS | +0.382 | 100,000 |

## Non-compensatory acceptance (DoD)

- [x] R01 — exactly 32 distinct labels, 30 Base + 2 Complessi, with one stable UI→choreography→intention→rig mapping each.
- [x] S01 — `Saluta` raises the transformed right paw above the shoulder (>0.12 units at canonical intensity); wrist wave nontrivial (>0.24 rad range); left paw remains stable.
- [x] S02 — `Applauso` keeps paw-centre distance >0.39 units at measured canonical key poses, reaches <0.9 and opens/closes by >0.14 units. Noncontact among full plush volumes and all interpolated frames is not claimed.
- [x] S03 — walking left/right uses actual bounded world-X translation; pivot changes world yaw; spin rotates the actual body by 2π and returns to original heading; reduced-motion preference declassifies spin amplitude.
- [x] S04 — independent label-specific geometry oracles pass 32/32 canonical sample sets at intensity 0.95, with 100,000 rig mutants **per label** and 0 nonfinite sampled poses.
- [x] S05 — all 32×3 simulated actual-pelt mesh deformations preserve finite, individually closed six-region geometry and zero cross-region triangles; real-time full-device physics still unknown.
- [ ] S06 — Node24 exact-HEAD CI and original CORA source replay must pass on GitHub (local Node22 is compatibility-only).
- [ ] S07 — real Chromium production CSP capture: every button click produces a matched `teddy:motion-frame` event and authentic WebGL2 screenshot, SHA256-stamped for independent review.
- [ ] P01 — human assess that motion *reads* as the label in front/3⁄4/side views, especially salute/ponder/clap/raised arms. Static PNGs are necessary but not sufficient for motion quality; require videos or sequences for timing and oscillation.
- [ ] P02 — no visibly stretched seams/collisions for key poses, normal browser FPS and actual target devices, assessed independently. Do not infer from triangle-stretch threshold alone.
- [ ] G01 — reviewer/required checks and postmerge original SHA independently attested; PR branch cannot authorize its own merge.

**Gate equation:** `REPOSITORY_AND_SOFTWARE_CANDIDATE = R01 AND S01...S07`; `PRODUCT_ACCEPTANCE = REPOSITORY_AND_SOFTWARE_CANDIDATE AND P01 AND P02 AND G01`.

## Minimum semantic fixes and epistemic findings

1. Old `greet` leaves right paw 0.42–0.50 units below shoulder (intensity .7); new UI preset .95 makes the paw 0.31 units **above** shoulder in observed key poses; authentic 3D rig measured in code, *not* a visual preference rating.
2. Old `applaud` keeps paws roughly 2.2–2.7 units apart; new curve brings them within approximately 0.5–0.9 units with explicit anti-overlap sampled bounds.
3. Old `stepLeft/stepRight` uses turn+forward; new named `sideStepLeft/sideStepRight` uses bounded `world.x`, no spurious `world.z` motion.
4. Old `spin` uses left/right stage turn without full 2π; new transient body spin avoids unauthorized `world.yaw` exceeding limits or corrupting reset.
5. The old `balanceLeft/Right` hip pitch direction barely lifted the foot. Positive hip rotation had the wrong visible effect. The new negative pitch actually lifts the intended ankle.
6. Higher shoulder range is **guarded** by a coherent joint limit (1.55 rad) and a physical pelt deformation test; older fixed 1.2-rad test assertions are updated to the *new explicit upper bound*, not disabled.
7. Even with 32/32 source oracles, material semantics like hand-on-forehead and hand-on-chin remain approximate. Human subjective quality remains **UNVERIFIED**. This PR is an engineering improvement, not a new animation model trained from data.

## Run the identical physical falsification

```sh
node --test tests/motion-semantics-v45.test.mjs tests/motion-physical-pelt-v45.test.mjs
node tools/motion-physical-falsify-v45.mjs --count 100000 --output /tmp/teddy-motion-v45.json
node tools/browser-motion-intent-v45.mjs
```

Node24 and Chromium under GitHub Actions are the intended authoritative runtime. Local browser execution may be unavailable due to sandbox loopback restrictions; a fake screenshot, Canvas fallback or model mock must never be substituted as WebGL2 evidence. The previously merged PR57 was the source baseline, not a preexisting motion-certification. User-facing animation refinement must not weaken original security or conversation behavior.
