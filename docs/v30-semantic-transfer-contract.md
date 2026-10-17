# Teddy v30 — semantic pre-PR to verified runtime PR: reconciliation ledger

**Base:** main merge commit 7d8886c7312fcd92fcbc452ffea98e7696249c87, containing PR #43. No separate importable "pre-PR" artifact was found among the conversation's Project files or GitHub open branches. This ledger therefore uses the complete **10 obligations explicitly present** in `docs/v29-comic-language-dod.md` and the written-chat interaction objective as the auditable source set. It does NOT claim to have imported an unidentified or unprovided document.

## Deterministic transfer invariants
T1: All 10 PR43 acceptance gates remain in main and are not deleted or bypassed.
T2: New runtime code changes are backward-compatible with existing text clients, existing v2 SQLite data, existing local Qwen and explicit OpenAI provider routing.
T3: Every new text form submission uses a random UUIDv4 request ID. Retry keeps the same UUID for identical text and original conversation; changing the text or changing conversation produces a new UUID.
T4: SQLite atomically stores the human message, authentic Teddy reply, semantic receipt and UUID journal. The journal stores a SHA-256 digest, not raw human text.
T5: Repeating an already committed UUID returns **the actual saved reply**, no model call, no duplicated turns, even after server restart or while a new model call is in flight.
T6: Reusing a UUID for altered text or a different *requested* conversation returns HTTP 409; invalid UUID returns 400. Ended or nonexistent sessions cannot be used for a new message.
T7: Open questions still route to real Qwen when ready, or to the deliberately selected OpenAI backend. Deterministic social replies never masquerade as a model evaluation.
T8: The browser continues to render the exact HTTP `body.reply` in the comic and persistent history; on a lost response, user may re-send the **unchanged** message to recover it. Errors never show fabricated text.
T9: Existing PR43 geometry, typography, timing, novel social expressions, accessibility, no-voice default, model integrity and negative UI checks remain regression gates.
T10: Tests independently verify SQLite rollback, replay after cold restart, HTTP 200/400/409 semantics, model boundary, 1M seeded UUID mutations and desktop Chromium. No test is permitted to call a mock model "real Qwen".

## Proof table
| Source obligation from PR #43 | Inherited evidence | v30 reinforcement | Meaning |
|---|---|---|---|
| G1 responsive geometry | `tests/v29-comic-language.test.mjs` | unchanged runtime code | no new layout regression |
| G2 genuine Chrome placement | `tools/browser-text-v17.mjs` | same browser E2E in CI | inspect screenshots, not a subjective beauty certificate |
| G3 actual thinking pending state | `web/text-chat-v17.js` | request-ID transport in same submit | pending must not fake words |
| G4 cancellation / error | `tests/v29-comic-language.test.mjs` | retry identical UUID and durable replay | recovering a lost completion |
| G5 full-text accessibility | `tests/chat-layout-v21.test.mjs` | no comic markup/CSS changed | no truncation or lost answer |
| G6 deterministic novelty | `server/lib/semantic-adaptation-v29.mjs` | no social-plan rewrites | retain evidence-aware social path |
| G7 real llama budget | `tests/v29-comic-language.test.mjs` | replay **before** inference | only one generation per committed UUID |
| G8 1000 structural + 1M mutations | `tools/screen-v29.mjs`, `tools/mutate-v29.mjs` | `tools/mutate-replay-v30.mjs` | distinct mutation families |
| G9 Node / SQLite / Chrome / true Qwen CI | inherited workflows | `text-recovery-v30.yml` | do not weaken gate set |
| G10 human-rated conversational quality | documented open debt | no fabricated quality claims | remains an explicitly OPEN subjective/semantic gate |

**Migration** from v2 to v3 adds a `text_requests` table and does not rewrite legacy conversations or receipts. Old API clients without request ID still work but do not get exactly-once semantics. HTTP request replay is recovery of a committed result; it is **not** a promise that a disconnected client can retrieve an uncommitted LLM generation, nor an exactly-once guarantee across an unverified external backend side effect.

### Status boundary
"100% travaso" can be certified **for the 10 enumerated acceptance obligations as mapped**, not for an unspecified external artifact or a universal product-quality guarantee. The runtime DoD requires green CI on the final commit. The user still decides whether Teddy is sufficiently cute, fluent and useful in real conversations.
