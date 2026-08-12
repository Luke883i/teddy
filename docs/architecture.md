# Teddy architecture — converged runtime

## Product invariant

The public contract is one command:

```bash
./teddy.sh
```

A browser opens on loopback. On first launch Home asks for the user's OpenAI API key. After that the user can see Teddy, talk naturally, hear the answer, inspect history/memory, and tune voice, personality and appearance without installing a database, bundler or container runtime.

## Planes

```text
                         OpenAI Realtime
                     speech ↔ speech + transcript
                              ▲
                              │ WebRTC media + data
                              │
 Browser                      │                    Teddy Node control plane
 ┌────────────────────────────┴─────────────┐      ┌──────────────────────────────┐
 │ Home / History / Memory / Studio / Diag │ REST │ static + config + state      │
 │ WebGL2 procedural avatar                ├──────► encrypted secret vault       │
 │ Canvas2D fallback                       │      │ Realtime SDP bootstrap       │
 │ Web Audio presence analysis             │      │ SQLite WAL persistence       │
 │ RTCPeerConnection + semantic VAD events │      │ Host/Origin security guard   │
 └──────────────────────────────────────────┘      └──────────────────────────────┘
```

The server is a **control plane**, never a PCM relay. Browser media flows directly to OpenAI after the server exchanges the SDP using the standard API key. This keeps voice latency and server bandwidth out of the application scaling path.

## Runtime layers

1. **Bootstrap.** `teddy.sh` accepts an installed Node >=24 or downloads the pinned Node 24.19.0 runtime into `~/.teddy/runtime`. Downloaded archives are checked against the official `SHASUMS256.txt` before extraction.
2. **Process.** One dependency-free Node process serves static modules and JSON/SDP APIs. No compile step is required at launch.
3. **Secret boundary.** The API key is submitted from Home once, encrypted with AES-256-GCM, atomically written with mode 0600, and never returned to browser JavaScript. A corrupt vault fails closed and can be replaced from Home/Studio.
4. **Persistence.** Node `sqlite` stores install identity, config, conversations, transcript turns and explicit memories. WAL, foreign keys, `busy_timeout`, checks and indexed schema are enabled. `PRAGMA user_version` is the migration boundary.
5. **HTTP security.** Loopback mode rejects non-loopback Host headers (DNS rebinding). Mutating cross-origin requests are rejected. CSP, frame denial, no-referrer and microphone-only Permissions Policy are applied to API/static responses.
6. **Realtime control.** `POST /api/realtime/session` validates SDP, injects top memories and runtime personality into the session, applies semantic VAD/transcription/noise reduction/voice/speed, and relays the SDP offer to `/v1/realtime/calls` with a bounded timeout.
7. **Media.** `RTCPeerConnection` captures the microphone with echo/noise/AGC constraints. Optional input gain uses a Web Audio gain graph. Remote audio is played through Web Audio and analyzed from the actual stream to drive Teddy's mouth.
8. **Turn-taking.** Semantic VAD is runtime selectable (`low`, `auto`, `high`) and interruption is enabled. Speech-start/stop events drive attention animation before text state catches up.
9. **Voice.** Default model `gpt-realtime-2.1`, default voice `marin`, with `cedar` as the principal alternate. Output speed is persisted. A config change closes the active session so immutable voice/session state is never mutated illegally mid-call.
10. **Persona.** Irritability, warmth, wit and verbosity are clamped to [0,1] and compiled into Realtime instructions. Persisted memories are explicitly labeled as data rather than executable instructions.
11. **3D presence.** Teddy is procedural WebGL2: deterministic sphere topology, articulated parts, custom vertex/fragment shaders, diffuse/rim/specular lighting, tone mapping, breathing, gaze, stochastic blink, speech gestures and audio-energy mouth motion.
12. **2D degradation.** WebGL2 absence or context loss replaces the canvas and continues with a Canvas2D Teddy rather than crashing onboarding or voice controls.
13. **Accessibility/performance.** Device pixel ratio is capped; frame target is configurable; `prefers-reduced-motion` damps nonessential motion.
14. **Operations.** OCI is a deployment path, not a local prerequisite. The container runs as `node`, owns `/data`, and persists the same SQLite state through a volume.

## Data model

```text
settings(key, value, updated_at)
conversations(id, started_at, ended_at)
turns(id, conversation_id -> conversations.id, role, text, created_at)
memories(id, text, salience, created_at)
```

Explicit memory is intentionally simple in v0.1: editable facts ranked by salience. It is bounded before injection into a Realtime session. Transcript history is durable but is not automatically promoted into memory; this avoids silently converting every utterance into long-term identity state.

## Scale boundary

The local product is deliberately single-user/single-writer. Scalability comes from separating concerns rather than pretending local SQLite is a distributed database:

- WebRTC media bypasses Teddy servers entirely.
- Static assets can move to a CDN without changing application semantics.
- Control-plane handlers are request-scoped; the persistence API is the seam to replace for multi-instance write scale.
- The OCI image is horizontally replicable **only after** state/secrets are moved to shared production services (normally PostgreSQL plus a cloud secret manager). Until then the supported durable container profile is one writer with a persistent volume.

This boundary is explicit so a future Postgres adapter does not infect the zero-install local path or force a database daemon on `./teddy.sh`.

## Failure semantics

| Failure | Behaviour |
|---|---|
| missing API key | Home onboarding; no Realtime attempt |
| corrupt API-key vault | fail closed; request replacement |
| malformed JSON/SDP | 400 |
| hostile loopback Host | 421 |
| hostile mutating Origin | 403 |
| OpenAI timeout | 504; local UI/state remain alive |
| OpenAI 4xx/5xx | bounded error; upstream body is not reflected |
| microphone denied | connection closes; Home remains usable |
| WebGL2 unavailable/lost | Canvas2D Teddy |
| refresh/restart | config/history/memory reload from SQLite |
| SIGINT/SIGTERM | HTTP closes and SQLite is closed |

## Saturation methodology

`tools/simulate.mjs --full` performs 1,000,000 deterministic synthetic fault-space scenarios at each of 20 abstraction layers, then 100,000 edge mutations, 100,000 negative mutations, and 100,000 chat-session mutations. Scenario identity is `layer:index`, so uniqueness is by construction. The simulator separates killed critical mutations from equivalent/benign mutations and requires zero critical survivors.

This is design/fault simulation, **not** a claim that 20.3 million physical browser or OpenAI sessions were executed. It is paired with unit tests, HTTP security tests, restart/persistence tests, mocked Realtime multipart tests and container CI.
