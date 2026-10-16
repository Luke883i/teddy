# Teddy V28 — five semantic commits, one acceptance lattice

Baseline: main d934eb1fe08e85ca3209ee994b0861d6a790de65. The five latest merged PRs are #37–#41. This branch does NOT rewrite them. It adds five new forward commits, one coherent refinement per earlier PR.

| Step | Historical PR | Product obligation | Independent test |
|---|---|---|---|
| 1 | #37 | Visually independent comic response, readable type and small-screen focus | tests/v28-step-1-visual.test.mjs |
| 2 | #38 | Expanded adult Italian micro-intents, while open queries remain genuine LLM | tests/v28-step-2-semantic.test.mjs |
| 3 | #39 | Text-only status never pretends microphone/voice engines are healthy | tests/v28-step-3-text-boundary.test.mjs |
| 4 | #40 | Persisted history failure is recovered on the next open, single-flight | tests/v28-step-4-recovery.test.mjs |
| 5 | #41 | Real 30-session Qwen/browser QA gains bounded, privacy-safe qualitative flags | tests/v28-step-5-quality.test.mjs |

## Linked definition of done

A1: exactly five commits since pinned baseline, each with a different semantic title and independent test.
A2: the workflow checks out each exact commit SHA and actually runs its own test (not merely linting the final tree).
A3: all five tests pass simultaneously on HEAD.
A4: 1,000,000 quality-signal mutations + 1,000,000 context mutations; no simulated model outputs called real.
A5: HTTP positive and negative interactions, real SQLite receipts and Chrome desktop/mobile are green.
A6: the existing text-real-model-v20 workflow independently installs genuine checksum-verified Qwen GGUF, restarts without outbound network and runs 30 real-browser sessions (90 turns) with 30 screenshots and sampled-frame video.
A7: upstream CI and product documentation remain green, and the PR is mergeable.
A8: **not implied** by test success: exhaustive factual correctness, human-rated naturalness, physical air-gap or pixel-perfect subjective cuteness.

## Quality signals, not fake correctness

A response's length, exact echo, generic-only reply and keyword overlap generate **human-review flags**, never a fabricated truth score. Public reports contain only counts, digests and flags; they exclude raw user and model text. The model weights are not fine-tuned: improvements are deterministic expression, interaction recovery, instrumentation and presentation.

## E2E chain

Human text → text-only browser composer → POST /api/text/turn → scoped SQLite conversation history → deterministic micro-intent or authenticated local Qwen → validated reply → atomic response+receipt persistence → actual browser speech balloon → full history retrieval → next turn.

The assistant's current container cannot resolve GitHub to clone the repository or download GGUF. The per-commit/local-process and real-Qwen proofs are executed by the CI runner and must not be confused with direct execution inside the assistant's disconnected container.
