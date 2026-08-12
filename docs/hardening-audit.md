# Teddy v0.3 hardening audit

Scope: current `main`, merged PR #1 and merged PR #2. The audit is evidence-driven: repository state, source contracts, prior CI evidence, new source-derived saturation and new physical CI smokes are kept separate.

## Integration finding

PR #1 was merged into `main`. PR #2 was created against `agent/materialize-teddy-v01`, so merging PR #2 advanced that feature branch rather than `main`. As a result `main` remained v0.1 even though PR #2 was marked merged. v0.3 first restores the v0.2 recovery onto the `main` lineage, then applies hardening.

## 1. Hardening required

- **Remote trust boundary:** non-loopback serving previously had no authentication and could fail open when no explicit Host allowlist was configured. v0.3 requires an HTTPS public origin, long Basic-auth password and external secret master before a non-loopback listener can start.
- **Request provenance:** mutating requests now combine exact origins with Fetch-Site rejection. Scheme downgrade is not treated as same-origin in proxy mode.
- **HTTP bounds:** JSON/SDP endpoints enforce media types, compressed request bodies are rejected, Content-Length is checked before streaming and endpoint-specific limits are smaller.
- **Realtime egress:** API-key-bearing requests can go only to HTTPS endpoints; plain HTTP is limited to loopback test servers. Upstream response bodies and timeout values are bounded and redirects are refused.
- **Pressure control:** network/time-out/invalid-upstream failures now participate in backoff instead of only 429/5xx HTTP responses.
- **Secrets:** AES-GCM payload v2 binds ciphertext with AAD and supports an external 32-byte master key. Local file-key mode remains for loopback convenience; remote mode requires the external master.
- **SQLite:** private file mode, `trusted_schema=OFF`, `secure_delete=FAST`, rollback-safe migration, `quick_check` and WAL truncation on clean close are explicit.
- **Process/server:** request/header/keepalive/header-count/request-per-socket limits are explicit and shutdown is idempotent.
- **Supply chain:** GitHub Actions are pinned to immutable SHAs; the container runtime no longer runs npm and application files are not writable by the runtime user.

## 2. Enhancement opportunities taken

- `--doctor` now checks the security mode, private home directory and SQLite integrity.
- Bootstrap diagnostics disclose only safe deployment-mode/protection metadata.
- Browser SDP bootstrap has a finite client timeout and reads failure bodies once.
- Typed connection guidance includes client-side negotiation timeout.

## 3. Simplifications taken

- Container build removes the meaningless `npm ci --omit=dev` step because Teddy has zero dependencies.
- The image copies only runtime directories and makes `/app` immutable; only `/data` is stateful.
- `teddy.sh` removes `seq` and uses the already-selected Node runtime for local health probing.
- Static unhashed assets no longer claim `immutable`; they use revalidation semantics, eliminating stale-code ambiguity after upgrades.

## 4. Cleanup required/taken

- v0.2 is integrated onto the real `main` ancestry and package/server versions converge at 0.3.0.
- Runtime support is explicitly Node 24.x rather than every future major >=24.
- Historical v0.1/v0.2 saturation artifacts stay as provenance; v0.3 adds a separate audit report rather than rewriting history.

## Residual governance item

`main` currently has no branch protection / required status checks. This is a repository-governance hardening item, not an application-code change. The available repository connector in this session exposes the protection state but not a mutation action for branch protection, so the PR records it as residual rather than pretending it was changed.

## v0.3 simulation model

`tools/simulate-audit-v3.mjs` derives security/operational capabilities from committed source and evaluates four deterministic families:

- 1,000,000 hardening scenarios
- 1,000,000 enhancement scenarios
- 1,000,000 simplification scenarios
- 1,000,000 cleanup/integration scenarios

It additionally mutates 100,000 required controls in each family. These are synthetic design/fault identities, not physical browser/OpenAI sessions. Physical Node HTTP, SQLite, container and restart behavior is independently executed by CI.
