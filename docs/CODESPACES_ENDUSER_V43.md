# v43 — End-user closure for GitHub Codespaces
The v42 ingress fix was merged via PR #53 and its 19 workflows passed. The residual question is whether **the real browser** can send a message, see a balloon and change provider through the forwarded request boundary — not merely whether a backend Node request returns 200.

The v43 proof executes **actual Chromium + actual Teddy Node HTTP + actual SQLite**. A local reverse proxy replaces mutating request Origin/Host headers with the precise format GitHub Codespaces forwards, while Chrome still uses its native fetch, DOM events, same-origin Fetch Metadata and UI. The proxy does not mock, bypass or return fabricated API replies: the real Teddy server handles every HTTP request. Only Qwen and Vireonix language model outputs are intentionally mocked. The browser must observe:
- one `ciao` deterministic balloon and one Qwen-model-path balloon;
- a successful Vireonix selection followed by a Vireonix-model-path balloon;
- a successful return to Qwen, with no false text error;
- five accepted mutating HTTP requests with matching Codespaces Origin and browser Fetch Metadata;
- six genuine SQLite turns, with no duplicate/fabricated assistant messages.

Run `node tools/browser-codespaces-v43.mjs` on Node 24 with actual Chromium installed. GitHub's `codespaces-origin-v42` workflow also captures a PNG screenshot as an artifact.

**Epistemic limit:** This exercises a *simulated forwarding hop*, not a live, authenticated GitHub `*.app.github.dev` HTTPS session. It does **not** certify that a user's Codespace has deployed the merged revision, nor that genuine Qwen GGUF inference or the public Vireonix service will answer every time. Those are independent runtime gates. There is no silent model fallback; CSRF and cross-site rejections remain in force.