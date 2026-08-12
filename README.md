# Teddy

Teddy is a local-first realtime web character: one command opens an animated teddy bear, lets you speak naturally in Italian, plays the Realtime answer, and persists configuration, history and explicit memories.

## Launch

```bash
./teddy.sh
```

Home asks for the OpenAI API key on first use. In loopback mode the encrypted key is stored under `~/.teddy`; it is never returned to browser JavaScript. Teddy uses WebRTC for live media, so the Node process remains a small control plane rather than a PCM relay.

`./teddy.sh` accepts an installed Node 24.x or atomically bootstraps pinned Node 24.19.0 after SHA-256 verification. Useful commands:

```bash
./teddy.sh --no-open
./teddy.sh --port=9000
./teddy.sh --doctor
npm test
npm run simulate:presence:full
```

## v0.4 realtime presence

Teddy now uses a plush semantic model with 46 visible parts and nine articulated groups. The face includes cheeks, dual muzzle volumes, inset ears, brows, glossy eyes/catchlights and a layered jaw with lips, cavity and tongue. Shoulder/forearm/hand groups carry restrained speech gestures, while the camera independently fits horizontal and vertical bounds so extreme portrait and ultrawide viewports do not crop the character.

Speech animation is driven by the actual remote audio stream rather than a fixed-frequency-bin average. Time-domain energy, adaptive noise floor, spectral balance and onset proxies feed a bounded expression rig for jaw opening, rounded/wide mouth shape, brows, ears, head motion and gestures. Decorative movement respects reduced-motion; articulation remains active. A configured output gain of zero remains truly muted.

WebGL fur variation is evaluated in object coordinates, keeping the material attached to the moving plush surface. Canvas2D remains the degradation path and consumes the same expression pose for the important identity and speech cues.

## v0.3 security modes

The default is deliberately **loopback-only**. No password is needed for `127.0.0.1`, `localhost` or `::1`.

A non-loopback deployment fails closed unless all three controls are provided:

```bash
export TEDDY_HOST=0.0.0.0
export TEDDY_PUBLIC_ORIGIN=https://teddy.example.com
export TEDDY_AUTH_PASSWORD='use-a-long-random-password'
export TEDDY_SECRET_MASTER_KEY='<64 hex chars or base64:... containing 32 bytes>'
node server/main.mjs
```

Terminate TLS in a trusted reverse proxy. Non-loopback Teddy uses HTTP Basic authentication (user `teddy`), exact HTTPS origin/Host policy and an external secret master. `/api/health` is intentionally authentication-free but remains Host-restricted.

## Runtime profile

- zero npm runtime dependencies and no frontend build step
- Node 24.x + `node:sqlite` WAL persistence
- AES-256-GCM secret vault with authenticated AAD and optional external master key
- exact Host/Origin/Fetch-Site policy and bounded HTTP request bodies
- bounded, allowlisted Realtime egress semantics; HTTP test endpoints are loopback-only
- typed Realtime failures, Retry-After and local transient backoff
- semantic WebGL2 plush model + shared expression rig + Canvas2D degradation
- adaptive remote-audio analysis for speech-correlated articulation
- container image runs as `node`; `/app` is read-only and only `/data` is writable
- GitHub Actions are pinned to immutable commit SHAs

## Persistence and scale

The one-command local profile is intentionally a single SQLite writer. WebRTC media already bypasses the Teddy server. Horizontal multi-instance deployment should replace the persistence and secret-store seams with shared production services; Teddy does not pretend local SQLite is distributed.

## Verification

CI executes unit/security tests, an authenticated remote-mode HTTP process smoke, the Realtime 429/cooldown smoke, persistence/restart tests and the non-root container path. Synthetic design/fault campaigns remain clearly separated from physical runtime tests.

The v0.4 realtime-presence DoD is in [`docs/v0.4-presence.md`](docs/v0.4-presence.md); generated v0.4 evidence is in [`docs/presence-v4-report.json`](docs/presence-v4-report.json). The v0.3 security audit remains in [`docs/hardening-audit.md`](docs/hardening-audit.md).
