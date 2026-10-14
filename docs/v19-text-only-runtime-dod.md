# Teddy v19 — standalone local text language runtime: pre-PR evidence

Scope: **written chat only**. No microphone, ASR, TTS or voice engines installed by the default text-only runtime.

## Real user path

1. Start Teddy with Node 24 on Linux x64/arm64 or macOS x64/arm64. Default server mode sets `TEDDY_TEXT_ONLY=1` and `TEDDY_RUNTIME_AUTOINSTALL=1`.
2. On first start, retrieve llama.cpp `b10218` prebuilt CPU executable and QuantFactory Qwen3-0.6B Q4_K_M GGUF (~484 MB); each download must have SHA-256 provenance and be verified before promotion.
3. Extract and promote the generation into the final runtime directory; **only then** write absolute paths in `runtime.json`. Reject missing, escaping or symlink-redirected executable or model paths.
4. Launch only llama-server on `127.0.0.1` with the promoted GGUF. The server performs an actual non-mocked generation self-test before declaring textReady.
5. Web composer is disabled until `textReady:true`. A successful text submission uses a real loopback HTTP completion, scoped conversation history and persists both turns in SQLite.
6. Restart after installation with no upstream network: load the previously promoted generation, without contacting GitHub or Hugging Face; no model API request leaves loopback.
7. Optional OpenAI provider remains explicit and never silently switches provider.

## Proof lattice

- G1: artifact catalog is exactly [llama-runtime, qwen3-0.6b]; no ASR/TTS download or dependency.
- G2: download checksum, executable permissions, model existence and generation-root canonical path verified.
- G3: llama-server process actually starts and `/v1/models` answers from loopback.
- G4: non-empty LLM chat completion required before textReady.
- G5: frontend enabled only by positive readiness, not from installing/running status.
- G6: each local chat request is bounded by timeout and response size; conversation context is scoped.
- G7: real HTTP server and filesystem fixture validates positive install and cold restart with all external network calls forbidden.
- G8: 10,000,000 deterministic adversarial readiness/path mutations, with 1,221 real filesystem checks.
- G9: full CI on final PR SHA, including inherited test suites.
- G10: **open external proof** — this execution environment cannot access GitHub/Hugging Face through DNS; real 484 MB GGUF download and genuine llama.cpp inference on a physical offline computer remain unverified here.

A simulated HTTP model is used **only** by deterministic mechanical install/boot/offline tests. It is not described as genuine inference. Full local installer success requires the production built-in, nonmocked LLM self-test.
