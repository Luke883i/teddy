# Teddy oral-pipe v1 Test contract

This gate defines when the managed local voice runtime may report `ready`.

## Readiness

`READY` requires a trusted and verified generation, healthy ASR/LLM/TTS processes, and the existing physical oral canary:

1. synthesize `Ciao Teddy` to a valid WAV;
2. transcribe that WAV with Whisper;
3. obtain a non-empty local Qwen response;
4. synthesize the response with Piper to a valid WAV.

Configuration, installation, verification and readiness are separate states. A configured local provider may therefore report `ready: false` together with an actionable installation failure.

## Artifact trust

Cryptographic SHA-256 pins are the default. Qwen is pinned to immutable revision `1eaf4d9657fe65ad10a51eab76a8db5b363bddaa` and SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`.

The two historical Sherpa model release assets that do not expose an upstream digest may use `legacy_release_identity` only when repository, release tag, filename, HTTPS release-download URL and positive release size match the source-controlled profile exactly. The downloaded bytes still receive an observed SHA-256. This exception is not available to any other artifact.

## Transaction invariants

- unverified bytes never occupy the executable final pathname;
- partial downloads remain `.part` files and are removed after failure;
- exactly one process may provision a Teddy home at a time;
- stale/dead installer locks are recoverable;
- candidate generations become current only after the oral canary;
- a failed candidate never replaces a healthy current generation;
- catalog, download, extraction, ASR, LLM and TTS work is bounded;
- retries are bounded and jittered.

## Adversarial proof

`tools/oral-pipe-fault-campaign-v11.mjs` executes exactly 100,000 deterministic unit-state cases over production trust, state, promotion and retry functions, then continues until 1,000 consecutive cases introduce no new failure signature. The campaign explicitly labels itself synthetic and does not claim physical model downloads or inference.

`tests/oral-pipe-runtime-v11.test.mjs` adds real filesystem/process boundary tests for concurrent locking, stale-lock recovery and child-process timeout.

Physical clean-machine acquisition and real Whisper/Qwen/Piper inference remain a separate release-certification gate and must not be inferred from the synthetic campaign.
