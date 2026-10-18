# Teddy v32 - grounded cognitive microkernel and 100 genuine-session experiment

Base of branch: main 4e81bf1ae12deb15fc5826b38b93bd8683b97ab3 (merged PR #45).
The assistant's own container could not clone GitHub because its DNS resolver could not resolve github.com. The GitHub Actions runner performs a real checkout, provisions checksum-pinned Qwen GGUF, starts Teddy's actual Node HTTP application, and conducts the sessions.

## Diagnosis
Prior V31 has typed topic/focus links but little real symbolic inference. Free-form Qwen3-0.6B remains fragile for multi-hop reasoning, topic drift, replies to corrections and factuality. Massive input mutations from prior PRs validate a narrow contract and are not independent evidence of response relevance.

## Literature-grounded strategy (inspiration, not certification)
- CORAL (NAACL Findings 2025): https://aclanthology.org/2025.findings-naacl.72/ — topic shifts, conversational retrieval and citation labeling.
- mtRAG (TACL 2025): https://aclanthology.org/2025.tacl-1.36/ — 110 human-authored multi-turn conversations; difficult later turns and unanswerable questions.
- LongMemEval (ICLR 2025): https://mlanthology.org/iclr/2025/wu2025iclr-longmemeval/ — indexing, retrieval and reading; temporal changes and abstention.
- ToRA (ICLR 2024): https://proceedings.iclr.cc/paper_files/paper/2024/hash/d3cf1559a8795eb1ed2b3ad52409ac7d-Abstract-Conference.html — model/tool complementarities for analytical reasoning. Not evidence this Teddy module inherits ToRA's model scores.
- Entrospect (ACL Findings 2025): https://aclanthology.org/2025.findings-acl.1261/ — generic self-reflection in SLMs can fail; favour independent, testable computation over unconstrained second-model critique.
- ProgCo (ACL 2025): https://aclanthology.org/2025.acl-short.73/ — program-supported verification, motivating narrow deterministic contracts with explicit input language.

## Implemented, narrow new capacity
V32 is not a new conscious cognitive agent. It is a finite, provenance-aware skill:
1. Extract ONLY syntax-marked premises in user messages (never assistant instructions). Max 24 facts, 24 Horn implications, 6 iterative passes and 48 reachable terms.
2. Treat all input premises as hypotheticals. On queries explicitly asking whether a proposition follows, return conditional entailment, non-entailment or contradiction. NEVER infer that user premises are truths about the world.
3. Solve strictly bounded two-integer arithmetic with BigInt, without eval or arbitrary tool execution.
4. Route results through the same semantic plan, normal HTTP API, SQLite atomic receipt and idempotent replay. No dashboard that pretends to be a mind, no hidden cloud provider.
5. Preserve Qwen for broad knowledge questions and natural conversation. Future extensions might add a session-scoped, time-aware evidence ledger, graph retrieval, explicit question target and independently validated tool calls.

## Genuine 100-session protocol
In .github/workflows/cognitive-reasoning-v32.yml the real-hundred job, AFTER unit/fuzz gates, uses the genuine pinned model installer and Teddy's real Node HTTP endpoint. It conducts 100 separate SQLite conversation IDs and at least 100 genuine model generations, with 40 real context-model followups/repairs, and additional exact arithmetic/name/identity checks. It checks distinct session IDs, actual provider path, complete user/assistant message pairs and semantic receipts. It writes complete results to readback-100.json (all questions are synthetic). Bounded, representative responses and failures are posted in PR comments for forensic review; raw synthetic report is an artifact. Existing real Chromium 30-session suite remains an independent UI gate.

The 10,000 seeded compositional tests are structured program-input tests, NOT 10,000 real Qwen generations. The 100 real sessions are HTTP, NOT 100 separately rendered browser screenshots. The prior 30-session browser workflow tests screenshots, typography and the actual text.

## Quality gates and honest limits
All generated replies remain untrusted. Lexical review flags cannot establish semantic correctness. A green CI status certifies only the tested path, not perceived cuteness, novelty of emergent intelligence, external factuality, general-purpose theorem proving, reliable provider independence or a clinically safe companion. No established universal minimum complexity for cognitive emergence exists. Unconditional promotion to main is prohibited until green CI and human assessment of reply samples; report residual limitations as evidence debt.
