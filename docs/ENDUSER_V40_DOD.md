# Teddy v40 — semantic end-user closure, 28 October 2026

## Provenance and epistemic boundary

Root inputs: two user screenshots and runtime diagnostic from 28 October 2026. The image showing `403 origin_not_allowed` refers to **switching toward Vireonix**, not proof that local Qwen returned 403. In that image the selector has reverted to Qwen and wrongly displays a persistent remote-switch error next to it. In the other image, a legacy *voice* error popup covers the input while the text-only chat and the empty expanded history are visible. Local Qwen's manifest, readiness and self-test are positive controls, not proof that actual browser text -> HTTP -> SQLite -> balloon succeeded. All assertions below preserve this separation.

## End-user DoD (backward derived)

**E6, final:** A person can type a greeting or open question; see an authentic, confirmed and persisted answer in a comic bubble; select a provider with an accurate identity; or see an attributable, non-vocal, non-blocking error; with legible unobstructed controls and opt-in history.

- **E5, visibility:** A successful turn is rendered in `#teddyBubbleText`; failures are a distinct `#chatFeedback`, never fabricated Teddy speech, never the obsolete voice popup.
- **E4, conversation truth:** The HTTP `/api/text/turn` response has a nonempty `reply`, stable `conversationId`, matching `requestId`, and SQLite receipt before a balloon is shown. `ciao` must work through the deterministic path even when no LLM inference occurs.
- **E3, provider truth:** A failed Vireonix switch explicitly names **Vireonix as attempted** and **Qwen as still active**; the selector cannot imply a committed switch. A successful switch is persisted before activation.
- **E2, security:** Authenticate hosted mutations and accept only explicitly trusted page origins. Unknown origins and hosts remain blocked. The specific failing production origin is **not exposed in screenshots**; no blanket CSRF/CORS bypass is justified.
- **E1, presentation:** History closed on first load; distinct full-width error line; dedicated model selection; footer survives small viewports; text mode cannot display an obsolete voice popup.
- **E0, evidence:** A seeded deterministic campaign checks one million product-state variants, including 125,000 executions of the real HTTP security guard and 15,625 calls to the real semantic planner. Separate CI tests start a real Node/SQLite service and a genuine Chromium UI. A million variants are **not** a million real chats, screenshots or LLM generations.

## Minimal semantic dependency lattice

```
E6 END-USER RELIABLE DIALOGUE
  +-- E5 VISIBLE BUBBLE / VISIBLE TEXT ERROR
  |     +-- E4 HTTP outcome, request replay, SQLite and semantic receipt
  |     +-- E1 non-obstructive UI, opt-in history, full-width feedback
  +-- E3 HUMAN PROVIDER CONTROL
  |     +-- E2 strict hostname/origin/auth checks
  |     +-- provider persistence then activation; accurate rollback
  +-- E0 evidence gates (real browser + real HTTP + 1m seeded mutations)
```

This is the smallest closure consistent with the evidence. It does **not** require replacing Qwen, changing the character mesh, installing audio, creating a new cognitive bus or disabling authentication.

## What this slice changes

1. `web/enduser-contract-v40.js` isolates provider attribution, text error wording and fail-closed visible completion.
2. `web/text-chat-v17.js` reports provider switch failures in a dedicated inline region, preserves the actual selected provider and never ascribes a failed Vireonix switch to Qwen.
3. `web/app.js` routes all text-mode problems away from obsolete voice popups. Diagnostics expose page origin and configured public origin (no password or API key).
4. `web/chat-layout-v21.js`, `web/index.html` and `web/styles.css` keep empty history closed and separate the provider selector, status and error text.
5. Tests falsify hostile request origin, correct hosted origin, missing completion, replay, SQLite persistence, provider switch and browser-rendered balloon.

## How to reproduce evidence

```sh
node --test tests/enduser-v40.test.mjs tests/enduser-http-v40.test.mjs
node tools/mutate-enduser-v40.mjs
node tools/browser-text-v17.mjs --probe-chat
node tools/browser-text-v17.mjs --probe-provider-switch
```

On the 2026-10-19 *older uploaded archive*, the first mutation run exposed 375,000 text/voice contract violations; after the local candidate change, zero scoped survivors in 1,000,000 cases. The archive is **not** the GitHub v40 branch; GitHub CI is the authority for branch integration. Do not treat scenario totals as empirical failure probabilities.

### Residual deployment blocker

The user's actual `403 origin_not_allowed` cannot be declared repaired without the exact `window.location.origin` and server's `TEDDY_PUBLIC_ORIGIN`. The Diagnostics page now exposes both non-secret values. If the user employs an additional HTTPS custom or preview domain, the operator must configure **`TEDDY_ALLOWED_HOSTS`** for the admitted Host and **`TEDDY_ALLOWED_ORIGINS`** for the admitted page origin; do not accept attacker-supplied forwarding headers or use wildcards. Hosted Basic authentication and origin checks remain mandatory.

### What is not proved

A Qwen readiness self-test does not validate real-world Italian fluency. A deterministic greeting does not query Qwen or Vireonix. The PR51 upstream connectivity probe is one real Vireonix request, not a reliability distribution or superiority benchmark. The v40 campaign does not independently validate the user's deployed browser until that deployment and its Origin configuration are retested.
