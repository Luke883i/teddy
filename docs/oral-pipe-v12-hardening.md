# Teddy oral-pipe v1 Test contract

This gate defines when the managed local voice runtime may report `ready` and when PR #15 is eligible to be treated as an oral-channel candidate.

## Readiness

`READY` requires a trusted and verified generation, healthy ASR/LLM/TTS processes, and the existing oral canary:

1. synthesize `Ciao Teddy` to a valid WAV;
2. transcribe that WAV with Whisper;
3. obtain a non-empty local Qwen response;
4. synthesize the response with Piper to a valid WAV;
5. only after all four steps succeed may the generation pointer be promoted.

Configuration, installation, verification and readiness are separate states. A configured local provider may therefore report `ready: false` together with an actionable installation failure.

## Artifact trust

Cryptographic SHA-256 pins are the default. Qwen is pinned to immutable revision `1eaf4d9657fe65ad10a51eab76a8db5b363bddaa` and SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`.

The two historical Sherpa model release assets that do not expose an upstream digest may use `legacy_release_identity` only when repository, release tag, filename, HTTPS release-download URL and positive release size match the source-controlled profile exactly. The downloaded bytes still receive an observed SHA-256. This exception is not available to any other artifact.

## Transaction invariants

- unverified bytes never occupy the executable final pathname;
- partial downloads remain `.part` files and are removed after failure;
- exactly one process may provision a Teddy home at a time;
- a newly-created ownerless lock directory is treated as initializing, not stale;
- a live owner is never stolen merely because its heartbeat is old;
- only the current ownership token may release a lock;
- dead or genuinely stale malformed locks are recoverable;
- candidate generations become current only after the oral canary;
- a failed candidate never replaces a healthy current generation;
- parent cancellation cannot be reclassified later as a timeout;
- catalog, download, extraction, ASR, LLM and TTS work is bounded;
- retries are bounded, jittered and permanent failures are not retried;
- cache hydration never widens the upstream host allowlist;
- Windows x64, Linux x64/arm64 and macOS x64/arm64 have explicit runtime artifact semantics.

## Severe DoD for PR #15

A candidate must satisfy all of the following on the exact PR head:

1. all oral boundary tests pass;
2. the deterministic fault campaign executes exactly 100,000 unit cases and reaches 1,000 consecutive no-novelty cases;
3. mutation testing reports zero critical survivors and at least 95% kill rate; the current target is 100%;
4. multi-process lock stress completes at least 5,000 real acquisitions with zero critical-section overlaps;
5. timeout/cancellation stress completes at least 2,000 guards with zero classification failures;
6. CI runs on the repository Node 24 runtime and includes a Windows x64 oral job;
7. PR head is based on current `main`, mergeable, and all GitHub Actions checks are green;
8. physical clean-machine model acquisition and Whisper/Qwen/Piper inference are reported separately from synthetic/unit proof and must never be implied by them.

## Executed proof before publication of v12 hardening

- boundary tests: 26/26 passing on the available local Node 22 runner;
- repeated boundary baseline: 20 consecutive full runs passing after the lock initialization-race fix;
- fault campaign: 100,000 initial deterministic cases, 104,321 total, 730,247 checks, 2,826 final signatures, 1,000 consecutive no-novelty cases;
- mutation campaign: 27/27 valid non-equivalent mutants killed, zero survivors, kill rate 100%;
- stress campaign: 10 child processes, 5,000 lock acquisitions, zero overlap violations; 2,000 timeout/cancel guards, zero classification failures.

The local runner is Node 22 while the repository requires Node 24. Node 24 compatibility and Windows x64 behavior are therefore CI gates, not claims inferred from the local run.

Physical clean-machine acquisition and real Whisper/Qwen/Piper inference remain a separate release-certification gate until actually executed.
