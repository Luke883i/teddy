# Teddy v31 - cognitive-workspace audit and epistemic limits

Base: merged PR #44, main SHA 3d31f1fc3b0953740b7786c1a653c37be7c715ed. Draft implementation on feat/teddy-v31-cognitive-workspace.

## AS-IS / root / killer application
Current deterministic micro-intents can respond with a canned phrase to "non ho capito" despite knowing the previous question and answer. V29 increases language-model budgets by keyword; v30 ensures exactly-once replay but does not test relevance. The missing object is an explicit, checkable question/answer goal state.

V31 reconstructs a small, typed, conversation-scoped workspace: current dialogue move, antecedent question, most recent actual assistant response, bounded topical nodes and edges, constraints and untrusted provenance. It routes contextual clarification to the real language model; local-generation readback rejects objective prompt echo/meta only, with at most one retry. The small LLM is a language generator, not the authority on memory, truth, routing or recovery. SQLite v30 truth contract remains intact.

Killer-application hypothesis: an embodied local idea-sparring partner that can explain, challenge, correct and resume a specific reasoning thread while knowing when there is insufficient context. No validated human user preference is claimed.

## Frontier science and limits
- Global workspace agent study (2024): https://doi.org/10.3389/fncom.2024.1352685 - task-dependent architectural benefits at smaller memory, not universal emergence proof.
- Comparative neurosymbolic reasoning (2025): https://proceedings.mlr.press/v284/chen25b.html - symbolic solver and language component have complementary capabilities.
- Entrospect / small-model introspection limitations (ACL Findings 2025): https://aclanthology.org/2025.findings-acl.1261/ - unconstrained self-reflection is not reliably beneficial for tiny language models.
- MultiChallenge (2026): https://labs.scale.com/blog/multichallenge-update - multi-turn retention, inference, self-coherence require independent benchmarks.

There is NO established universal minimum node count, rule count or parameter threshold for emergent intelligence. This implementation caps the graph at 18 nodes / 24 edges for latency and reliability, not for theoretical consciousness. Emergence must be operationalized as held-out compositional generalization, not inferred from code complexity.

## M1-M7 closure ledger

M1 - Semantic input mutations: tools/mutate-cognition-v31.mjs executes 10,000 seeded synthetic inputs across ten move families and asserts independent expectations. NOT 10k authentic Qwen generations, independent human intentions or AST mutants.

M2 - Source mutation strength: tools/mutate-code-v31.mjs mutates targeted runtime operators and asserts independent oracle kills. This is targeted source mutation, not exhaustive AST mutation testing.

M3 - Conversational relevance: tests/cognitive-workspace-v31.test.mjs cover explicit repair, follow-up, focus and conservative readback. Authentic Qwen comparative relevance and blind user scoring OPEN.

M4 - Scoped memory: workspace reconstructs the last 12 turns of the current conversation. Retains historic v24/v26/v30 scope/idempotency regression. Long-term semantic memory with attribution OPEN.

M5 - Concurrency: HTTP/SQLite replay and cold restart inherited. Global textBusy serializes inference and currently does not offer fair queues or cancellation recovery for all noncommitted requests. Performance and race stress OPEN.

M6 - Embodiment: semantic contextual completion drives only a tiny whitelisted nod, bounded by the existing motion sanitizer. Suppressed on HTTP replay and reduced-motion settings; never used to claim an emotion was understood. Human perceptual/anatomical review OPEN.

M7 - Readable UI: inherited real Chromium layout/font/full answer regression retained. No claim of proof of Teddy being cute, photorealistic or naturally animated. Human review OPEN.

## Real-model evaluation necessary before product-language claims

Pre-register 60+ independently authored multi-turn scenario pairs: misunderstanding repair, follow-up reference, abrupt topic change, correction, contradiction, ambiguous pronouns, privacy, injection in past dialogue, factual uncertainty, algebraic composition, and open explanation. Run pinned model settings and model checksum with baseline-v30 versus v31 randomized ordering, store actual response and timing provenance with privacy-safe artifacts; obtain two blinded human scores per answer for relevance, truth, naturalness and justified uncertainty. Veto on any increase in unsafe confabulation or false rejection. The mutation campaign does not replace this evidence.

Forbidden claims: fixed threshold for intelligence emergence; 10k model calls from synthetic input test; lexical matching proves real-world truth; a green browser geometry test establishes aesthetics; unverified improvement of real Qwen on diverse human queries; production-grade product maturity from CI alone.
