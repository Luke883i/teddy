# v42 — GitHub Codespaces loopback proxy Origin repair

## Incident evidence (29 October 2026, end-user diagnostics)

The user-facing page has:

- `browserOrigin = https://fearful-poltergeist-7gxv5959w9g2rx64-8787.app.github.dev`
- `configuredPublicOrigin = null`
- `lastProblem = {error:"origin_not_allowed",status:403,kind:"text",provider:"local"}`
- Local Qwen GGUF and llama-runtime are SHA-verified and an authentic local self-test completed successfully. This supports **readiness**, not successful browser inference.

Two user errors share the same HTTP security guard: `POST /api/text/turn` on Qwen and `PUT /api/provider` when choosing Vireonix. The guard previously allowed only a direct HTTP loopback Origin in local mode; a GitHub Codespaces HTTPS forwarded Origin was always rejected before either model was contacted. This is a concrete **missing local-proxy trust edge**, not a reason to reinstall the GGUF or disable CSRF.

## Minimal end-user DoD, derived backward

**Final: user sends a message, receives a persisted Teddy reply in the balloon, and can explicitly select Vireonix** when the free upstream is available.

1. `GET /api/bootstrap` succeeds from the same Codespaces page and returns a per-process random CSRF token. No public Origin configuration is necessary for local loopback mode.
2. A browser `fetch` with `Origin=https://<exact-codespace>-<exact-TEDDY_PORT>.app.github.dev`, its own bootstrap token, and real same-origin `Sec-Fetch-*` headers can mutate the loopback Teddy endpoint.
3. An untrusted origin, mismatched forwarded port, unrelated Codespace, malformed hostname, missing/wrong token, cross-site fetch or navigation remains denied.
4. Real Teddy Node HTTP/SQLite test: `ciao` deterministic reply, explicit local-model route (marked mock), explicit Vireonix route (marked mock), historical receipt and persisted provider selection; no fictitious LLM answer.
5. The standard localhost browser and hosted Render security tests must continue to pass.

## Chosen contract

`codespacesForwardedOrigin(origin,{listenPort,codespaceName})` recognizes only the exact `https://<codespace>-<port>.app.github.dev` shape, requires matching listener port and matches `CODESPACE_NAME` if set. The existing Host allowlist still requires an actual loopback Host in local mode. A mutation request additionally needs all of:

- `Sec-Fetch-Site: same-origin`, `Sec-Fetch-Mode: cors`, `Sec-Fetch-Dest: empty`;
- the unguessable `X-Teddy-CSRF` from Teddy's same-origin bootstrap;
- exact GitHub forwarding domain and listener port.

No CORS wildcard, public binding change, HTTP Origin broad trust, manual remote account, or leaked model memory is introduced. This is a **development environment-specific bridge**, not a blanket exception for arbitrary reverse proxies.

## Run test gates

```sh
node --test tests/codespaces-origin-v42.test.mjs tests/codespaces-http-v42.test.mjs
node tools/falsify-codespaces-v42.mjs
```

The full Node24 CI also exercises the existing provider, Render and chat tests. The HTTP integration test uses a real Node server and SQLite with **explicit local + Vireonix upstream mocks**: no claim about real language quality or remote uptime. Real Qwen inference and real Vireonix responses remain separate gates.

## Human verification after deploy

In the Codespaces browser, refresh Teddy after checking out or deploying the merged revision. Send `ciao` (deterministic); then an open question with Qwen (real local inference); select Vireonix and send the same open question (external service and its availability). The absence of `origin_not_allowed` verifies the ingress fix; it does **not** alone verify both LLMs.
