# Teddy / CORA adoption: repository, software and product

**Status:** source-assurance candidate, no production/user-quality or host authorization. Prepared against Teddy `main` `c2b8fa6cab88e230d2ca07904194153186290e69` and CORA `cbae1fae8db92d44b6ed0d91c4d4d697e7f65585` (2026-11-11). Runtime code, provider implementations and persistence are not changed by this installation.

## Why these boundaries

- **Product (`teddy-conversational-character`)**: the user's typed dialogue with a coherent, attractive animated bear. Relevant tests: authentic model answers, browser pixels, task success, human comprehensibility and perceived responsiveness. None follows from a source census.
- **Software**: `teddy-node-control-plane` (Node, HTTP, SQLite, provider), `teddy-browser-and-avatar` (UI, rig, WebGL), `teddy-configuration`, `teddy-engineering-verification`. Multiple software units realize one product. The tests and tooling are supporting software, not direct evidence of user delight.
- **Repository**: Git source and metadata, CI, docs, roles and evidence artifacts. `cora.ontology.json` declares identities and paths; `cora.artifact-roles.json` declares overlapping artifact roles. These are authoritative *declarations*, not operational observations.

## Reusable method from sibling repos

ICTC: distinguish source, observed runtime, governed record and human-verified outcome; do not infer causation from graph proximity. iKant_EDU: use original owners and existing census, retrograde AND-based acceptance, source-locked reversible changes and external review; do not install a parallel authority or certify provider success from source. Teddy's CORA integration preserves existing owners and adds a read-only boundary.

## CORA source, setup and quickstart

Use a trusted, independent CORA clone checked out at **exactly** `cbae1fae8db92d44b6ed0d91c4d4d697e7f65585` (Python >=3.11, Git). Prefer out-of-tree installation to avoid adding CORA's code to Teddy's own product census. The CI workflow checks the revision and invokes the canonical `cora` executable via Python source. The user can locally install CORA from its own checkout (`python -m pip install -e /path/to/cora`) or use `PYTHONPATH=/path/to/cora/src python -m cora.cli`.

On a genuine, **full Git checkout** of Teddy:

```sh
cora snapshot . --revision HEAD --output /tmp/teddy-source.json
cora verify-ledger /tmp/teddy-source.json --repo .
cora graph . --revision HEAD --output /tmp/teddy-cora-graph.json
cora artifact-audit . --revision HEAD --output /tmp/teddy-roles.json
cora verify-artifacts /tmp/teddy-roles.json --repo .
cora adapter-audit . --revision HEAD --output /tmp/teddy-adapters.json
cora verify-adapters /tmp/teddy-adapters.json --repo .
cora workflow-audit . --revision HEAD --output /tmp/teddy-workflows.json
cora verify-workflows /tmp/teddy-workflows.json --repo .
cora process-run . --revision HEAD --process full --output /tmp/teddy-cora-process.json
cora verify-process /tmp/teddy-cora-process.json --repo .
node --experimental-vm-modules tools/cora-js-graph.mjs --revision HEAD --output /tmp/teddy-js.json
node --experimental-vm-modules tools/cora-js-graph.mjs --verify /tmp/teddy-js.json
node --experimental-vm-modules --test tests/cora-adoption.test.mjs
```

**CORA's native Python-AST graph does not resolve Teddy's JavaScript imports.** The supplementary `tools/cora-js-graph.mjs` parses tracked ESM syntax with Node's experimental `vm.SourceTextModule` **without evaluation** and inventories static module specifiers from immutable Git blobs. It does not integrate with CORA's Python graph, simulate execution, claim a complete JS/TS AST/CPG, analyze dynamically assembled imports/CommonJS/HTML script injection or establish absence of external consumers. It fails closed if the parser is unavailable; its independent Git replay detects tampering. Its output is not a native CORA certificate. Teddy currently uses JS/MJS rather than TS; any future TS adoption needs a separately governed parser adapter.

The currently pinned CORA `process-run --one-run --profile comprehensive` and `method-synthesize` assume CORA-owned `.cora/contracts/...` profiles in the **target repository**, which Teddy does not have. A trial on the candidate explicitly returned `missing .cora/contracts/dod/integrated-one-run-dod.json`. Reusing CORA's own product/authority contract as Teddy's would be an incorrect ontology transplant. The CI therefore executes the supported native `process-run --process full` and records the integrator functions as **BLOCKED_BY_TARGET_PROFILE**, not as a fabricated 100% pass.

## Conditional contextual gate and governance

`.cora/continuous-policy.json` is introduced here; **no contextual premerge auto-PASS is permitted against a BASE that lacks this policy**. An independently reviewed bootstrap into `main` must precede `cora dev-premerge ... --contextual --base REAL_BASE --head REAL_PR_HEAD --intent ... --convergence-contract /path/to/cora/.cora/contracts/dod/convergence-dod.json` and replay with `cora verify-contextual-gate`. The exact same user-supplied intent and contract must be used at replay. CORA cannot confirm GitHub branch-protection settings or authenticate human review.

Run Teddy's original Node24 test suite independently. The new CORA workflow is an **additional** required *candidate* check; GitHub admins must explicitly assess and enforce it. Do not delete/retire prior workflows, fork a local CORA, modify Node packages, relax the safety policy or silently download models. Authenticate real Qwen generation, actual frontend behavior, external networking and user outcomes in their respective test contexts.

## Non-compensatory adoption acceptance

`R = committed ontology + exhaustive declared role inventory + replayable Git source + native CORA reports + supplementary bounded JS report`.
`S = R + affected Node24 actual tests + rollback and security boundaries`.
`P = S + genuine local/remote provider evidence + browser and human product review`.
`G = trusted base policy + required-check enforcement + independent named reviewer`.

`R` does not imply `S` or `P`, and a green workflow does not imply `G`. A new-source SHA invalidates relevant source witnesses. A reported absence of an importer is **never** a deletion permission. The primary release goal remains BLOCKED_EXTERNAL until all independent product and governance obligations are observed.
