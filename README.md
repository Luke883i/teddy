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
npm run simulate:morphology:full
```

## v0.5 teddy morphology

v0.5 reconstructs Teddy's body from the silhouette outward. It fixes a malformed 3D translation matrix that previously corrupted Z/depth, then replaces the disconnected-looking body with a continuous seated teddy-bear anatomy: dominant round skull, exposed inset ears, compact eye/nose triangle, broad projecting muzzle, pear torso, overlapping plush arms, seated haunches and large forward feet with pads.

A deterministic morphology search evaluates 1,000,000 unique parameter identities and rejects non-bear proportions before scoring survivors. The final candidate is separately raster-checked at the WebGL renderer's 1:1 primitive scale in front, speaking, three-quarter and silhouette views. See [`docs/v0.5-modeling.md`](docs/v0.5-modeling.md) and [`docs/morphology-v5-report.json`](docs/morphology-v5-report.json).

The mouth remains nearly invisible at rest but expands forward with the existing audio-reactive expression rig; speech continues to use RMS, spectral balance, adaptive noise floor and onset proxies rather than a single FFT level.

## v0.4 realtime presence

The expression plane remains a bounded, frame-rate-stable rig for jaw, lip shape, brows, eyes, ears, head motion and restrained gestures. WebGL fur variation stays in object coordinates so it moves with the plush surface; Canvas2D remains the degradation path and consumes the same important expression state.

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
- corrected 3D homogeneous transforms + semantic WebGL2 plush morphology v5
- shared realtime expression rig + Canvas2D degradation
- adaptive remote-audio analysis for speech-correlated articulation
- container image runs as `node`; `/app` is read-only and only `/data` is writable
- GitHub Actions are pinned to immutable commit SHAs

## Persistence and scale

The one-command local profile is intentionally a single SQLite writer. WebRTC media already bypasses the Teddy server. Horizontal multi-instance deployment should replace the persistence and secret-store seams with shared production services; Teddy does not pretend local SQLite is distributed.

## Verification

CI executes unit/security tests, authenticated remote-mode HTTP process smoke, Realtime 429/cooldown smoke, persistence/restart, non-root container gates and every historical saturation family. v0.5 adds deterministic one-million morphology convergence and requires the generated report to be byte-current with the committed search code.

Graphical evidence and its limitations are documented in [`docs/v0.5-modeling.md`](docs/v0.5-modeling.md). The v0.4 presence evidence remains in [`docs/presence-v4-report.json`](docs/presence-v4-report.json); the v0.3 security audit remains in [`docs/hardening-audit.md`](docs/hardening-audit.md).
