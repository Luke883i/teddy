# Teddy v17 — Language-first product and epistemic DoD

Baseline: v16 + merged v17 facial PR; scope is text/conversation/local language runtime/OpenAI API and UI sequencing **only**. No claims about rendering or motion.

## Root diagnosis
- The prior browser shipped voice actions, settings, diagnostic views, history and memory but not a wired text composer or a visible assistant transcript.
- The local runtime already included llama.cpp + Qwen3 0.6B Q8 GGUF, but speech readiness conflated LLM with ASR and TTS.
- The local Studio offered to configure OpenAI despite `TEDDY_PROVIDER=local`; changing a key did not change the configured runtime provider.
- Panels and key onboarding lacked explicit close paths, and the persistent six-item nav dominated the primary conversational experience.

## Semantic commit chain
- L1: `text-service.mjs`: validated user text, OpenAI Responses request with server-held API key, bounded output, timeout, store:false, errors without leaking secrets.
- L2: `/api/text/turn` route: real local or OpenAI provider, never cross-mode fallback, persist both turns when the response is obtained; independent `textReady`.
- L3: QuantFactory Qwen3-0.6B Q4_K_M GGUF via existing verified managed runtime; catalog cache key/version/publisher changes invalidate the Q8 catalog. Model is about 484 MB; runtime, ASR and TTS occupy extra disk. Quantization is a portability tradeoff, not a claim of superior intelligence.
- L4: Always-available (when language ready) text composer, actual reply stream represented as completed written turns, truthful provider state; secondary controls behind closeable menu and dialogs.
- L5: Node falsifiers + real browser/CDP with production CSP, actual mock-mode Node HTTP/SQLite, browser screenshot digest, menu open/close and persistence checks.

## Dependency lattice and falsifiers

| ID | Obligation | Falsification | Evidence |
|---|---|---|---|
| L-01 | Real provider-selected request | Local mode makes any cloud call | text route / local-service |
| L-02 | Bounded text input | Empty, control or >2k chars accepted | Node test |
| L-03 | Encrypted OpenAI key server-side | Key appears in JSON/body/browser bundle | security/static tests |
| L-04 | Cloud call API with no silent local fallback | 401/429 converted to local answer | mock HTTP tests |
| L-05 | Persist true user + assistant turns | UI claims success when server failed | browser HTTP/SQLite |
| L-06 | LLM-only readiness distinct from voice | No TTS disables text when LLM is healthy | local-service status |
| L-07 | Local initial artifacts verified | Wrong SHA/publisher cached as legitimate | catalog/integrity tests |
| L-08 | No network during local inference | Model generation opens external HTTPS | **physical air-gapped test open** |
| L-09 | Reply visible, not fabricated | Missing backend yields an invented assistant bubble | Chrome DOM E2E |
| L-10 | Provider status honest | Mock/local mode advertises a configured OpenAI path | browser and UI contracts |
| L-11 | Every opened surface dismissible | Menu, drawer, notice or key dialog cannot close | Chrome DOM E2E / source |
| L-12 | Offline provisioning/restart proven | Clean install and reboot without network fails | **physical air-gapped test open** |
| L-13 | Visual acceptability | Overlap, clipping, keyboard traps, mobile defects | **manual cross-viewport screenshots open** |
| L-14 | Production credentials | Actual OpenAI paid response is received and recorded | **external credential test open** |
| L-15 | Single final head | All applicable CI workflows green on final SHA | GitHub Actions |

## Epistemic boundary
The Node/browser smoke uses `TEDDY_LOCAL_ENGINE_MOCK=1` exclusively as a deterministic E2E test fixture. Its responses must visibly say **Modalità di prova** and it **does not prove** real GGUF inference, air-gapped machine operation, subjective language quality or cross-platform resource budgets.

Offline means: after all verified executable and model artifacts exist, llama-server loads the GGUF by *local file path*, local chat requests target loopback only, and normal generation does not require an upstream network. A clean first install still requires downloading the model and runtimes. No claim is made for a first install without connectivity.

## Release decision
Do not merge as fully offline-qualified until physical air-gap, minimum-RAM performance and visually inspected screenshots pass. The PR can independently demonstrate wiring, fake-control elimination, API contract and mocked application E2E.
