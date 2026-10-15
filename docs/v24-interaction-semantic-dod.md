# Teddy V24: interaction-first semantic control contract (Step 0 + Step 1)

**Simplified summary:** Step 0 captures the conversation safely; Step 1 deterministically decides whether a fixed safe social response suffices, otherwise requests an actual answer from the small local language model. Spoken dialogue (Step 2) is explicitly excluded.

## Source truth and diagnosis
Baseline main f7598638. The v17–v21 product establishes local GGUF, text HTTP, SQLite, history UI, comic balloon and explicit OpenAI as an alternative. Existing Qwen3-0.6B Q4_K_M is memory-efficient but is not a reliable owner of identity, memory attribution, routing, or evidential authority. Prior `buildLocalMessages` uses a single personality prompt and only eight previous turns; `/api/text/turn` filters a global top-500 history by client-supplied conversation ID. Neither is a deterministic semantic cycle.

iKant principles sampled (not imported): provenance != truth; retrieval changes access, not authority; Surface A output is separate from cognition; sealed delivery has receipts; uncertainty/claim-conflict cannot be silently laundered. No iKant runtime, proprietary identity, ontology, or claims of consciousness are brought into Teddy.

## 1000 design candidates (10 x 10 x 10 grid; screening rather than 1000 physical model sessions)
Axes: (routing: strict rules, scores, classifiers, embeddings, model, retrieval, chains, tools, hybrid, free text) × (state: stateless, last turn, session, global, vector, summarised, ledger, event log, graph, scope-bounded SQLite) × (delivery: free reply, canned, full generative, rules, critique, verifier, template, streaming, LLM+receipt, hybrid output).
Hard filters: fully offline after provision; no extra model download; no invented authority; can explain routing; nonblocking; low CPU/RAM; safe after restart; no auto-persistent sensitive memory; existing HTTP/SQLite integration; actual user-visible output. Select **strict deterministic social micro-intents + scoped conversation memory + Qwen for open questions + receipt**. Numeric enumeration is architecture search, not quantitative proof of model quality.

## Canonical physical chain
Browser real human message -> `POST /api/text/turn` -> type/length validation -> ensure conversation identity -> scoped last 12 turns -> `planSemanticTurn` -> deterministic micro-intent OR selected provider (local llama.cpp / opt-in OpenAI) -> `finalizeSemanticReply` -> SQLite atomically persist both turns and provenance receipt -> HTTP response including semantic mode/act -> actual browser history/balloon -> next user message.

- The rules do not assert facts about the world. Identity, greetings, compliments and explicit local self-introduction/name recall are **conversation-social** assertions; all other requests use a real language model.
- No ungrounded story, fake observation, fabricated model answer or silent provider switch.
- Pseudo-generation means deterministic hash-based choice among a small bounded family of native Teddy phrases. Hashing does not confer epistemic authority.
- Model-generated text is always labelled `path=model` in the receipt, not proof or verification.
- Persona: mildly unpleasant, concise, enjoys praise, adult vocabulary and selective abstract metaphor; never humiliates the user.
- Context is local conversation-scoped, not global and not a user-controlled system prompt. Old conversation data is untrusted, not instructions.
- If the model fails there is an actual error, not a simulated answer. DB commit is all-or-nothing.
- Every receipt contains input/output digests and mode but no raw chat text; the raw conversation already persists in the existing local SQLite with its own access control.

## Falsifiers / DoD
S0 same-context deterministic plan and bounded cardinality; S1 no fake answer on unclassified user query; S2 no global history leakage; S3 corrupted/foreign conversation ID rejected; S4 two turns and receipt committed atomically; S5 follow-up sees own prior exchange; S6 reply in real browser balloon is exact persisted reply; S7 no dependency on voice/GPU; S8 offline genuine GGUF path untouched; S9 local/openai choice explicit; S10 no raw text in provenance receipt; S11 1M adversarial structural plan mutations + Node unit/e2e; S12 dedicated UI and runtime CI green on final SHA.

**Open limits:** large-scale semantic correctness (truth/factuality), 1000 genuine model trials, hardware air-gap physical test, and naturalness ratings require separate real evidence. Do not claim these from a deterministic unit test.
