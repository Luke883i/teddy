[![ROA Research Programme](https://img.shields.io/badge/ROA-Research_Programme-1f6feb)](https://github.com/Luke883i/academics)
[![Programme Role](https://img.shields.io/badge/role-EMBODIED_INTERACTION_EXPERIMENT-6f42c1)](https://github.com/Luke883i/academics#repository-map)

<!-- roa-programme-header:v1 hub=Luke883i/academics framework=Luke883i/ROA role=EMBODIED_INTERACTION_EXPERIMENT -->

> **ROA Research Programme.** This repository is a component of the **ROA Research Programme — Computational Epistemics, Semantic Architectures & Governable AI Systems**, coordinated in [`Luke883i/academics`](https://github.com/Luke883i/academics) and theoretically anchored by [`Luke883i/ROA`](https://github.com/Luke883i/ROA). **Programme membership is a coordination/topology statement:** repository-local contracts and evidence remain authoritative for this repository, and membership alone does not imply formal derivation from ROA, conformance to ROA, empirical validation of ROA theory, or production readiness.

# Teddy

### Deploy Teddy on Render (paid single-instance pilot)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Luke883i/teddy)

The Render Blueprint runs the same Node.js 24 entry script as **npm start**, directly to preserve graceful SIGTERM/SQLite shutdown. Supply a strong TEDDY_AUTH_PASSWORD in Render, and sign in as user **teddy**. A persistent disk holds SQLite and the verified local GGUF. **Live** means the HTTP server is running, not that the model is installed; see the availability panel and the authenticated readiness endpoint. Full instructions and cost/privacy/recovery caveats: [Teddy Render deployment runbook](docs/RENDER_V35.md).


## Start here — written conversation (current v24)

Teddy is a local-first bear you can **type to**, even without internet **after** installing his small model. Start from the repository directory:

```bash
node --version             # Node.js 24.x
npm ci --ignore-scripts
npm run doctor
npm start                  # localhost:8787, server in foreground
```

For automatic browser opening use `npm run start:local`. On Render the Blueprint directly runs the **same Node entry script** as `npm start`, preserving SIGTERM and the fail-closed hosted preflight. [Full npm / legacy shell migration guide](docs/STARTUP_V36.md).

**Migration:** `teddy.sh` is deprecated and only forwards legacy options to `npm run start:local`; it no longer downloads Node. Install Node.js 24 and npm first. Historical flags (`--no-open`, `--no-install`, `--doctor`, `--port=N`) remain supported. Use `npm start` for automation and deployment.

You can type immediately: simple social messages work with deterministic rules while the model is still installing. Wait for **modello locale pronto** before asking open questions. Press **Invia**, and read Teddy's response in the comic bubble. **Cronologia** opens the persisted chat; **Dettagli modello** reopens installation/verification information. These controls are wired to the running server, not demonstrations.

Try these turns in sequence:
1. `chi sei?` → Teddy's deterministic adult identity, with one of several stable gruff phrasings.
2. `Mi chiamo Luca` → stores that message as part of the current conversation, not as a global permanent profile.
3. `come mi chiamo?` → answers from *this conversation's* recorded prior turns.
4. `spiega perché il cielo è blu` → uses the actual local Qwen3-0.6B GGUF, subject to its language and factual limits.

**Plain-language architecture:** Step 0 keeps each conversation separate and stores the real exchange safely. Step 1 checks the intent and lets deterministic rules handle narrow social tasks; complex questions go to Qwen. Both paths return through the same HTTP endpoint and SQLite receipt. Step 2 (spoken conversation) is future work, not required for typed chat.

**Initial setup requires a connection** to download the ~484 MB verified model and `llama.cpp`. Normal local inference and text replies use loopback after installation; no OpenAI account is required. OpenAI API is an explicit alternative with `TEDDY_PROVIDER=openai npm start`; Teddy never silently changes providers.

**Personality:** concise, burbero, dry-witted, receptive to praise, adult vocabulary and an occasional conceptual metaphor. Never degrading or threatening. The system does not claim human consciousness, complete factual reliability, automatic memory of everything, or a verified world model.

**Verify the implementation:**
```bash
node --test tests/semantic-spine-v24.test.mjs tests/semantic-state-v24.test.mjs
node tools/search-semantic-v24.mjs
node tools/mutate-semantic-v24.mjs
node tools/prove-semantic-chat-v24.mjs
```

These run deterministic contract checks and an actual HTTP/SQLite user-turn loop, with a labelled mock language provider *only* for open questions in the last integration test. The separate `text-real-model-v20` workflow proves authentic GGUF inference. The one-million mutation count is not one million Qwen generations. Technical contracts: [v24 Step 0/1 DoD](docs/v24-interaction-semantic-dod.md).

### Archived earlier voice-first guide

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
