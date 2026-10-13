# Teddy V12 — Product/runtime/UIUX supply-chain closure
Date: 2026-10-13. Scope: PR #19, semantic commits on top of v12 choreographies.

## Intent reconstructed, without collapsing abstractions
The requested outcome is **not** a catalog, a passing motion invariant, or a shader coefficient on its own. In the live browser, without a voice connection, the user must see **Movimento**, choose **Base** (30 named entries) or **Complessi** (Ballo and Posa del Fulmine), click and observe Teddy moving. The **Pelliccia ON/OFF** button must exist visibly in the UI; on first launch the bear wears an opaque, uniform procedural pelt by default, and switching it off must visibly change the fur material without removing the body or showing parts through other parts. The choice must survive page reloads through the existing persisted config path.

## Dependency / semantic evidence lattice
| Node | Meaning | Depends on | Runtime owner | Falsifier |
| --- | --- | --- | --- | --- |
| INT-1 | Visible direct movement selection | UI accessible | web/index.html | missing nav item |
| INT-2 | Base / Complessi category switch | INT-1; catalog | motion-panel-v12.js | count / tab activation |
| MOV-1 | 30 basic named routines | motion-contract; choreography | choreography-v12.js | unknown or unbounded motion |
| MOV-2 | Dance + Lightning Bolt | MOV-1; boltPose | movement-v8 + engine | no physical pose activation |
| MOV-3 | click->enqueue->frame | INT-2; MOV-2 | app.js -> renderer -> MotionEngine | click doesn't reach MotionEngine |
| MOV-4 | stop/recovery/bounds | MOV-3 | clearMotion; safety invariants | queue continues after stop |
| FUR-1 | default-on persisted semantic state | config schema + API | config/default.json; mergeConfig; PUT /api/config | false not durable / invalid type silently accepted |
| FUR-2 | visible ON/OFF | FUR-1; app UI | #furBtn -> renderer.setConfig | text toggles, shader does not |
| FUR-3 | opaque, stable surface fur | FUR-2; WebGL2 | render.js | translucent overlapping body / noise swimming |
| FUR-4 | non-WebGL degradation | FUR-2; fallback | cinematic-v11.js | button has zero observable effect |
| ENV-1 | floor/shadow / no double-geometry | MOV-3; FUR-3 | existing world + depth path | depth disabled for body |
| VER-1 | evidence from same source hash | all above | npm test; motion-v8, CI | stale report / unexecuted test |
| CERT-1 | actual photo-real skin, 30 distinct skeletal gestures | rendered browser captures | future visual gate | perceptual failure |
Edges: INT-1 -> INT-2 -> MOV-3 -> MOV-4 -> VER-1; MOV-1 -> MOV-2 -> MOV-3; FUR-1 -> FUR-2 -> FUR-3 and FUR-4 -> VER-1; ENV-1 + CERT-1 determine release-grade visual quality, NOT a CI-green check alone.

## Implemented minimal whole-chain slices
1. **Canonical routine UI semantics.** Keyboard-accessible direct navigation, Base/Complessi buttons with pressed state; 30 named options plus two complex options, stop control, live feedback and a degraded-backend explanation. Strict data-only commands, no eval, and no dependence on ASR, LLM, local provisioning or keys.
2. **Atomic command execution.** UI callback calls the existing TeddyRenderer enqueueMotion; renderer reuses MotionEngine, pose and grounding. No new engine, no second skeleton, no action sidecar.
3. **Appearance semantics and persistence.** `appearance.furEnabled` defaults true, strict boolean merge; toolbar control renders from config and persists using existing authenticated PUT /api/config. Immediate renderer update; on network rejection config and presentation roll back. Backward compatible with config written before this field existed.
4. **Opaque Pelt V12.** One depth-writing opaque bear mesh; shader fiber coordinates scaled to physical per-part radii so visual density does not depend on primitive dimensions; local-space strand/noise response controlled by `uFuzz`, material off => smooth base body still opaque. Existing alpha blending remains only for ground shadow, not body. No transparent shell stacking or z-sort dependency.
5. **Canvas2D fallback.** Deterministic subtly stroked local material detail when fur enabled, and simplified translation plus stylized Lightning Bolt response. No claim that Canvas2D can reproduce full articulated 3D motions.
6. **Falsification.** Real callback wiring tested with in-memory DOM surface, actual renderer method/engine invocation, 100k deterministic bounded catalog/pelt cases, persistent config merge, shader uniform toggle assertions, static boot/UI/occlusion invariants; existing full motion simulation and CI regressions unchanged.

## Acceptance criteria and epistemic limitations
- Each UI control must exist in the shipped `web/index.html` and have a listener in `web/app.js` or panel module.
- Clicking a routine must enqueue native engine actions; stop must clear queue; duplicate actions within a routine must retain intentional repetitions.
- The fur toggle must update runtime shader value (0.82/0), preserve opaque body alpha=1, leave depth test enabled and write depth for each body part; the control must persist a strict boolean across config REST round-trip.
- Canvas fallback must never silently pretend complete WebGL animation equivalence.
- CI must pass on one exact final HEAD, with unchanged million-scenario and million-mutation evidence diff gates.
- **Not proven by unit/CI alone:** photoreal fur, actual frame-by-frame no-transparent-artifact at all browser angles, continuous mesh seams, GPU FPS, foot-plant IK, 30 physically distinct skeletal moves, or real headless browser screenshot golden approval. The existing 30 base items remain named choreographic macros, not 30 custom animation clips.
- No PR drafts were changed. No separate visual renderer or unsafe externally fetched texture dependency was introduced.

## Manual falsification when browser/GPU is available
Launch Teddy locally; before microphone setup select Movimento > Base > Saluta, then Complessi > Ballo / Posa del Fulmine; use Stop while dancing; toggle Pelliccia OFF, verify body remains visible/opaque, toggle ON and inspect torso and joint shading in front and 3/4, refresh and verify persisted state; repeat with WebGL2 disabled (simplified motion is expected). Record screenshots, device/GPU, FPS, screen-space slippage and visible clipping before claiming CERT-1.
