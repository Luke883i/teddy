# Teddy

Teddy is a local-first realtime web character. Open it, see Teddy, speak naturally in Italian, hear him answer, tune his voice/personality/look at runtime, and keep durable local history and memory.

## Launch

```bash
./teddy.sh
```

The first launch opens `http://127.0.0.1:8787` and Home asks for an OpenAI API key. The key crosses the browser boundary only in the onboarding POST, is AES-256-GCM encrypted at rest under `~/.teddy/secrets`, and is never returned to browser JavaScript.

If Node >=24 is unavailable, `teddy.sh` downloads the pinned Node 24.19.0 runtime from nodejs.org and verifies its SHA-256 release checksum before extraction.

## Experience

- **Parla:** full-screen Teddy + one-button Realtime conversation.
- **Cronologia:** persisted user/Teddy transcript turns.
- **Memoria:** explicit editable memories injected into future sessions when relevant.
- **Studio:** `gpt-realtime-2.1` / mini, `marin` / `cedar`, semantic-VAD eagerness, noise reduction, output speed/gain, personality dimensions and visual palette/exposure.
- **Diagnostica:** renderer/media capabilities, key status, persistence and install identity.

Teddy uses WebRTC speech-to-speech. The Node service creates the Realtime call but never proxies live PCM. WebGL2 renders the 3D bear; Canvas2D takes over if WebGL2 is absent or lost. Web Audio measures the real remote stream for lip/presence motion.

## Commands

```bash
./teddy.sh
./teddy.sh --no-open
./teddy.sh --port=9000
./teddy.sh --doctor
npm test
npm run simulate
npm run simulate:full
```

## Engineering profile

- zero npm runtime dependencies and no frontend build step
- Node 24 control plane + `node:sqlite` WAL persistence
- encrypted local secret vault; Host/Origin guard + CSP
- OpenAI Realtime WebRTC unified SDP bootstrap
- procedural raw WebGL2 3D + Canvas2D fallback
- Web Audio capture/output gain and audio-driven mouth motion
- Docker production artifact, non-root user, persistent `/data`
- GitHub Actions runtime + full 20.3M synthetic saturation + container persistence gates

The full design, failure semantics and scaling boundary are in [`docs/architecture.md`](docs/architecture.md). The generated saturation evidence is in [`docs/saturation.md`](docs/saturation.md) and [`docs/saturation-report.json`](docs/saturation-report.json).

## Scale

The zero-install profile is intentionally one local user/one SQLite writer. The media plane already scales independently because WebRTC bypasses Teddy servers. Horizontal control-plane write scale requires replacing the persistence/secret seam with shared production services (normally PostgreSQL + a secret manager); the local path does not pretend SQLite is distributed.

## Definition of done for v0.1

- [x] one-command launch
- [x] API-key onboarding in Home
- [x] encrypted persistence and restart durability
- [x] natural Realtime voice path with interruption/transcription
- [x] visible animated Teddy with 3D and 2D degradation
- [x] runtime voice/persona/appearance configuration
- [x] transcript + explicit memory
- [x] diagnostics and security failure semantics
- [x] deterministic saturation/mutation evidence
- [x] OCI deployment path and CI gates
