# Saturation report

Mode: **full**
Synthetic scenarios: **20,300,000**
Critical unsafe outcomes: **0**
Critical mutation survivors: **0**
Digest: `e5d00f2eca25b5a32c6db31697b81d19898fb3bf73c99d8b3e9b5386462c8cf4`

These are deterministic design/fault simulations, not physical OpenAI calls or browser sessions. Real unit, HTTP, browser-render and container checks complement them.

## Abstraction layers

| Layer | Scenarios | Healthy | Graceful/blocked | Unsafe |
|---|---:|---:|---:|---:|
| bootstrap-runtime | 1000000 | 832928 | 167072 | 0 |
| supply-chain-bootstrap | 1000000 | 916460 | 83540 | 0 |
| secrets-cryptography | 1000000 | 936518 | 63482 | 0 |
| persistence-local | 1000000 | 928613 | 71387 | 0 |
| persistence-scale-boundary | 1000000 | 789080 | 210920 | 0 |
| http-security | 1000000 | 936112 | 63888 | 0 |
| runtime-config | 1000000 | 926341 | 73659 | 0 |
| realtime-bootstrap | 1000000 | 902313 | 97687 | 0 |
| webrtc-media | 1000000 | 870310 | 129690 | 0 |
| audio-capture-dsp | 1000000 | 887982 | 112018 | 0 |
| turn-taking-vad | 1000000 | 870621 | 129379 | 0 |
| voice-prosody | 1000000 | 902688 | 97312 | 0 |
| identity-persona | 1000000 | 928971 | 71029 | 0 |
| memory-context | 1000000 | 902967 | 97033 | 0 |
| ui-session-state | 1000000 | 915720 | 84280 | 0 |
| render-webgl2 | 1000000 | 870448 | 129552 | 0 |
| render-canvas2d-fallback | 1000000 | 949283 | 50717 | 0 |
| avatar-expression | 1000000 | 902397 | 97603 | 0 |
| appearance-lighting | 1000000 | 928694 | 71306 | 0 |
| operations-ci-container | 1000000 | 916096 | 83904 | 0 |

## Mutation campaigns

| Campaign | Mutations | Killed | Equivalent/benign | Critical survivors | Necessary kill rate |
|---|---:|---:|---:|---:|---:|
| edge | 100000 | 75001 | 24999 | 0 | 100.00% |
| negative | 100000 | 100000 | 0 | 0 | 100.00% |
| chat-session | 100000 | 58333 | 41667 | 0 | 100.00% |

## Convergence

- standard OpenAI key is never returned to browser
- loopback Host and mutating Origin are guarded
- downloaded Node runtime is SHA-256 verified
- server is control plane, never PCM relay
- local state survives restart using SQLite WAL
- persisted explicit memories enter new realtime sessions
- voice/config mutation restarts active realtime session
- semantic VAD supports natural interruption
- WebGL2 loss degrades to Canvas2D instead of killing Home
- container uses writable non-root data path
- runtime config is validated, clamped and persisted
