# V20 — Character integrity: shoulder transition and dynamic seam stretch

Baseline: `main` f766561050c01316bc9882580dcf7fd7061227fa (V19 merged). Two user-provided actual screenshots are **failed visual regression fixtures**, not acceptable references.

## The user's uncompressed intent
Teddy must look like a cute, soft teddy bear in relaxed arms and outstretched poses, with natural shoulders, a readable axillary void and a continuous plush surface free of **accordion triangles** or square tears. A closed indexed mesh alone is not success. Keep existing 32 movements, reset, fur toggle, face V17, WebGL2 fused skin and Canvas2D fallback.

## Proven root-cause chain
1. V16 extracts **one** body using smooth SDF union and marching tetrahedra; triangles are watertight in rest pose.
2. V19 subtracts a long rounded slot underneath each shoulder; it proves the sign of the *rest* field at a few points, but it does not ensure good dynamic deformation of the long slot walls.
3. V18 assigns vertices to the closest anatomical volume (primary joint + 20% its parent). Surface vertices on either side of a cut can have abruptly different owners. Large shoulder rotations therefore stretch individual triangles between incompatible transformations. Screenshots strongly support this visible effect; precise causal attribution remains verified by the new real-pose deformation metrics.
4. Existing V18 quality checks only considered a subset of triangle areas and finite positions; `pass` allowed extreme stretching. The "green" tests could certify a mesh that looks like a fan of rigid strips.

## Engineering strategy: minimal but real
- **S1 — Shoulder-collar bind gradient**: blend shoulder and spine weights in a bounded three-dimensional collar, in the *existing* V16 bind weights after anatomical binding. Preserve trunk, distal arms, legs, head and face. No new animation engine or additional body surface.
- **S2 — Dynamic local strain limiter**: build a cached *edge graph* at shoulder collars in the indexed bind mesh. After existing rig deform + V17 cheek update, relax overlong edges locally in a small bounded number of passes; recompute normals and upload existing GPU buffers. Only outlier edges are adjusted.
- **S3 — Truth-bearing diagnostics**: expose affected vertices, seam graph length, before/after stretch count and peak ratio through `implicitSkinStatus()` / `teddy:visual-quality`. In particular, topology success no longer implies deformation success.
- **S4 — Falsification**: unit tests on *real* canonical Teddy mesh, bind identity, five actual named movements × six phases, a constructed accordion case that must contract, and one million deterministic micro-samples of smooth shoulder weights. Preserve V16–V19, face, CSP, UI and existing mutations.
- **S5 — Visual verification**: real Chromium/WebGL2 browser checks that seam blending and correction are active alongside actual changed compositor screenshots in neutral/Saluta/Fulmine. Screenshots are archived as evidence, not automatically designated pretty.

## Challenging atomic DoD (contract vs observed evidence)
| Gate | Falsifier / metric | Status until exact SHA CI |
|---|---|---|
| C01 | Real bind surface: 1 connected component, no boundary/nonmanifold edges | must PASS |
| C02 | Shoulder collar weight continuous, sum = 1 ±1e-4, no contralateral contamination | must PASS |
| C03 | Bind pose identity max error <1e-4 | must PASS |
| C04 | Locally affected shoulder vertices >100, cached shoulder edges >80 | must PASS |
| C05 | 5 routines × 6 nonneutral phases: moving vertices >.07 world units; no nonfinite deformation | must PASS |
| C06 | For every sampled dynamic pose: peak shoulder edge stretch never increases after relaxation; stretched-edge count never increases | must PASS |
| C07 | Constructed 3:1 "accordion" failure actually contracts | must PASS |
| C08 | One million seeded continuous-collar probes: bounded [0,1], bilateral symmetry, adjacent step <.002; no violations | must PASS |
| C09 | WebGL2 fused body and V19 open gaps active; UI movement screenshot changes; actual runtime seam state finite | must PASS |
| C10 | Preserve 32 motions, Reset, facial V17, Canvas2D fallback, security and inherited mutation gates | must PASS |
| C11 | 6/6 checks green on **same HEAD** | must PASS |
| H01 | Human golden review neutral/arms-down + arms-open front, side and 3/4, and 32 motions | NOT PROVEN by numeric gates |
| H02 | No dynamic triangle self-intersection anywhere | NOT PROVEN; graph stretch is not continuous collision detection |
| H03 | Ideal plushness, softened axillary shading, realistic IK and every-GPU 60fps | NOT PROVEN |

## Industry comparison
Normalized blended bind weights and inverse bind matrices follow the established character-rigging principles described in Khronos glTF 2.0 and conventional linear blend skinning. Bounded position corrections resemble **position-based dynamics** (PBD) edge-distance constraints, but this lightweight pass is **not** a general cloth solver, collision solution, DQS implementation or physical proof. Face V17 remains on its existing rig. We prefer the smallest locally measured change rather than another ungrounded SDF remeshing architecture.

## Acceptance boundary
CI topology and deformation contracts plus Chrome compositor frames can demonstrate that the new code is wired, movements persist and extreme **sampled edge stretch** is reduced/not worsened. They do not establish that the user's two photos are aesthetically corrected. Visual acceptance requires new screenshots matching arm positions and a human review of the actual result. The full subjective visual DoD remains explicitly open until that review.
