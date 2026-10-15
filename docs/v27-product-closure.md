# Teddy v27 — final-mile closure lattice

Baseline main: a06d51bd (includes merged PR #39 plus subsequent v26 semantic integration).

## Findings / the hidden defects
- `teddy.sh` had Git mode **100644**, so `./teddy.sh` failed with Permission denied even though `bash teddy.sh` ran.
- The comic bubble stored the full reply in a DOM node but limited the visible text height and scrolled a child `p` without offering clear access to the rest of the response.
- Existing real-GGUF proof used ten turns in one conversation and browser proof used a *mocked* LLM for the open question. Those green gates did not demonstrate thirty independent Qwen-backed **browser** sessions.
- UX aesthetics ("cute", relative Teddy visual salience, typography) cannot be certified by programmatic assertions alone; screenshots and a sampled-video evidence artifact remain separately reviewable.

## Selected contract from 1,000 structural candidates
Ten disclosure choices × ten proof tiers × ten launch packaging choices, using strict filters: no hidden truncation, center stage clear, real HTTP+SQLite, screen evidence and versioned executable. The winning implementation is the existing comics bubble with bounded scrolling **and visible Leggi tutta** to persistent history, real Chromium / Qwen / SQLite full-loop proof, launcher Git mode 100755 and CI.

## 30-session actual E2E design
A real `llama.cpp` process is installed with the official checksum-verified QuantFactory Qwen3-0.6B GGUF and offline restart validated, as in the v20 gate. On that SAME live server, real headless Chromium opens the production HTML and posts **three actual messages per independent session**: identity, an explicitly introduced human name, then one of thirty open factual/conceptual questions. The first two must have deterministic receipts and the third a **model receipt**. This is 30 isolated conversations, 90 user inputs, 90 assistant outputs, and 30 actual Qwen generations. Every final balloon is compared byte-for-byte with the committed SQLite assistant turn; screenshot and telemetry record fonts, bbox, scrolling, disclosure affordance and mobile/desktop reflow.

Video is a 30-frame sampled MP4 storyboard, **not continuous capture**. Reports expose response hashes and timings but never the raw transcript. The content is test data, not a real human's personal conversation.

## Falsifiers and difficult DoD
1. Executing `./teddy.sh --help` succeeds on Linux/macOS without `chmod +x`.
2. No fake answer or network fallback on model failure; 30 real model receipts after installation.
3. 30 distinct conversation IDs: no carryover of human name into a new thread.
4. Each reply committed in SQLite before the UI shows it, exact equality asserted.
5. Small desktop/mobile screen (alternating 1280x800, 390x844): min text 15px and line height 20px.
6. Balloon and composer within physical viewport; history closed by default on mobile.
7. If scroll needed, `Leggi tutta` is visible and opens exactly the saved answer in the history dock.
8. 30 actual Chromium screenshots plus generated MP4 and JSON timing/geometry artifact.
9. Existing v20 genuine offline GGUF path and v21 chat UI gates remain green.
10. At least one million geometry/semantic mutations in inherited CI; separately screen 1k structural choices. Do not call this a million visual inspections.
11. No voice activation in Step 0/1.
12. All final-head checks green, code and documentation consistent.

## Honest limits
Container-local genuine Qwen and 30-session browser testing require model binaries, Node 24 and external downloads. A cloud CI runner is a valid *separate* execution environment, not proof that Teddy ran in the assistant's own disconnected container. A green 30-session structural smoke cannot establish full factual correctness, ideal humor, or emotional naturalness. These require independent review of recorded replies and screenshot/video evidence.
