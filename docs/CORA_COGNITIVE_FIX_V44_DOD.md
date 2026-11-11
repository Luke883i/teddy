# Teddy / CORA cognitive correction V44 — evidence-first definition of done

**Scope:** the bounded deterministic control layer, NOT the whole language model or the visual product. Baseline is the merged Teddy Git revision `52ce828122e342ef95f874fb384433a7f1b8645b` (tree `ac1aff158370af328b6e9802f3c570e02fbc0d56`). The source of the problems is iteration 4/N; that earlier bundle was a non-upstream trial. CORA is a read-only evaluator and cannot certify a release or product quality.

## Issue and causal ledger

| ID | Symptom / cause | Remediation owner | Independent falsifier |
| --- | --- | --- | --- |
| S-01 | Up to 24 accepted explicit rules, but only six forward sweeps; valid reversed long chains can be declared unproved. | `server/lib/grounded-reasoner-v32.mjs` | BFS reachability on 120 order/depth vectors, 120 negative vectors; test depth-24 reverse chain and contradiction/retraction controls. |
| S-02 | Contextual routing for `spiega` / `approfondisci` is triggered by an old assistant turn even if the request is complete. | `server/lib/semantic-spine.mjs` | 40 self-contained questions under four histories, 18 semantic-boundary cases and 18 short contextual follow-ups; never invent missing antecedents. |
| S-03 | Prompt budget assigned oldest-first across last eight turns, displacing newest answer. | `server/lib/local-engines.mjs` | 12 long turns, 2600-character maximum history budget, newest retained, chronological retained subsequence, current question always final. |

## Non-compensatory DoD and checklist

- [ ] **D1 / R:** original main identity and changed Git blobs pinned; no undocumented production call-path changes; project-owned artifact roles and CORA original replay still pass on final PR HEAD.
- [ ] **D2 / S-01:** positive logic false-negative count **0/120**, negative spurious entailment **0/120**, max chain depth **24**, no assumed world truth, no regression for cycles, premise withdrawal or arithmetic.
- [ ] **D3 / S-02:** false contextual routing **0/40** self-contained prompts and **0/18** ambiguous-prefix boundaries, wrongly open contextual prompts **0/18**; all controls exercised with real `planSemanticTurn`, not merely string matching.
- [ ] **D4 / S-03:** latest eligible prior assistant message kept under constrained budget, context order strictly increasing, selected history chars **<= 2600**, actual question is last; no new system authority from history.
- [ ] **D5 / software:** all relevant existing Node24 unit/integration and exact-head CI green, with no stealth skip, fixed oracles or weakened security; real HTTP/SQLite idempotence retained (mock generation labeled as mock).
- [ ] **D6 / assurance:** independent human approval, protected checks/merge authority, postmerge actual SHA revalidation remain distinct; final PR HEAD green is not a release or product certificate.
- [ ] **D7 / product:** real Qwen multi-turn competence and Italian pragmatics measured separately, plus browser animation and human appeal; until then product qualification **BLOCKED_EXTERNAL**.

The source-level gate is **D1 AND D2 AND D3 AND D4 AND D5**. The governed/product gate additionally requires **D6 AND D7**. These cannot be reduced to a weighted score. Positive sample counts do not estimate real user precision/recall. 

## Reproduce and measure

```sh
node tools/cora-cognitive-metrics-v44.mjs --output /tmp/teddy-v44-metrics.json
node --test tests/cora-cognitive-closure-v44.test.mjs
npm test
```

The metrics script records separate numerator/denominator and counterexample rows; it exits nonzero if any bounded source obligation is violated. The test file is included in the existing `npm test` suite on Node24 (and is also runnable under Node22 for limited local compatibility). Do **not** overwrite the three baseline results with candidate outputs; archive each with its source SHA. The deterministic 120+120+40+18+18 cases are finite synthetic families, not 292 independent real user sessions.

## CORA / inheritance and evidence limits

The tool `tools/cora-cognitive-metrics-v44.mjs` is a **Teddy-specific independent finite oracle**, not a new CORA authority. Its tests belong to the existing CI owner; the official CORA source workflow still performs ontology, artifact and Git provenance checks. CORA's native Python-only static graph is not a complete JS runtime dependency map; no importer omission can grant deletion rights. The user-facing Teddy product's quality remains dependent on genuinely tested local/remote generation, browser pixels and independent user comprehension. Do not claim model weight fine-tuning or enterprise/product readiness because these tests pass.
