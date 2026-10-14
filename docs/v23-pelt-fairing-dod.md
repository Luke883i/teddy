# Teddy V23 — Six-pelt surface fairness and actual visual acceptance

Baseline: `main` at `4eb00711d79843cc23bbdabe6e6aa7767a05f904`. Earlier screenshots (arms down, arms raised) are recorded as **failed historic visuals**; V21 and V22 are now merged and replace the failed V16–V20 visual architecture.

## Ten-PR causal audit
- V16 (#25) single closed bind mesh; full arm-bust bridges occurred within topology.
- V17 (#26) facial micro-expression overlays did not correct arm anatomy.
- V18 (#28) improved bone ownership; could not remove preexisting bridging triangles.
- V19 (#29) Boolean negative-space cutters yielded rigid, square black axillary slots.
- V20 (#32) edge constraints reduced measured stretch but could not change geometric triangle connectivity, sometimes only moving the damage.
- V21 (#33) resolves the key structural failure with six separate closed skin regions and **zero cross-region arm/body triangles**, one GPU buffer/draw.
- V22 (#36) adds integrated snout and jaw volumes and a head-local facial pigment rather than glued-on ovals.
- Other recently merged branches (#27, #30, #31 and #34) address text runtime, installation and chat UX, not the physical skin; their green checks are not geometric proof.
These observations supersede treating V20 as the live visual pipeline. The original V16/V19/V20 modules remain for historical contracts, but live render uses `anatomical-runtime-v21.js`.

## Intended final layout, inferred backward from the user screenshots
A friendly round-headed teddy with broad plush shoulders, arms clearly separated at the axilla but gently contacting the torso near the shoulder, rounded wrists and ankles, a soft uninterrupted belly marking painted on fur (not a detached oval plaque), integrated 3D muzzle, and no accordion/banding in front, profile or quarter view. The character must also remain expressive and physically legible through neutral, greet, victory, dance, Lightning Bolt and balance gestures.

## Why this V23 slice
V21 fixes *topological* arm-body crosslinks. Yet marching-tetrahedra at finite voxel size can still produce angular/polygonal surface irregularities. A product whose body is a collection of highly faceted pelts remains aesthetically insufficient despite mathematical closure. A second broad SDF union would reintroduce the catastrophic arm/bust membrane. V23 **smooths within existing disjoint indexed components only**; it cannot add an edge joining any pair of pelts.

**Dominant standard:** smoothed watertight mesh with weighted skeleton, consistent vertex normals, localized nonshrinking Taubin-style low-pass mesh fairing. **Frontier / intentionally deferred:** continuous posed implicit topology, full DQS, collision-aware SDF remeshing and foot IK. None is supported by evidence as necessary for this *localized* faceting fix; adding them without visual evidence would amplify risk.

## Semantic engineering supply chain
S1: V21 six anatomical regions -> marching-tetra extraction -> V23 bounded two-pass nonshrinking fairing on trunk/arms/legs, preserve head V22 without moving one vertex -> recompute normals.
S2: same V21 bindPeltRegions, MotionEngine, face V17/22 and original GPU buffers; no frame-time mesh rebuild. V23 topology, curvature and volume receipt travels through `teddy:implicit-skin-ready` and `implicitSkinStatus()`.
S3: actual-Teddy unit tests for per-region curvature reduction, drift ≤0.018, volume change <4.5%, no head displacement, six closed components, no arm-body cross-triangles, bind identity, five named routines × six samples.
S4: real Chrome WebGL2 / production CSP activation must expose V23 fairing receipt, old safety invariants, and screenshot evidence in neutral/side-looking/greet/Lightning Bolt/raised-arm Victory. Save real compositor PNG to artifacts.
S5: 10,000,000 **seeded parameter** mutant checks (5M conforming/5M injected invalid); these are not 10M GPU frames. Keep inherited 1000 architecture choices, V21 10M scenarios, legacy 50M/100M, Canvas2D, face, text and local runtime suites.

## Strict DoD lattice
| Gate | Threshold | Proof |
|---|---|---|
| G01 | Six anatomical components, every component closed, 0 open and nonmanifold edges | Node real mesh |
| G02 | Zero arm-trunk sharing triangles / zero cross-region bind links | Node/Chrome |
| G03 | 5 regions actually fairened; average Laplacian curvature energy reduces vs bind original | Node real mesh |
| G04 | Max vertex drift ≤0.018 world units; volume change per region <4.5% | Node numeric |
| G05 | Head moved 0 vertices; V22 pigment and mouth structure preserved | Node/browser |
| G06 | Bind pose identity <1e−4; 5 routines × 6 phases all finite/active | Node |
| G07 | No new dynamic topology uploads; original draw and controls remain | V21 inherited GPU tests |
| G08 | 10M deterministic numerical mutants, exactly 5M valid and 5M rejected, 0 survivors | CI seeded receipt |
| G09 | Chrome WebGL2 + CSP: actual fairing receipt, live movement and visual compositor snapshots | CI browser |
| G10 | Exact final HEAD 6 checks green, inherited workflows preserved | GitHub Actions |
| H01 | Human review of two original failure poses against NEW neutral and Victory screenshots | OPEN until reviewed |
| H02 | Subjective cuteness, full self-intersection freedom, physical ground contact and cross-device 60 FPS | OPEN; not implied by G01–G10 |

## Falsification interpretation
A prettier topology or smoother curvature does not automatically guarantee charming proportions. The acceptance photos remain authoritative for human visual evaluation. Any later proof that V21 shoulder pads or ankles are incorrectly shaped should drive a separate localized anatomical PR rather than reintroducing a welded global field. Claim release engineering DONE only for G01–G10, **not** aesthetic human sign-off H01.
