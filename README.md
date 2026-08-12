# Teddy

Teddy is a local-first realtime web character. `./teddy.sh` opens the animated bear, persists configuration/history/memory locally, and defaults to an account-free local speech provider.

## Launch

```bash
./teddy.sh
```

v0.7 does not require an OpenAI account or API key in its default mode. The local provider fails closed until native ASR/TTS wrappers are configured; it never silently falls back to the cloud. A loopback OpenAI-compatible LLM endpoint is expected at `http://127.0.0.1:8080` unless overridden.

```bash
export TEDDY_PROVIDER=local
export TEDDY_ASR_COMMAND=/path/to/asr-wrapper
export TEDDY_ASR_ARGS='[]'
export TEDDY_LLAMA_URL=http://127.0.0.1:8080
export TEDDY_TTS_COMMAND=/path/to/tts-wrapper
export TEDDY_TTS_ARGS='[]'
./teddy.sh
```

OpenAI remains an explicit opt-in provider:

```bash
TEDDY_PROVIDER=openai ./teddy.sh
```

Only in that mode does Home ask for an OpenAI API key. In loopback mode the encrypted key is stored under `~/.teddy`; it is never returned to browser JavaScript.

`./teddy.sh` accepts an installed Node 24.x or atomically bootstraps pinned Node 24.19.0 after SHA-256 verification. Useful checks:

```bash
./teddy.sh --doctor
npm test
npm run mutate:local
```

## v0.7 local-first runtime

Local turns use a provider-neutral bounded contract: browser microphone capture becomes 16 kHz mono PCM/WAV, the Node control plane orchestrates ASR -> loopback LLM -> TTS, and NDJSON streams semantic state/transcript/text/audio events back to the browser. Local TTS audio runs through the same Web Audio analysis path that drives Teddy's expression rig.

Child-process adapters use `shell:false`, bounded output and abort-driven termination. The LLM URL is restricted to plain HTTP loopback. Artifact installation primitives require HTTPS, exact expected size, SHA-256 and license metadata and only promote complete verified downloads.

This release does **not** pretend a production native model bundle is already vendored: ASR/LLM/TTS engines and weights remain an operator-provided boundary until a complete pinned multi-platform manifest is committed and exercised. See [`docs/v0.7-local-first.md`](docs/v0.7-local-first.md).

## Existing presence and anatomy

Teddy retains the articulated v0.6 anatomy, v0.5 morphology, bounded v0.4 expression rig, corrected 3D transforms, WebGL2 plush renderer and Canvas2D degradation path. Configuration, history and explicit memories remain durable in SQLite/WAL.

## Security modes

The default remains loopback-only. Non-loopback deployment fails closed unless `TEDDY_PUBLIC_ORIGIN`, a strong `TEDDY_AUTH_PASSWORD` and `TEDDY_SECRET_MASTER_KEY` are supplied. Terminate TLS in a trusted reverse proxy.

## Verification

CI retains historical security, persistence, container, presence, morphology and anatomy gates. v0.7 adds physical local-runtime tests and an exact 1,000,000-identity deterministic semantic mutation campaign: 250,000 typical, 250,000 atypical, 250,000 challenging and 250,000 adversarial mutations. The campaign is contract-level falsification, not one million paid model sessions or one million AST rewrites, and CI requires zero critical survivors and zero unsafe outcomes.
