# Teddy voice runtime — engineering definition v10

## Goal

A local Teddy is **voice-ready** only when the complete path from microphone capture to audible Teddy reply is usable. HTTP liveness, a running process, a downloaded model, or a single healthy engine are not sufficient readiness signals.

The runtime is engineered as a closed loop:

`audit → falsifiable model → smallest semantic slice → local/contract test → runtime test → fault injection → observability → convergence/no-novelty → immutable commit/report → re-audit`.

Every slice must reduce a named failure class without weakening an existing invariant.

## E2E runtime chain

1. **Bootstrap** — `teddy.sh` establishes Node 24, private `TEDDY_HOME`, loopback HTTP and managed-runtime autoinstall.
2. **Generation selection** — a current generation is accepted only if its runtime descriptor can be loaded and activated. Corrupt pointers never count as success.
3. **Artifact discovery** — pinned upstream releases resolve the native ASR/TTS runtime, Whisper model, llama runtime and Qwen model. Transient failures use bounded retry/backoff; permanent/integrity failures fail closed.
4. **Transfer + integrity** — partial files are discarded between attempts and every artifact is SHA-256 verified before extraction/promotion.
5. **Layout preflight** — required ASR/TTS binaries, Whisper encoder/decoder/tokens, TTS model/tokens/espeak data, llama-server and GGUF must exist; executable binaries must be executable.
6. **Process ownership** — Teddy refuses an already occupied configured llama port, owns the spawned child, handles spawn/exit failures and kills timed-out children.
7. **Physical promotion canary** — candidate generations execute `TTS(seed) → ASR → LLM → TTS(reply)`. Promotion is atomic only after every step succeeds.
8. **Availability contract** — `/api/ready` returns success only for the complete managed runtime; `/api/availability` exposes bounded public diagnostics and never leaks private paths.
9. **Recovery control plane** — transient first-install failures receive bounded automatic recovery. `POST /api/runtime/retry` provides an explicit idempotent user recovery path; the browser exposes it when installation is failed/degraded.
10. **Conversation path** — browser VAD captures 16 kHz WAV, `/api/local/turn` executes ASR → streamed LLM → phrase TTS, NDJSON carries transcript/text/audio/telemetry, and the browser plays audio while driving Teddy speech presence.
11. **Rollback** — a failed candidate never replaces the current pointer; an existing valid generation remains the restore point.

## Non-negotiable invariants

- `ready ⇒ ASR healthy ∧ LLM healthy ∧ TTS healthy ∧ generation present ∧ selfTest.ok`.
- A corrupt/missing `runtime.json` cannot make `loadCurrent()` succeed.
- SHA mismatch, insecure provenance or missing digest cannot be retried into readiness.
- A foreign process on the configured llama port cannot be mistaken for Teddy's LLM.
- A candidate cannot mutate `current.json` before the physical canary succeeds.
- Retry is bounded; no catalog/download/recovery loop is infinite.
- `stop()` cancels retry scheduling and terminates the owned LLM process.
- The local provider never silently falls back to OpenAI.
- Talk remains disabled until managed availability is ready, but runtime recovery remains reachable.
- Microphone permission/device and playback failures are separate from model-runtime readiness and are surfaced as user-actionable failures.

## Semantic slices in PR #13

- **S0 — failure observability:** structured stage/artifact/provider/HTTP/retryability metadata.
- **S1 — bounded transport resilience:** retry/backoff for transient discovery/download failures, partial cleanup, optional GitHub token.
- **S2 — valid runtime pinning:** replace unresolved llama build with a verified release.
- **S3 — first-install recovery:** reset startup promise and perform bounded automatic retry cycles.
- **S4 — layout + self-test hardening:** executable/data/model preflight and explicit self-test failure stage.
- **S5 — generation integrity:** missing/corrupt runtime descriptors invalidate the current pointer rather than masquerading as loaded.
- **S6 — process ownership:** port conflict detection, spawn-error handling and timeout termination.
- **S7 — control-plane closure:** HTTP retry endpoint + browser recovery affordance + polling integration.
- **S8 — runtime state-space model:** deterministic 155,520-scenario classification over 12 axes and M+100 no-novelty closure.
- **S9 — evidence/blobbing:** immutable Git blobs/semantic commits plus a committed saturation report; upstream binary artifacts remain independently SHA-256 verified before use.

## Testing lattice

Testing is intentionally layered; no single large simulation substitutes for physical gates.

- **Pure contracts:** availability, retry, provenance, sanitization and state invariants.
- **Filesystem/process tests:** corrupt generation pointer, occupied port and spawn failure.
- **HTTP smoke:** health/bootstrap/availability/runtime retry/local turn/provider isolation.
- **Voice-stream tests:** ASR transcript, streamed text, TTS chunks, cancellation and telemetry.
- **Browser contracts:** adaptive VAD, WAV encoding, microphone errors and playback handling.
- **Synthetic saturation:** `tools/saturate-voice-runtime-v10.mjs` exhausts 155,520 combinations and checks that no invalid state is classified ready.
- **M+100 closure:** 100 deterministic additional compound samples must introduce zero new semantic classes after exhaustive M.
- **Physical managed canary:** the installed generation itself performs TTS → ASR → LLM → TTS before promotion.

The saturation report explicitly declares `physicalDownloads:false`; it is evidence about state-space completeness, not a claim of 155,520 real model installations.

## Convergence rule

Iteration continues while at least one of the following is true: a new failure class appears, an invariant can be violated, a failure is not diagnosable, recovery is unreachable, or a test does not falsify the intended behavior.

Convergence is accepted only when:

1. all known runtime failure families map to a bounded state and actionable diagnostic;
2. false-ready mutations are killed;
3. physical process/HTTP/voice gates cover boundaries that synthetic saturation cannot;
4. exhaustive M has `unsafe=0`;
5. M+100 has `noveltyAfterM=0`;
6. the PR is mergeable and repository CI is green where CI visibility is available.

Any later production failure becomes a new semantic class and reopens the cycle rather than being patched as an isolated special case.

## Definition of done

Teddy's local voice runtime is complete when a clean supported machine can move from no generation to `pronto`, a valid existing generation can restart safely, transient upstream failures recover automatically or by explicit user retry, corrupt state fails closed, foreign processes cannot satisfy readiness, the physical promotion canary succeeds, microphone → ASR → LLM → TTS → playback works, and all regression/saturation gates remain green.

Fresh first installation still requires network access to the pinned public artifact sources. Normal inference after a valid generation is promoted remains local.
