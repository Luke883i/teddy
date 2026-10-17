# Teddy v29 — complete text response contract, not promises of omniscience

## User-visible defects
1. A right-edge comic box floats too far from Teddy and ignores whether its message is short or long.
2. The old web client displays deterministic responses synchronously; on the same input the local LLM can take seconds. Perceived dialogue is inconsistent.
3. Social replies select a hash-based phrase without checking recently delivered wording; Qwen3 0.6B receives 112/160 token ceilings and identical prompt structure even for abstract reasoning.

## Reticular design (screened 1,000 structural candidates)
Screen axes: 10 anchoring policies x 10 pacing policies x 10 language policies. Constraints: no extra model, native offline, no fake words or streaming, bounded wait, Teddy-centered horizontal clearance, deep prompts to the existing local model, no renderer dependency. Winner: side-anchored comic + bounded wait to finish actual HTTP + deterministic low-authority social responses and tiered Qwen. Script `tools/screen-v29.mjs`; these are architectural constraints, not evaluations of 1000 real Qwen conversations.

## New runtime
- `web/dialogue-pacing-v29.js`: comic width rises with message length, remains inside the viewport, stays just right of Teddy's center at >=900px; the height and full-text escape route are bounded.
- `web/text-chat-v17.js`: on EVERY submission, show a distinct **thinking** state with no invented answer; the text remains empty until the real HTTP response and a very short minimum thinking window (180–350ms) are complete. Abort/error removes this state; slow real Qwen is never delayed further.
- `server/lib/semantic-adaptation-v29.mjs`: compare each deterministic phrase against prior real assistant turns and prefer a different safe variant; plan depth 0/1/2 for an ordinary/analytic/abstract question and supply bounded local Qwen budgets 112/208/288 tokens. No silent escalation to cloud or larger model.
- `server/lib/semantic-spine.mjs`: preserve source/intent routing while emitting explicit depth and depth-aware directive. None of this establishes factual correctness or human-level abstract reasoning.

## DoD and falsifiers
| Gate | Evidence | Failure |
|---|---|---|
| G1 | width / height / position deterministic tests | clip, giant overlay, Teddy-center intrusion |
| G2 | realtime Chrome desktop/mobile screenshot + bubble dimensions | cartoon stays screen-edge or blocks central scene |
| G3 | UI shows thinking for local rules AND local model | instantaneous rule reply without pending state, manufactured answer |
| G4 | cancellation/failure while pending | ghost bubble, stale final response |
| G5 | CSS reduced-motion policy, readable font, long-text route | inaccessible or clipped answer |
| G6 | novelty compare with prior real assistant phrases | immediate identical template when alternatives exist |
| G7 | real llama.cpp request settings after plan | absurd 112-token abstraction or hidden thinking |
| G8 | 1,000 structural candidates + 1,000,000 adversarial pure state mutations | unsafe or unbounded policy |
| G9 | full Node, SQLite, browser, authentic GGUF workflows on PR final HEAD | regression |
| G10 | repeated real Qwen conversation/human review | unnatural/factual low-quality answers **remain open until proven** |

Be precise: this is a prototype maturity change, not a certification that a 0.6B model can sustain *any* abstract discussion. The selection policy is not a fine-tune of weights. Physics and animation remain outside scope.
