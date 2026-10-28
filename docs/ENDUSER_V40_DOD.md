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

## v41 runtime forensic closure — two separate error boundaries

**Observed from user evidence:** `origin_not_allowed` is a Teddy HTTP/Origin control-plane denial. It is not evidence that Qwen failed inference or that the external Vireonix service failed. In one container reproduction with actual Teddy HTTP+SQLite, an untrusted page Origin returned **403** for `ciao`, while the same request with an authorized HTTPS Origin returned **200** and two committed turns. This used a local model mock, not authentic GGUF.

**Observed from GitHub Actions:** An initial real, non-mocked, end-to-end hosted Teddy→Vireonix request returned `vireonix_http_error`; a later end-to-end run completed successfully. These are distinct upstream outcomes: the API can work, but no per-turn reliability or SLA claim follows. The old adapter collapsed upstream 400/5xx into public 502 and lost the original HTTP status, obstructing diagnosis.

### Minimal backward-derived closure

1. **E0 trusted ingress:** Host allowlist + strong Basic authentication + browser fetch metadata `same-origin/cors/empty`; never permit a cross-site request or opaque Origin.
2. **E1 TLS proxy reconciliation:** A process-scoped cryptographic CSRF capability, issued only by authenticated `GET /api/bootstrap`, can authorize a same-origin browser fetch even if a trusted reverse proxy rewrites the HTTP Host. Neither an Origin wildcard nor a forwarded Host header is used as authorization. A foreign Origin without the capability remains 403; cross-site always remains 403.
3. **E2 client resilience:** All browser mutations attach the capability. On an `origin_not_allowed` response following a restart, the browser refreshes it from its own authenticated bootstrap, then retries at most **once**, with precisely the same request body/requestId. Abort prevents replay; unchanged tokens and unrelated errors are never retried.
4. **E3 generation truth:** `local` still means genuine managed Qwen when mock is disabled; `vireonix` still means fixed HTTPS to the free `auto` provider. No silent provider fallback, no global saved-memory disclosure in the Vireonix adapter.
5. **E4 bounded upstream failure:** Vireonix HTTP 4xx/429/5xx codes are distinguished, an `upstreamStatus` is returned only when present, and **one** retry for 5xx uses a shared 28-second budget with short delay. Requests denied by schema, authentication or quota never consume automatic retries. A free service does not promise availability.
6. **E5 visible user truth:** The inline chat error identifies the failing provider and sanitized upstream HTTP status. No legacy voice popup and no invented Teddy message.
7. **E6 falsification:** `tests/dual-provider-proxy-v41.test.mjs` starts actual Teddy HTTP+SQLite with **labelled mock** upstream engines and proves both provider paths behind a proxy-Origin mismatch; `tests/csrf-recovery-v41.test.mjs` falsifies replay, cancellation and token rotation; `tests/vireonix-recovery-v41.test.mjs` falsifies upstream HTTP classes. One million seeded product-contract scenarios now include real CSRF guard checks. Genuine Qwen inference is independently exercised in `text-real-model-v20`. A genuine Vireonix full-route smoke is available through manually invoked `v41-live-language-diagnostic`.

### Evidence limitations and operational deployment

This container cannot download/execute the pinned 484 MB GGUF or reach `vireonix.ai` (DNS `EAI_AGAIN`). Local tests with Qwen mock are not real language-generation tests. GitHub Actions supports a different network and has produced at least one successful, genuine hosted Teddy→Vireonix turn; an earlier failure is preserved, not overwritten. Automated high-volume external API probing is explicitly disabled to respect free shared capacity.

The screenshots do not reveal the exact user's effective HTTPS Origin, reverse-proxy Host, or deployment revision. The post-merge operator must retest on the **exact user-facing domain**: open Diagnostics for `browserOrigin` and `configuredPublicOrigin`, then send `ciao`, a real Qwen open question, switch to Vireonix, and send a real remote question. An unresolved `403` should be correlated with Host/Origin and fetch metadata; never solve it with `Access-Control-Allow-Origin: *`, by dropping Basic authentication, or by accepting arbitrary forwarded headers.

### Provider quality status

Authentic response ≠ superior eloquence. A strict claim that Vireonix improves Italian fluency requires blinded matched multi-turn comparison (same user prompts and conversation premises, proper latency/error accounting), not one positive HTTP response.
