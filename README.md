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
npm run simulate:audit:full
```

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
- AES-256-GCM secret vault; v0.3 uses authenticated AAD and supports an external master key
- exact Host/Origin/Fetch-Site policy and bounded HTTP request bodies
- bounded, allowlisted Realtime egress semantics; HTTP test endpoints are loopback-only
- typed Realtime failures, Retry-After and local transient backoff
- semantic 3D teddy-bear scene graph with WebGL2 + Canvas2D degradation
- container image runs as `node`; `/app` is read-only and only `/data` is writable
- GitHub Actions are pinned to immutable commit SHAs

## Persistence and scale

The one-command local profile is intentionally a single SQLite writer. WebRTC media already bypasses the Teddy server. Horizontal multi-instance deployment should replace the persistence and secret-store seams with shared production services; v0.3 does not pretend local SQLite is distributed.

## Verification

CI executes unit/security tests, an authenticated remote-mode HTTP process smoke, the Realtime 429/cooldown smoke, persistence/restart tests and the non-root container path. Synthetic design/fault campaigns remain clearly separated from physical runtime tests.

The v0.3 audit and residual risks are documented in [`docs/hardening-audit.md`](docs/hardening-audit.md). Generated four-way saturation evidence is in [`docs/audit-v3.md`](docs/audit-v3.md) and [`docs/audit-v3-report.json`](docs/audit-v3-report.json).
