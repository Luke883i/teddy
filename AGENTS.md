# Teddy engineering assistant boundaries

Teddy is a conversational-character **product** implemented by Node and browser **software** and represented by a Git **repository**. Keep claims in these three domains separate. The product does not inherit maturity from CI or a CORA receipt.

Use [docs/CORA_ADOPTION.md](docs/CORA_ADOPTION.md) to inspect the committed ontology and role declarations. CORA is a separate, pinned, read-only engineering-assurance tool; it is not a Teddy runtime dependency, coding agent, release authority or source of model weights. Preserve original Teddy security, launcher, SQLite and model-provider ownership. Reuse existing tests and workflows.

For changes: pin BASE and HEAD; define a user-visible outcome and falsifiable product/software/repository acceptance; add independent positive and negative tests; exercise the actual affected call path; identify the unverified dynamic and external consumers; retain evidence as scoped observations. Never treat candidate lexical JS import edges as complete AST, runtime calls or safe-deletion proof. Never treat deterministic mutations, model mocks or a green pipeline as genuine Qwen/remote generation, visual appeal, protected checks or user approval.

The new `.cora/continuous-policy.json` is **bootstrap candidate policy** until merged into a trusted base and independently reviewed. A new PR cannot ratify its own policy. Do not bypass high-risk review, change protected checks, merge, deploy or delete code under CORA authority. The same exact HEAD and postmerge MAIN require their own test and evidence readbacks.
