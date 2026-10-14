# Teddy v21 — Chat UX DoD and falsification registry

Scope is **written conversation UI and truthful model-install details only**. Rendering and movement logic are unchanged.

## As-is forensic defects (14 October 2026)
- The previous `#chatPanel` mixed message transcript, user input and status in one center-bottom overlay. Height increased with replies and obscured Teddy.
- The ready state showed `locale · pronto` while hiding `#installPanel`, so users could not retrieve checksum, model provenance, installation stage or self-test.
- Replies were visible only as transcript messages, with no separate immediately readable comic response attached visually to Teddy.
- Older UI history showed a capped subset (`limit=160`) through a separate drawer, duplicating the chat's transcript and hiding it when closed.

## 10 families of UI/UX obligations

1. **Identity**: no simulated reply in production; balloon derives exclusively from a server-committed response or a selected persisted turn.
2. **Input**: composer's only primary action is real submit; busy state gives cancel; offline/unready disables request.
3. **Output**: latest reply is escaped with `textContent`, readable and dismissible; historical assistant replies can reopen it.
4. **History**: full chronological SQLite cursor pagination (`before`), stable turn IDs, no fabricated records, no duplicate IDs.
5. **Center-stage**: on widths >=900px, dock and balloon remain in left/right sidebands leaving >=30% central corridor.
6. **Reflow**: at widths below 900px history begins closed; button opens and closes the dock; no horizontal clipping of input/balloon.
7. **Readiness**: `textReady`, not voice readiness, enables typed conversation; server availability is not LLM readiness.
8. **Provenance**: model details are recoverable even after ready and after reboot; existing GGUF rehashed on cold start.
9. **Interaction**: each opened surface closes via explicit button or Escape; foreground controls have Escape precedence and return focus.
10. **Accessibility**: semantic landmarks, labeled controls, proper `aria-expanded`/`aria-controls`, visible focus, reduced motion, WCAG 2.2 reflow/keyboard intent.

## Verification matrix
| Gate | Required proof | Falsifier |
|---|---|---|
| U01 | `tests/chat-layout-v21.test.mjs` | input width or center corridor outside bounds |
| U02 | `tools/mutate-chat-layout-v21.mjs` 10,000,000 seeded cases | a single geometry or responsive policy assertion fails |
| U03 | `tests/chat-history-v21.test.mjs` 1,207 actual SQLite turns | any missing/repeated cursor page |
| U04 | real Chromium /api/text/turn smoke | mock UI text without HTTP response/persisted turns |
| U05 | real Chromium desktop at 1180×760 | transcript in composer, center occlusion or unclipped balloon failure |
| U06 | real Chromium mobile at 390×844 | history starts open, button unreachable or overflow |
| U07 | model details reopened/closed after ready | `locale · pronto` has no effective control |
| U08 | `npm test` + inherited regression CI | any broken production contract |
| U09 | authentic Qwen GGUF runtime workflow | actual model boot and response failing after restart |
| U10 | screenshot review on target user's machine | subjective legibility and exact Teddy overlap are not assertable from pure CSS |

Mutation count is contract-level stress, **not** ten million browser screenshots, user conversations or visual evaluations. Images and genuine local-model self-tests are separate evidence.

References: W3C WAI-ARIA Disclosure Pattern, WCAG 2.2 Focus Not Obscured, Reflow and Focus Visible.
