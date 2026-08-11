# Teddy

Teddy is a local-first realtime web character. Run one command, see a recognizable teddy bear, speak naturally in Italian, hear him answer, tune voice/personality/look at runtime, and keep durable local history and memory.

## Launch

```bash
./teddy.sh
```

The first launch opens `http://127.0.0.1:8787` and Home asks for an OpenAI API key. The key crosses the browser boundary only in the onboarding POST, is AES-256-GCM encrypted at rest under `~/.teddy/secrets`, and is never returned to browser JavaScript.

If Node >=24 is unavailable, `teddy.sh` downloads the pinned Node runtime from nodejs.org and verifies its SHA-256 release checksum before extraction.

## Teddy v0.2

The visual model is a semantic teddy-bear grammar rather than a pile of independent ellipsoids. A small scene graph keeps the face attached to the head and drives a wide head, inset ears, protruding muzzle, triangular nose, glossy eyes/catchlights, belly, articulated arms, feet and paw pads. Raw WebGL2 uses sphere, box and triangular-prism meshes; Canvas2D preserves the same landmarks when WebGL2 is missing or lost. Camera distance is computed from archetype bounds and viewport aspect so Teddy remains fully framed instead of filling/cropping the screen.

Realtime failures are also typed. OpenAI 401/403/429/5xx responses, quota/rate-limit cooldown, WebRTC transport failure, server reachability and microphone permission are kept distinct. A 429 respects `Retry-After`, enters a local cooldown that suppresses repeated upstream attempts, and is shown inline instead of as a blocking browser alert.

## Experience

- **Parla:** full-screen Teddy + one-button Realtime conversation.
- **Cronologia:** persisted user/Teddy transcript turns.
- **Memoria:** explicit editable memories injected into future sessions when relevant.
- **Studio:** `gpt-realtime-2.1` / mini, `marin` / `cedar`, semantic-VAD eagerness, noise reduction, output speed/gain, personality dimensions and visual palette/exposure.
- **Diagnostica:** renderer/media capabilities, key status, persistence, install identity and the last typed voice failure.

Teddy uses WebRTC speech-to-speech. The Node service creates the Realtime call but never proxies live PCM. Web Audio measures the real remote stream for lip/presence motion.

## Commands

```bash
./teddy.sh
./teddy.sh --no-open
./teddy.sh --port=9000
./teddy.sh --doctor
npm test
npm run simulate:full
npm run simulate:e2e:full
```

## Engineering profile

- zero npm runtime dependencies and no frontend build step
- Node 24 control plane + `node:sqlite` WAL persistence
- encrypted local secret vault; Host/Origin guard + CSP
- OpenAI Realtime WebRTC unified SDP bootstrap with typed upstream errors and cooldown
- procedural raw WebGL2 3D + Canvas2D fallback
- semantic scene graph and bounded camera fit for the teddy archetype
- Web Audio capture/output gain and audio-driven facial/gesture motion
- Docker production artifact, non-root user, persistent `/data`
- GitHub Actions runtime, HTTP/restart durability, upstream-429 smoke, saturation and container persistence gates

The converged base architecture is in [`docs/architecture.md`](docs/architecture.md). The v0.2 recovery/visual DoD is in [`docs/v0.2-recovery.md`](docs/v0.2-recovery.md). Saturation evidence is in [`docs/e2e-v2.md`](docs/e2e-v2.md) and [`docs/e2e-v2-report.json`](docs/e2e-v2-report.json).

## Scale boundary

The zero-install profile is intentionally one local user/one SQLite writer. The media plane already scales independently because WebRTC bypasses Teddy servers. Horizontal control-plane write scale requires replacing the persistence/secret seam with shared production services; the local path does not pretend SQLite is distributed.
