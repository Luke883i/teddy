# Teddy on Render: secure single-instance pilot (v35)

Baseline: Teddy main 510aa38baa2c98ab9f86736429c9982a94189bd3. Inspired by [Lumen](https://github.com/Luke883i/lumen) at a180956b65f6f1d992a7df1aa2ca06834efecf30, without copying Lumen user data or library code.

The Render Blueprint runs **`node scripts/start-v36.mjs`** directly as the service process; locally **`npm start`** invokes the exact same Node file. Direct invocation on Render preserves SIGTERM delivery and SQLite shutdown (npm can otherwise leave Node orphaned). `scripts/render-start-v35.mjs` remains a deprecated forwarding adapter; use [STARTUP_V36.md](STARTUP_V36.md) for npm options and shell migration.

## Deploy step by step

1. After merging this PR, visit [Deploy to Render](https://render.com/deploy?repo=https://github.com/Luke883i/teddy), or Render → New → Blueprint → select repository Luke883i/teddy / main.
2. Review and accept the **paid** 2c-4g compute plan, Frankfurt region, one instance, 5 GB persistent disk mounted at /var/data. This is not a Free plan, not HA, and has no validated inference latency SLA.
3. At the first Blueprint creation prompt, provide a unique TEDDY_AUTH_PASSWORD of at least 16 characters. No other secret needs to be supplied: Render creates TEDDY_RENDER_MASTER_B64 (256-bit base64) and the startup adapter translates it to the pre-existing Teddy master-key format. Never store either value in Git.
4. After Render reports Live, open your service URL and sign in through HTTP Basic with username **teddy** and your password. The build tests the configuration only; the shared Node launcher performs Render's fail-closed preflight and model downloads happen at runtime after the persistent volume is available.
5. The **first Qwen install** downloads a ~484 MB pinned model and verified llama.cpp artifacts; model readiness may lag liveness. /api/health signals HTTP liveness, while the authenticated /api/ready returns 503 until the local provider is genuinely ready. Watch model availability in the UI.
6. From the checked-out deployed revision, run this operator canary (the full SHA and password must be filled in locally):

    EXPECTED_SHA=YOUR_40CHAR_GIT_SHA TEDDY_AUTH_PASSWORD=YOUR_PASSWORD node scripts/verify-render-remote-v35.mjs https://YOUR-SERVICE.onrender.com

    Once model installation completes, add REQUIRE_MODEL_READY=1 to demand true inference readiness.

## Source-level controls

- Node.js 24.19.0 is pinned in .node-version and NODE_VERSION.
- Startup accepts only Render-matched HTTPS URLs and public hostnames, a strict PORT, non-empty external master key, strong password and persistent home /var/data/teddy. It refuses an unsafe configuration before opening SQLite.
- RENDER_EXTERNAL_URL is a routing hint, **not** a security credential. Authentication and HTTPS still apply.
- HTTP Basic protects all functions except the minimal liveness probe. Authenticated /api/version exposes the actual RENDER_GIT_COMMIT for remote canary. Authenticated /api/ready describes real local-model readiness.
- No auto OpenAI fallback; TEDDY_PROVIDER=local remains the default. Explicit openai mode requires the operator to configure the key through the authenticated Teddy UI.
- Persistent SQLite/WAL, secrets and model runtime sit beneath /var/data/teddy. Keep TEDDY_RENDER_MASTER_B64 stable, or encrypted key material becomes unusable. Back up the database using WAL-consistent online backups and test restore.
- Render persistent disks are single-instance only and **disable zero-downtime deployments**. Runtime checks prove disk writability, not cloud backup or high availability.
- When publishing a Deploy-to-Render button broadly, consider changing autoDeployTrigger from checksPass to off to avoid automatically redeploying every downstream instance on source commits.

## Forensic proof

- scripts/verify-render-v35.mjs: static Blueprint and fail-closed secrets/disk/health checks.
- tests/render-deployment-v35.test.mjs: independent security, origin, key, port and authentication tests.
- tools/mutate-render-v35.mjs: **1,000,000 seeded semantic configuration mutations** checked against a separate fault oracle, not one million live cloud deploys.
- tools/prove-render-boot-v35.mjs: actual shared Node startup through the same Render entrypoint, Basic auth, exact revision, no false model readiness, SQLite restart and exact request replay.
- scripts/verify-render-remote-v35.mjs: operator-run canary of an actual Render URL after deployment. No real Render service was deployed as part of this PR.

## Why Lumen is relevant

Lumen provides a useful deployment contract built from its render.yaml, deployment-contract.mjs, deployment-mutations.mjs, verify-deploy.mjs and render-canary.test.mjs: explicit preflight, immutable CI, persistent volume, independent mutation oracles, true remote SHA verification. Teddy adds the distinct constraints of a verified GGUF installer, model readiness, encrypted credentials and a mandatory authenticated public origin.

References: [Blueprint specification](https://render.com/docs/blueprint-spec), [disks](https://render.com/docs/disks), [health checks](https://render.com/docs/health-checks), [Render environment variables](https://render.com/docs/environment-variables), [Deploy to Render button](https://render.com/docs/deploy-to-render).
