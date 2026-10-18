# Teddy v34 — lessico e semantica: audit runtime (18 ottobre 2026)

Baseline: `main` 9bb167c35481815d11366db16abf8f5a77a96710. The uploaded ZIP was extracted and a real Node/SQLite Teddy instance started in the evaluation container. The official package requests Node 24; this restricted container provided Node 22 and no installed GGUF.

## Experimental readback

| Signal | Baseline | v34 local replay |
|---|---:|---:|
| Real HTTP requests, four-turn sessions | 1,000 | 1,000 |
| Distinct conversations | 250 | 250 |
| HTTP successes | 813 | 876 |
| Expected 503 local_text_not_ready | 187 | 124 |
| Narrow dictionary markers of formulaic metaphors | 77 | 0 |
| Narrow markers of awkward/condescending register | 16 | 0 |
| Frequency of dominant identity wording (125 identity turns) | 69 | 26 |
| Original smoke-oracle unexpected cases | 0 | 0 |

**These are observed, narrow automated counts**. Zero formulaic markers is NOT a human-certified tone or semantic-adequacy score. The 124 open turns remain model-unavailable: no Qwen generation was performed in this local run. A response with lexical overlap can still be factually false.

## Root causes and fixes

1. **Lexical appropriateness.** Gratitude, greeting, self-identification and farewell were often overloaded with repetitive metaphors that did not advance the conversation. Replaced the adult social dictionary with short concrete Italian, preserving mild burbero playfulness without contempt or excessive self-praise.
2. **Undesirable seed concentration.** New conversations without an ID used the same 'new' seed, making one presentation recur 69/125 times. Use the supplied `requestId` as first-turn variation seed. Repeated identical requests retain the exact committed response under v30 replay.
3. **Contextual relevance.** `non ho capito` after a verified arithmetic exchange previously required Qwen even though the deterministic interpreter could re-explain the calculation. The v34 verifier checks both the previous user question and the persisted assistant answer before producing a concise operator explanation; unverified contexts still use the genuine LLM.
4. **Epistemic-temporal correctness.** A withdrawn hypothetical premise cannot support conclusions, but a later reassertion can. Current-turn reset clears prior problem history, without rewriting decimal numbers or URLs in ordinary unaffected messages.
5. **Readback provenance.** Lexical signals are stored as bounded, non-text metadata in the existing semantic receipt. They are explicitly `lexical_only_not_semantic_truth`; they do not pretend to prove correctness.

## Reproducibility and residual debt

- 1,000 real HTTP requests before and after; 250 isolated SQLite conversations each.
- 1,000 synthetic lexical/illocutionary mutations across five speech acts, 1,000 operator clarification mutations. Earlier local staging included 1,000 temporal metamorphic cases. These are NOT 1,000 real Qwen sessions or 1,000 AST mutants.
- Unit tests cover first-turn variety, exact idempotent replay, prior answer attestation, lexical gate scope, supersession semantics and untouched text.
- Open question factual correctness, Italian idiom in **actual Qwen text**, user-perceived naturalness, avatar/voice synchronization and fluency ratings are still unverified by this local run. Real-model and browser CI remain independent gates.

## Literature

- [Occhipinti et al., ACL 2025](https://aclanthology.org/2025.acl-long.879/): persona consistency alone is not listener adaptation.
- [Chen et al., EMNLP 2025](https://aclanthology.org/2025.findings-emnlp.1098/): naturalness can benefit when relevance precedes persona refinement (v34 is a lightweight directive, not a trained PPA implementation).
- [Rosenthal et al., ACL 2026 MTRAG-UN](https://aclanthology.org/2026.findings-acl.503/): unanswerable, underspecified, non-standalone and unclear turns require different controls.
- [Wu et al., ICLR 2025 LongMemEval](https://mlanthology.org/iclr/2025/wu2025iclr-longmemeval/): memory updates and abstention need independent evaluations.
- [Kim et al., SIGDIAL 2025 TD-EVAL](https://aclanthology.org/2025.sigdial-1.7/): turn-specific and whole-dialogue evaluation must be combined. Lexical overlap is not a truth oracle.

**No model weights were fine-tuned.** The patch is runtime linguistic tuning plus a narrowly verified deterministic inference skill.
