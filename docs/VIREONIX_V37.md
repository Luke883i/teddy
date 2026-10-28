# Vireonix v37 — experimental, explicit language-only provider

**Epistemic state:** Integration is a working HTTP/SQLite *contract*, not a validated quality improvement. The public Vireonix upstream could not be reached from the isolated test container (DNS failure); never describe a simulated completion as a real model response.

## How to try

Start Teddy normally with Node.js 24 using `npm start`, then choose **Vireonix (remoto gratuito)** in the chat's Motore menu. Or start a new Teddy home with `TEDDY_PROVIDER=vireonix npm start`. A choice saved in the local SQLite settings takes precedence on subsequent restarts. To return to offline operation select **Qwen locale**. OpenAI remains opt-in with a key. There is no silent provider fallback.

This is a text-only HTTP provider. It does **not** provide ASR/TTS or voice. The public endpoint is fixed to `https://vireonix.ai/v1/chat/completions`, uses model `auto`, no API key and a bounded 18-second timeout. The server validates JSON and the returned assistant text and records the chosen provider in semantic SQLite receipts. The client displays only committed answers. A provider switch while a turn is running is rejected, not interleaved.

## Data minimization

Remote requests contain the current human text, selected recent turns from this conversation, and the bounded semantic directive. **Global saved memories are not sent by the new adapter.** Prior turns and semantic directives can still contain personal information. The Vireonix third party is not a private/offline execution environment; human users should not send sensitive data without understanding its current policies. Switching providers never rewrites past conversations.

## Gates and evidence

1. Contract: `node --test tests/vireonix-v37.test.mjs`.
2. Full path: `node tools/prove-vireonix-v37.mjs` starts a real Teddy Node server, exercises 30 separate sessions and 90 HTTP turns with a clearly marked **mock** upstream, then tests replay/SQLite/history and explicit provider switches. This does not evaluate actual Vireonix language quality.
3. Falsification: `node tools/falsify-vireonix-v37.mjs` enumerates 1,000,000 deterministic contract mutations (roles, hostile text, malformed replies). No real LLM calls; zero survivors is scoped to tested invariants.
4. **Pending** live external calls and genuine comparative dialogue, because this runtime could not resolve the upstream host. No success claim until this passes outside the restricted container.
5. **Pending** blinded comparison of at least 30 matched multi-turn conversations (Qwen and Vireonix; human Italian ratings), with position-randomized pairwise judging and length controlled scoring. Require Vireonix preference >60%, with p95 latency and error rates reported and no critical identity/memory failures. Otherwise the claim of superior eloquence remains unsupported.

Related research: [MT-Bench / LLM-as-judge bias](https://arxiv.org/abs/2306.05685), [AlpacaEval length-controlled comparisons](https://github.com/tatsu-lab/alpaca_eval), [OWASP prompt-injection defensive boundaries](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Primary provider documentation: [Vireonix API](https://vireonix.ai/docs) and [terms](https://vireonix.ai/terms). No guarantee or production SLA is assumed.

## Provider-switch regression fixed in PR #51 (v38)

In hosted deployments where the UI is served from an explicitly trusted HTTPS Host different from the canonical `TEDDY_PUBLIC_ORIGIN`, Teddy previously allowed `GET /api/bootstrap` but denied `PUT /api/provider` with `403 origin_not_allowed`. The request guard now authorizes **only** the exact HTTPS origin of that already trusted Host; unlisted hosts, other origins, cross-site requests, and missing/invalid Basic credentials remain blocked. For an additional hostname, explicitly configure `TEDDY_ALLOWED_HOSTS` (and deploy with the matching TLS reverse proxy). Do not allow arbitrary domains or disable CSRF checks.

The UI now reports the actual status and error code (401 authentication, 403 origin, 421 host, 409 in-flight turn, 503 persistence, 404 wrong deployment) instead of silently reverting the selection. Provider choices are persisted to SQLite before switching the in-memory provider; a failed write leaves the original provider unchanged. Hosted `TEDDY_PROVIDER=vireonix` also passes the Render preflight.

Proof: `node --test tests/provider-switch-v38.test.mjs tests/provider-switch-http-v38.test.mjs`. The latter starts a **real** Teddy HTTP service with an HTTPS-proxy header topology, tests denied and authorized changes, checks `GET /api/bootstrap` after switching, and restarts the service to prove SQLite survival. These checks do not call the Vireonix upstream or demonstrate speech quality.
