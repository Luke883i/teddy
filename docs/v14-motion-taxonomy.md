# Teddy v14 — Motion semantic lattice, DoD and test truth

## Abstract intent refined
Teddy must exhibit **large but controlled multi-joint expression** for all 30 Base and 2 Complessi actions: expressive whole-body anticipation, coherent head/spine/arms/wrists/legs, legible counterpose, smooth velocity on transitions and reliable neutral recovery. Stop cancels activity without necessarily undoing past world travel; **Reset restores starting world translation, yaw, queue, playback time and neutral skeletal articulation**. The same engine and rig must feed both WebGL2 and Canvas2D.

## Supply-chain lattice (one runtime truth)
UI Movimento/Base/Complessi + Reset -> `app.js` callbacks -> `movement-v8.js` adapter -> `choreography-v12.js` bounded primitive queue + `MotionEngine.beginRoutine` shared timeline -> `expressive-v14.js` keyframed semantic trajectories -> inherited skeleton hierarchy / descendant transformations -> existing grounding -> `render.js` WebGL2 or `canvas-motion-v13.js` rasterized 2D -> frame and browser evidence. Reset uses the same `MotionEngine.reset` and `renderer.resetMotion`; no parallel pose store, no new LLM dependency, no replacement of safety invariants.

## Individually authored, granular motion map
All values are nominal peak joint rotation magnitudes. Motion is expressed at anatomical pivots; aggregate movements may combine larger silhouette excursions.

| # | Routine | Physical interpretation | Support plan | Most active skeletal joints | Nominal peak |
|---:|---|---|---|---|---:|
| 1 | `greet` | saluto espansivo | bipodalico | shoulderR, elbowR, wristR, head | 1.15 rad |
| 2 | `farewell` | congedo con oscillazione | bipodalico | shoulderL, elbowL, wristL, head | 1.11 rad |
| 3 | `yes` | assenso visibile | bipodalico | head, shoulderL, neck, spine | 0.29 rad |
| 4 | `noThanks` | rifiuto gentile | bipodalico | head, shoulderR, wristR, neck | 0.35 rad |
| 5 | `shy` | timidezza raccolta | bipodalico | head, shoulderL, shoulderR, spine | 0.17 rad |
| 6 | `proud` | fierezza e petto aperto | bipodalico | shoulderL, shoulderR, elbowL, elbowR | 0.80 rad |
| 7 | `curious` | curiosita orientata | bipodalico | head, shoulderR, neck, spine | 0.39 rad |
| 8 | `celebrate` | esultanza completa | bipodalico | shoulderL, shoulderR, elbowL, elbowR | 1.20 rad |
| 9 | `applaud` | applauso davanti al petto | bipodalico | shoulderL, shoulderR, elbowL, elbowR | 0.87 rad |
| 10 | `stretch` | allungamento bilaterale | bipodalico | shoulderL, shoulderR, spine, head | 1.20 rad |
| 11 | `pointLeft` | indicazione precisa sinistra | bipodalico | shoulderL, head, wristL, spine | 1.08 rad |
| 12 | `pointRight` | indicazione precisa destra | bipodalico | shoulderR, head, wristR, spine | 1.08 rad |
| 13 | `march` | marcia alternata energica | appoggio alternato | hipL, kneeL, shoulderL, shoulderR | 0.52 rad |
| 14 | `retreat` | passo controllato indietro | appoggio alternato | shoulderL, hipR, hipL, spine | 0.45 rad |
| 15 | `approach` | avvicinamento accogliente | appoggio alternato | shoulderR, hipL, hipR, elbowR | 0.78 rad |
| 16 | `pivot` | rotazione consapevole | bipodalico | shoulderR, shoulderL, head, spine | 0.45 rad |
| 17 | `sway` | dondolio morbido | bipodalico | shoulderR, spine, shoulderL, head | 0.43 rad |
| 18 | `bounce` | rimbalzo controllato | bipodalico | kneeL, kneeR, shoulderL, shoulderR | 0.40 rad |
| 19 | `stepLeft` | passo laterale sinistro | appoggio alternato | shoulderL, hipL, hipR, spine | 0.52 rad |
| 20 | `stepRight` | passo laterale destro | appoggio alternato | shoulderR, hipR, hipL, spine | 0.52 rad |
| 21 | `balanceLeft` | equilibrio su gamba destra | destro | shoulderL, kneeL, hipL, shoulderR | 0.78 rad |
| 22 | `balanceRight` | equilibrio su gamba sinistra | sinistro | shoulderR, kneeR, hipR, shoulderL | 0.78 rad |
| 23 | `warmup` | mobilita articolare | bipodalico | shoulderL, shoulderR, head, kneeL | 1.04 rad |
| 24 | `coolDown` | respiro e distensione | bipodalico | head, spine, shoulderL, shoulderR | 0.10 rad |
| 25 | `salute` | saluto alla fronte | bipodalico | elbowR, shoulderR, wristR, head | 0.92 rad |
| 26 | `bow` | inchino del busto | bipodalico | spine, head, shoulderL, shoulderR | 0.49 rad |
| 27 | `surprise` | sorpresa ampia | bipodalico | shoulderL, shoulderR, head, spine | 0.92 rad |
| 28 | `ponder` | riflessione e mano al mento | bipodalico | elbowR, shoulderR, head, wristR | 0.74 rad |
| 29 | `spin` | giro controllato con braccia aperte | bipodalico | shoulderL, shoulderR, head, spine | 0.69 rad |
| 30 | `victory` | posa di vittoria | bipodalico | shoulderL, shoulderR, elbowL, elbowR | 1.20 rad |
| 31 | `dance` | ballo sincopato multi-articolare | appoggio alternato | shoulderL, hipL, shoulderR, kneeL | 1.06 rad |
| 32 | `lightningBolt` | posa iconica diagonalmente asimmetrica | destro | shoulderR, elbowL, shoulderL, kneeL | 1.20 rad |

## Runtime rules
- Every entry has two distinct authored spatial keyposes, an anticipatory beat, controlled reversal and recovery to neutral at timeline end (quintic-like zero-velocity smoothstep interpolation). No random motion in the render loop.
- A single continuous normalized `routine.phase` extends across all primitive steps; no independent reset of the semantic pose at the end of each primitive, while the original primitive gait/world travel remains guarded.
- Rotating a joint **also rotates all descendant groups**, preventing wrist/elbow/eye detachment. The renderer consumes precisely those matrices on both supported backends.
- Joint angle component limit: 1.2 rad. The engine continues its bounded stage travel, speed/queue limits, and floor-grounding correction; the support mode informs which foot is used to correct contact.
- User Stop cancels in-flight content and queued movements; Reset additionally clears cumulative world translation and yaw and releases clip state.
- Reduced-motion setting attenuates movement through existing engine intensity policy; this is not disabled for cinematic clips.

## Falsification and evidence
1. Contract checks: exactly 32 one-to-one profiles; 32 unique time-sampled signatures; no unknown joints, nonfinite or out-of-range angles; nontrivial excursions and neutral landing for each.
2. Runtime geometric checks: posture through same world matrices on Canvas and WebGL; reset after walking/turning returns origin/yaw to zero; no queued/action residue.
3. Production CSP + browser E2E: click Saluta, observe actual canvas pixel changes; select Dance, observe semantic activity; click Reset, observe `world=origin`, no routine and no active action.
4. Mutation campaign: **100,000,000** deterministic semantic-joint-axis-time-angle candidates (32 routine names × 16 anatomical joints × 3 rotational axes × phase/angle variation); 50M conforming, 50M deliberately unsafe, each evaluated against contract; ~97k samples compute full-body interpolated angles. The CI output records real counts and deterministic checksum and fails on survivor. It does **not** purport to be 100M rendered animations.
5. Existing 1M motion scenarios, 1M invariant mutations and their source-digest-based canonical reports continue unchanged; report file hashes are refreshed, not their success conditions weakened.

## Evidence and limits
Source-level profiles + CI do not prove human-perceived naturalism, force/torque conservation, no foot sliding in high-frame-rate footage, collision IK, universal GPU performance or aesthetic consensus. Generated by authored deterministic keyposes and checked math, not motion capture. The next visual gate after merging should compare 32 5s 1080p clips with rater rubric on clarity, smoothness, floor contact, continuity and appeal. **No unexecuted 100M run may be claimed complete before its CI job concludes successfully.**
