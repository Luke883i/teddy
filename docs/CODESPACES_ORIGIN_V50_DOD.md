# V50 — Codespaces exact-origin CSRF repair for written conversation

**Incident (2026-11-23, user-supplied runtime diagnostic):** browser at a GitHub Codespaces forwarding URL `https://<workspace>-8787.app.github.dev` (anonymized from the user diagnostic), `configuredPublicOrigin:null`, Qwen GGUF and llama-runtime verified, `textReady:true`, with `POST /api/text/turn` and `PUT /api/provider` denied `403 origin_not_allowed`. This is **not** a Qwen inference failure or an upstream Vireonix response.

## A0 and backward AND-DoD

**Outcome D0:** Teddy can respond to a typed message and switch to Vireonix from the same trusted Codespaces page without an Origin false-positive, while another origin remains unauthorized. D0 = D1 AND D2 AND D3 AND D4 AND D5.

| DoD | Observable oracle | Negative falsifier | Evidence boundary |
|---|---|---|---|
| D1 Page/bootstrap | First-party browser sends exact `window.location.origin` in `X-Teddy-Page-Origin`, and GET `/api/bootstrap` returns an origin-specific token | Missing/malformed/port-shifted claim, cross-site or non-fetch metadata cannot mint a scoped token | Source and Node HTTP; full browser requires real Codespaces deploy |
| D2 Security | An HMAC-SHA256 token from a 256-bit process secret is tied to the exact normalized HTTPS Codespaces Origin, same forwarded port and fetch metadata, not stale `CODESPACE_NAME` | Copied global token, other Codespaces, wrong port/suffix, wrong token, cross-site, navigate, wrong Host rejected | Real security module plus adversarial negative matrix |
| D3 Product paths | Same page can `POST /api/text/turn` on local and `PUT /api/provider` to Vireonix; SQLite receipts and provider persist | Unproven request gets 403; no provider change, no turn or fake reply | Real Node HTTP + SQLite, model paths explicitly mocked |
| D4 Compatibility | Direct loopback, exact-name Codespaces, authenticated Render/proxy security and token-rotation recovery continue to work | Existing v38/v41/v42 tests regress | Target-native test suites Node24; no disabling auth, CSP or CSRF |
| D5 Delivery | GitHub branch/HEAD readback, Node24 target checks and review; actual Codespaces page is refreshed on deployed source | Checkpoint only in lab, stale deployed process, protected CI failure | Runtime deployment and final owner acceptance remain EXTERNAL |

## Minimal change / security model

The prior v42 logic required `CODESPACE_NAME` to match the current forwarded browser alias when consuming a **global** CSRF token. When a Codespace is renamed/recreated or a stale server process has an old name, both chat and provider switching can fail before model dispatch. This is one falsifiable cause, **not proof** that the live process has this exact mismatch: the diagnostic exposes the browser Origin but not the server-side fetch headers or `CODESPACE_NAME`.

V50 retains the strict global-token path unchanged. In addition, the existing same-origin bootstrap sends `X-Teddy-Page-Origin`; if it is a syntactically valid `https://<codespace>-<same-port>.app.github.dev` URL and the GET has `same-origin/cors/empty` metadata, Node derives a *distinct* CSRF token via HMAC of the per-process 256-bit secret and that exact origin. A mutation must present its precise Origin, the correct bound token, and matching browser Fetch Metadata. A token issued for another origin or the legacy global token cannot use the alias recovery branch. This is NOT a wildcard or CORS permission; it relies on browser SOP, and does not make public Codespaces forwarded ports authenticated. Operators must keep forwarding private or explicitly enable auth.

No `X-Forwarded-*` header is treated as a trust root. No changes to the model, database schema, visual renderer, global memory, provider selection semantics, or audio. On restart, the existing single-retry CSRF recovery re-fetches a *new origin-bound* token with the original requestId unchanged. Rollback is a single revert of the V50 commit.

## Commands / expected counterexamples

`node --test tests/codespaces-origin-v50.test.mjs tests/codespaces-http-v50.test.mjs` proves direct security, HTTP + SQLite, and client request identity. Run the existing v38/v41/v42, Render and end-user gates; also run the Chrome `tools/browser-codespaces-v43.mjs` target-owned smoke. Physical mutants: remove the bound proof (D2 must fail); ignore signed token (foreign/incorrect token must fail); remove the UI bootstrap claim (D1 must fail). Keep the expected negative oracles separate from the implementation under test.

**External edge:** The user must refresh the actual Codespaces page after the fix is deployed and see `ciao` HTTP 200 plus an explicit Vireonix switch HTTP 200. A green workflow alone does not prove live deployment or natural Italian dialogue with authentic Qwen/Vireonix.
