# Teddy: written dialogue repair, reversible semantic sequence v48

**Scope**: Italian *parlato scritto*, not audio, speech recognition or TTS. **Authority**: CORA-METHOD is an audit technique, not Teddy's product, actor, trusted runtime, or merge approver. **Overall status**: CANDIDATE_LOCAL; `D0` NOT_ACCEPTED until authentic model/browser/Node24 and human-owned oracles pass.

## A0 — Target product contract

- **Actors**: user in a Teddy text conversation; chat UI; `/api/text/turn`; semantic planner; local Qwen, Vireonix or OpenAI text adapter; SQLite; reviewers.
- **Observable success**: one recognisable, pertinent Teddy voice in writing, stable across supported providers and conversations; explicit names remembered or honestly reported unknown; archived conversations viewable but not writable; only receipt-backed replies attributed to Teddy; independent deterministic messages remain responsive; no fabricated model output.
- **State**: `conversations`, `turns`, `semantic_receipts`, `text_requests` in the original SQLite store; global `memories` remain explicitly user-managed. No new database schema and no transfer of implicit session names across conversations.
- **Exclusions**: microphone, TTS, audio tuning, second conversation engine, cloud fallback, fine-tuning, cross-user account management, autonomous external actions, GitHub deployment or merge.
- **External acceptance**: Node 24 target tests, authenticated actual-model transcripts, user-visible real browser scenarios, reviewer, protected CI, owner consent to data handling. Absent evidence blocks D0.

## Backward-derived AND DoD

`D0 = D1(persona) AND D2(continuity) AND D3(provenance) AND D4(lifecycle) AND D5(responsiveness) AND D6(real-model-quality) AND D7(delivery)`. No weighted average and no substitution of tests for model quality.

| DoD | SOURCE leaf | TARGET_RUNTIME leaf | EXTERNAL leaf | Failure / rollback |
|---|---|---|---|---|
| D1 | One bounded written persona compiler used by rules, Qwen, Vireonix and OpenAI | Slider A/B different in every actual provider instruction; prompt content safe and consistent | Independent human raters validate style across available, authorized providers | If provider loses directive: revert persona commit; no effects on audio |
| D2 | Cursor-based conversation-only name events, retractions, rename, explicit budget exhaustion | Name survives 40/257/1025/2049 unrelated retractions, reload, SQLite integrity; no resurrection or leakage | Privacy/data retention owner confirms scope | Revert A1 with no schema deletion |
| D3 | Assistant origin joined to semantic receipts; legacy status explicitly unverified | Legacy assistant 201 still appears with `legacy_unattested`; committed assistant `receipt_backed`; browser labels both accordingly | Owners of legacy `/api/turns` clients approve migration/label | Revert additive history metadata/client label, preserve rows |
| D4 | `ended_at` readback, read-only archived selection; saved replay unchanged | Closed chat stays visible, cannot resume; new chat 200; ended requestId replay 200; conflict remains 409 | Browser UX + accessibility owner approves | Revert client selection and API field, no record deletion |
| D5 | Model-only single-flight; per-thread/per-request serialization; provider-switch barrier | Slow *instrumented* provider + other chat greeting 200, same chat overlap 429, no duplicate turn; then test real hardware | Owner assigns acceptable p95 latency budget and retry policy | Revert turn lock boundary commit |
| D6 | Retained scenario transcripts and explicit authentic-vs-mock origin | Actual Qwen (not surrogate); 30+ multi-turn Italian scenarios: relevant follow-ups, uncertainty, correction, idioms, respectful tone, no repetitive stock phrases; latency and failure traces | Independent Italian-speaking judges; thresholds agreed **before** evaluation | Cannot claim quality PASS with a mock or reviewer absence |
| D7 | Reproducible source SHA, test reports isolated from tracked source, lineage and rollback | Native full suite Node24, real Chromium UI, no dirty tracked reports after tests, protected CI | Real origin HEAD, owners, reviewer, merge and release decisions | No merge or release authority inferred from local artifacts |

## Minimal semantic sequence and dependency gates

The six **smallest independent change units** below are materialized as LOCAL Git commits on an exact ZIP-derived import. A previous S1 session-name patch (v46) is a prerequisite already included; it is NOT a target upstream merge. These six are independent reversible deltas, not an instruction to implement all at once on a remote agent. Execute only the next owner-authorized slice on a verified authentic target HEAD.

| Ordered slice | Product impact | Code/consumer | Positive + negative oracle | Gate / stop / rollback |
|---|---|---|---|---|
| **S1 A1: long explicit memory** | Teddy no longer says it forgot a still-valid name beyond 256 candidates; admits incomplete search instead of false denial | `StateStore.conversationNameEvidence`, `mostRecentDeclaredName`, `planSemanticTurn`; SQLite read-only cursor, cap 10240 candidates | 40/257/1025/2049 events; revoked current not revived; other conversation not leaked; restart; SQLite quick_check. Physical M1/M2 | PASS_SCOPED_LOCAL. No evidence of unlimited memory; revert isolated commit |
| **S2 A2: archived sessions** | History remains readable, but ended threads cannot become the active composer target | `StateStore.history` joins `ended_at`; history restoration/click; no DB migration | API ended_at, stale POST 409, replay after close 200; isolated selection helper; real browser **NOT_RUN** | SOURCE_HTTP_PASS, BROWSER_BLOCKED. Revert API/UI commit |
| **S3 B: historical provenance** | Historic/imported assistant entries are not deceptively labeled 'Teddy' | Readback receipt `EXISTS`, UI speaker + balloon accessibility; legacy writer remains for consumers | Legacy assistant no receipt -> `legacy_unattested`, receipt-backed -> `Teddy`; no duplicate history rows; real browser **NOT_RUN** | SOURCE_HTTP_PASS, BROWSER_BLOCKED. Revert compatible metadata/label commit |
| **S4 C: canonical written persona** | Changing tone sliders influences Qwen, Vireonix, OpenAI text, and deterministic social variant choice | `written-persona-v48`, three adapters, `semantic-spine` | Distinct bounded slider prompts; no audio instructions; Qwen/Vireonix/OpenAI requests mocked only; real outputs **NOT_RUN** | PROMPT_PASS_SCOPED, HUMAN_REVIEW_BLOCKED. Revert persona commit |
| **S5 D: independent-turn responsiveness** | A greeting in another thread can complete while an LLM request is pending; same-thread overlap still refused | `main.mjs` per-thread active set + model lock + provider switch barrier | Instrumented 650ms provider: cross-thread 200, same-thread 429, model 200, exactly 8 committed rows; real latency **NOT_RUN** | INSTRUMENTED_PASS_SCOPED. Revert lock commit |
| **S6 E: test evidence hygiene** | Re-running saturation tests no longer silently rewrites committed JSON reports | Three existing report generators + their native tests; stdout evidence + explicit test-only no-write env | All saturation invariants preserved and `git status --porcelain` empty after full suite; Node24 launcher still required | PASS_SCOPED_LOCAL; full Node24/CI blocked. Revert seven-file test slice |

**Ordering**: S1 -> S2 -> S3 -> S4 -> S5 -> S6 -> **G0 authentic acceptance**. S2/S3 can be implemented by different owners after verified S1; S4 and S5 are independent source changes, but must share target-native regression checks. Do not place six changes in a remote PR merely because this local chain exists. Re-falsify after every slice and split if any owner/domain requires independent PR review. G0 may require further slices discovered by authentic-model or browser results; never presume the program is complete until all AND leaves pass.

## Oracle, falsifiers and stop rules

- **Baseline:** exact `teddy-main.zip` source SHA256 `7411e0e41554f322a107ba100fb80aa08bf29a514d38a23f0dd69a87ddcccdfd`, tree `c63064b9d8a6eb7a3e3037a40d1e377469c87104`, 362 byte-equal files. Original repository/branch/HEAD/CI owners UNKNOWN; local Git is synthetic and carries no GitHub authority.
- **Real source/runtime checks:** Node22 native tests, HTTP JSON with real SQLite and mock disabled for 257/1025 name scenarios, explicit mock fixtures for provider/latency; full raw transcripts retained outside repository, no real Qwen response claimed.
- **Independent physical mutants:** M1 truncate cursor scan to first page; M2 ignore named revocation; M3 mark archived rows writable; M4 misattribute legacy assistant to Teddy; M5 drop local written-persona system message; M6 reintroduce global lock. Every mutant must fail the specific dedicated oracle and retain the source delta plus exit code; undetected mutants remain survivors, not PASS.
- **Negative tests:** refuse cross-session name flow, false name declaration, replay conflict, same-session overlap, wrong provider readiness, fake receipt origin, archived auto-resume, prompt instructions from historical data, model-quality claim with surrogates, dirty tracked reports.
- **Unverified:** original upstream commit history/import dependents, `/api/turns` external consumers, Node24, real browser visual/keyboard/a11y, real local Qwen output, approved human ratings, protected workflows, current production hardware p95. Treat them as EXTERNAL blockers, not incidental warnings.
- **Rollback:** `git revert` exactly one actual target commit after verifying base and owner approval; these patches have no schema migration and do not delete pre-existing SQLite records. Rolling back provenance metadata does not erase imported assistant text. Rolling back lock restores earlier cross-thread contention, explicitly document that regression.

## Stop condition and transfer packet

A separate coding agent must read back **TARGET_REPO, BASE, branch, HEAD, AGENTS.md, tests, owners, runner and permissions**. It may review this bundle, but it has not received ChatGPT project instructions automatically. Scope authorization per slice is distinct from authorization to merge, release or invoke external providers. Run target-native tests on approved runner; attach commands/exits, real oracles, mutation survivors and Git object readbacks to each next step.

The correct status after these local changes is **S1–S6 candidate PASS_SCOPED where tested; D0 NOT_ACCEPTED / EXTERNAL BLOCKED**. `DONE_REPORTED` and `PASS_REPORTED` are not external verification. At G0, independently decide whether any new behavior debt requires another slice; never invent a pre-fixed total to product acceptance.
