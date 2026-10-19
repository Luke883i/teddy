# Teddy v0.3 audit saturation

Deterministic source-derived design/fault simulation; not physical browser or paid OpenAI sessions.

- hardening scenarios: **1,000,000**
- enhancement scenarios: **1,000,000**
- simplification scenarios: **1,000,000**
- cleanup scenarios: **1,000,000**
- mutations: **400,000**
- total identities: **4,400,000**
- critical unsafe outcomes: **0**
- critical mutation survivors: **0**
- digest: `c8da2a6a43d435b2bee4726c184e26f71c959c6c5087242cb0e0341a2e3f6c8b`

The simulator derives required controls from the committed source before evaluating deterministic scenario identities. Runtime HTTP, SQLite, container and process semantics are separately executed in CI.

Since v36, `canonicalStartup` replaces the retired `atomicBootstrap` shell-downloader capability. The check now requires the npm/Node entrypoint, Render preflight before server import, Docker parity and a forwarding-only `teddy.sh`; `node24Only` checks the Node major and runtime pins. A removed bootstrap is not treated as a regression.
