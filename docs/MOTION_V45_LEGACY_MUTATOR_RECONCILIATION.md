# V45 / legacy V14–V15 mutation-oracle reconciliation

**Scope:** read-only falsifier inputs and tests. No animation, joint envelope, motion engine, renderer, browser acceptance or production security thresholds are changed by this correction.

## Source-bound failure

On PR #58 head `4e5e141d0b824e6da27ab96bb26dc2fd0ab37b40`, the inherited `motion-v8` workflow failed at the step `falsify 50m local-intermediate-global motion mutations`. V45 intentionally raised the permitted joint rotation bound from the old 1.20 rad to `EXPRESSIVE_JOINT_LIMIT = 1.55` rad to permit legible raised-paw gestures.

The inherited V15 source validator already uses `EXPRESSIVE_JOINT_LIMIT`, but the V15 generator continued to inject `angle=1.201` and classify it as invalid. It therefore logged 8,333,333 survivors, all in the local tier. This was a **false positive in the mutation-oracle definition**, not an unsafe accepted pose.

A second independent source-compatibility failure existed in `mutate-expressive-v14.mjs`: its malformed candidate used 1.201 radians, and its measured-pose guard rejected any angle above 1.200001, while the actual V45 contract allows up to 1.55. The old V14 mutator was executed and stopped at a real 1.201-radian survivor, followed by an `unsafe physical joint 7168` false alarm. Fixing V15 only would have left `motion-v8` blocked later at its V14 stage.

## Corrective contract, no threshold relaxation

- Both generators now derive the **out-of-envelope** negative-mutant angle from `EXPRESSIVE_JOINT_LIMIT + 0.001`, rather than the superseded literal 1.201. This preserves the invariant that every deliberately malformed angle must remain rejected, even if the bounded joint range evolves.
- Both full-body pose guards use the authoritative `EXPRESSIVE_JOINT_LIMIT + 1e-6` numerical tolerance, not the older 1.200001 ceiling. The physical contract remains bounded at 1.55 radians.
- Added explicit positive and negative boundary tests on both angle signs. Exactly at the permitted bound is accepted; 0.001 radian beyond the bound is rejected. Tests also cover all 32 names for the V15 local validator.
- The V15 intermediate and global validators, the 32 product gesture oracles, the V45 100k-per-label physical samples, skin deformation limits, and all browser criteria are unchanged.

## Executed before/after evidence (local Node 22 compatibility environment)

| Executable | Original behavior on V45 | Corrected behavior |
|---|---|---|
| `node tools/mutate-motion-v15.mjs` | 50,000,000 total; 8,333,333 false survivors; exit 1 | 50,000,000 total, 25,000,000 valid and 25,000,000 invalid, **zero survivors**; exit 0 |
| `node tools/mutate-expressive-v14.mjs` | Survivor at i=4 and i=12, followed by wrong 1.200001 physical-pose guard at i=7168; exit 1 | 100,000,000 total, 50,000,000 valid and 50,000,000 invalid, **zero survivors**; exit 0 |
| `node --test tests/motion-silhouette-v15.test.mjs tests/expressive-v14.test.mjs` | New boundary tests not yet present | 15/15 pass |
| `npm test` | Not repeated as original in this corrective slice | 401/402 pass; one unchanged startup guard rejects Node 22, as intended |

Local program execution is not official Node 24 proof. The **same final PR HEAD** must pass the GitHub Node 24 `motion-v8` workflow, including both mutation stages and the downstream real WebGL/CSP steps. Do not claim convergence on the strength of earlier PR checks.

## Product / software / repository assurance

- **Product:** the previous 32 gestures and their intention oracles remain as developed in V45. This fix itself does not improve their appearance and does not certify perceptual legibility.
- **Software:** actual articulation boundaries and negative mutant generation are now consistent. A failing mutation suite must still fail closed for actual out-of-envelope, nonfinite, invalid joint, temporal or world constraints.
- **Repository:** maintain source SHA, generated receipts, non-compensatory test outcomes and original CORA readback. Merge and human review remain externally authorized.
