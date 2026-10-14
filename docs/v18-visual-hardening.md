# TEDDY V18 · Screenshot-driven visual hardening (UI, rendering, graphics only)
Baseline main 5ab708aba20530fa72d62b12f824fc1e467037d6 (PR #26 merged). Evidentiary source: user-provided front/three-quarter screenshot; this is **one frame**, not an animation or GPU profiler trace.

## Intent lattice and source-backed root causes
1. **Silhouette anatomy P0**: underarm/hip stretch and black underbody folds are visually observable. `skinBindings` V16 selected four nearest implicit pieces independently of the biological joint chain. Adjacent geometry can consequently bind one vertex to left arm, right arm, torso and a hip. V18 instead chooses the nearest real fur primitive owner and binds only owner + direct skeletal parent with positive normalized weights; no contralateral / unrelated joint mixing. V16 watertight topology and face morph are retained.
2. **Pelliccia P1**: fine high-frequency fibers (`sin(vLocal.y*180)`, multi-octave hashed noise and VS normal jitter .014) amplify moiré and dirty dark spots, especially at projected joints. V18 lowers noise and geometry jitter and uses `fwidth` to suppress subpixel fiber interference. Does not claim a full production glTF PBR BRDF implementation.
3. **Muso/ventre P0**: a spherical, protruding belly patch and large muzzle/nose overlays read as detached beads. V18 narrows/thins those specific cinematic override volumes while preserving standalone materials and V17 micro-expressions.
4. **Inquadratura/status P1**: static bounds camera occupancy .71 reaches top and bottom in the captured viewport; centrally placed status text collides with Teddy's head. V18 uses portrait-safe occupancy ≤.64 on typical desktop and upper-left operational overlay, plus a clear WebGL2 fused/2D fallback badge, failing to claim a mesh active when fallback is in use.
5. **Evidence P0**: older CI proved topology and actual pixel changes but did not attach visual golden images. V18 captures the real Chromium compositor at neutral, Saluta and Fulmine, retains screenshot artifacts in GitHub Actions for human comparison, while maintaining all inherited runtime gates.

## Dominant industry standards vs frontier techniques
- **glTF 2.0 Khronos skin specification**: joints, inverse bind matrices, ordered joint weights, normalized vertex blending. V18 implements the relevant **principles** rather than claiming glTF file-format conformance. https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc
- **glTF PBR metallic/roughness**: base color, dielectric reflections, roughness and normal are separately controlled. V18 makes a restrained procedural shader improvement; full material-model migration/IBL is not implemented. https://www.khronos.org/gltf/pbr
- **Dominant character practice**: anatomical skin-weight painting, limit influences, vertex normals and tangents, pose libraries, stable IK contacts, deterministic animation curves, multiangle review and golden screenshots.
- **Frontier options (not falsely certified here)**: dual-quaternion skinning, bounded corrective blendshapes, continuous posed-SDF skin, dynamic signed-distance collision tests and real-time foot IK. These are evaluated as future candidates only after measurement of actual deformation pathologies. No needless remesh or secondary rig is introduced in V18.

## Atomic semantic slices and DoD / falsifiers
| ID | Subsystem | Measurable threshold | Evidence |
|---|---|---|---|
| A01 | Joint compatibility | 0 influence pairs across unrelated limb families | anatomical weight unit + actual Teddy mesh |
| A02 | Weight normalization | sum=1 ±1e-4 per vertex, finite, dominant ≥.55 | dynamic bind safety |
| A03 | Runtime deformation | nonfinite transformed vertices = 0; no identity-only animations | posed real-model tests |
| A04 | Mesh continuity | 0 open and non-manifold edges, exactly one component | inherited V16 + V18 tests |
| A05 | Deformation telemetry | sampled triangle area/stretch and indicative orientation warnings traceable | `teddy:visual-quality`, inspector |
| T01 | Fur aliasing | derivative attenuation in fragment shader; vertex-jitter amplitude ≤.0035 | GLSL contract + browser screenshot |
| T02 | Material contrast | brighter indirect floor fill, reduced non-physical cavity blackout | GLSL contract |
| F01 | Volume composition | flat belly patch thickness ratio <.17 of torso depth | cinematic runtime geometry test |
| F02 | Face | muzzle pads and velvet nose reshaped; V17 32 motifs and voice/cheeks preserved | inherited face + new geometry tests |
| U01 | Camera | nominal desktop occupancy ≤.66, constrained other formats | camera-plan across 5 ratios |
| U02 | Status | status left, top edge clear of face; renderer badge reflects true state | UI static + real Chrome DOM |
| U03 | Fallback | fused/compiling/Canvas2D/segmented fallback explicitly distinguishable | real UI text and `implicitSkinStatus` |
| E01 | Actual browser | real Chrome WebGL2 CSP: rendered PNG changes after Saluta and Fulmine | three saved PNGs, CI artifact |
| E02 | Mutation grade | 1M deterministic anatomical pair mutations, 500k legal and 500k rejected, 0 survivors | seeded CI receipt |
| E03 | Regressions | inherited 32 gestures, Reset, watertight topology, V17 face, 50M/100M/1M suites remain green | GitHub Actions final HEAD |

## Explicit not-yet-proven acceptance (visual debts)
- **V01**: human aesthetic rating on 32 routines × front/side/three-quarter × beginning/mid/end = 288 images. Automated artifacts provide three smoke examples, **not** this full acceptance.
- **V02**: rigorous foot lock / inverse kinematics for every routine and force-consistent articulation (not achieved in this minimal slice).
- **V03**: no self-intersections throughout extreme body movements and no strongly compressed/splayed polygon regions. The scalar pose metric warns but is not a universal geometry oracle.
- **V04**: P95 <16.7ms across a named actual GPU/browser/device matrix. No universal performance claim from headless SwiftShader.
- **V05**: independently graded high-end rendering (IBL/SSS, anisotropic strand BRDF, DQS) requires further benchmark and design review.

## Provenance, epistemic integrity and release gate
Source-built tests and deterministic mutation coverage certify contracts, not photographic cuteness. Any CI failures must be fixed on PR HEAD. The merged PR requires exact SHA 6/6 checks green. Browser PNG artifacts are production-CSP compositor frames of the actual app, not illustrative mockups. Human aesthetic acceptance remains open until visual review of those and the extended multiangle corpus.
