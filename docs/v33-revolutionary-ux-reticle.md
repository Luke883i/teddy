# Teddy v33: minimal transformation lattice / revolutionary UX DoD

Baseline: main e54ad677192b6924618d8c5043822e21e32b0238, merged PR #46 (2026-10-18). Separate branch for the PR. The assistant container could not git clone (github.com DNS unavailable); CI runners perform authenticated checkout and actual local GGUF and HTTP testing.

## AS-IS failures and smallest actionable lattice

A. **Semantic split brain** (supported by code): semantic-spine v32 classifies any "perché ..." after assistant history as a followup; v31 workspace correctly treats many complete why questions as autonomous. The model's goal must not change with irrelevant chat history.
B. **Temporal premise leakage** (supported by code): v32 forward chaining reads all explicit premises in the last 12 turns without modelling withdrawal or a deliberate new problem. Superseded premises may still entail obsolete results.
C. **Proof inflation**: PR46's 100 genuine GGUF sessions establish executable model+HTTP+SQLite but not subjective relevance. Existing millions of numeric mutants are not independent human experiences.
D. **Embodied credibility**: browser/pixel/movement tests already exist. Human aesthetic perception and synchronized emotional appropriateness are unclosed.

Minimum dependency graph:
- M0: canonical, bounded current-goal representation, with evidence authority and explicit referent -> M1.
- M1: scoped user premise ledger with reset and withdrawal -> M2.
- M2: one semantic-spine integration that keeps legacy rule/model paths and receipts -> M3.
- M3: 15,000 seeded independent metamorphic logical inputs and inherited regressions -> M4.
- M4: real Teddy HTTP with SQLite, actual pinned Qwen GGUF and 10,000 genuinely distinct local conversations (10k sessions, 20k deterministic user turns + separately 100 authentic Qwen sessions/140 generations) -> M5.
- M5: blinded human semantic and visual evaluation and measured performance/latency -> final product-quality claim.

Do not confuse 10k real deterministic HTTP conversations with 10k independent Qwen generations or 10k rendered browser sessions. The separate inherited genuine Chromium campaign remains mandatory for UI regression.

## Revolutionary as a FALSIFIABLE quality objective (not a claim)

Teddy makes it easier for a person to think and correct themselves, not just easier to obtain an answer. All six gates should hold together on held-out tests:
- R1 Relevance: >=90% of 300+ previously unseen multistep queries assessed as directly addressing the actual question by two blinded independent reviewers; zero systematic stale-topic replies.
- R2 Continuity/repair: >=95% explicit corrections and 90% repair requests correctly anchored without inventing missing context, on at least 100 mixed topic-switch scripts.
- R3 Epistemic calibration: >=95% refusal to derive an unsupported conclusion in scope-controlled synthetic logic, zero unauthorized promotion of assistant outputs to premises; knowledge questions need independent factual review.
- R4 Provenance: 100% of persistent receipts traceable to the actual conversation and actual provider; no replay doubling and no cross-session leakage in 10k sessions.
- R5 Responsive agency: p95 latency and user-visible truncation measured on genuine model and browser platforms; determine realistic hardware-specific baselines before setting threshold.
- R6 Perceptual integration: >=80% positive ratings for fitting animation / legibility / natural appearance among blinded users, zero critical articulation or clipping failures in targeted render recordings.

**Passing unit/CI can close only a subset. "Revolutionary" is not established until human-rated R1/R2/R6 and real performance R5 are measured.** No universal emergence critical mass in neural-symbolic architectures is validated.

## Scientific root and tradeoffs

- LongMemEval (Wu et al., ICLR 2025) isolates information extraction, multi-session reasoning, time-aware knowledge update and abstention: https://mlanthology.org/iclr/2025/wu2025iclr-longmemeval/
- Hybrid raw-memory plus explicitly extracted evidence can improve long-horizon retrieval but cost/results are architecture and model dependent (Redis research, June 2026): https://redis.github.io/redis-ai-research-public/longmemeval-agent-memory/
- A 2026 reproducibility report cautions against transferring vendor memory rankings across differing models/judges: https://redis.io/resources/agent-memory-benchmark-report/
- Bounded tool/verification and the need for per-task independent oracles can reduce SLM reasoning risk; unsupported generic self-reflection cannot certify answers.

The new V33 change is intentionally smaller than a general memory store or opaque cognitive planner: explicit goal, explicit temporal premise scope, and one controlled intervention in the actual semantic path. It does not read third-party files, execute untrusted arbitrary code, claim sentience, or create persistent hidden personal profiling.

## Verification ledger

15k mutants: five separate semantic input families with independent expectations for full standalone WHY, elliptical WHY, revoked fact, new problem, integer arithmetic; no actual AST mutations counted by this script. The existing v31 source mutation script provides a separate smaller targeted source mutation score.

10k conversations: using a real Node HTTP server booted with the actual pinned Qwen local model; each isolated session sends 2 deterministic user turns, with request id/replay identity and sampled matching SQLite receipt/readback. Families: exact math, declared name/recall, social identity/gratitude, divide-by-zero/next calculation, greeting/clarify missing antecedent. **Zero Qwen calls in this 10k deterministic loop**; the same proof independently requires v32's 100 real Qwen sessions (140 model calls). Artifacts preserve shape, latency sample and failures, not private human conversations.

Risks left: model relevance to non-template questions, knowledge freshness, broad topic update, unconscious context bleed, natural voice+avatar movement and real human UX studies. These remain OPEN, irrespective of green CI.
