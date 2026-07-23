# Production Performance Audit - Reconciled Baseline

**Original audit date:** 2026-07-22
**Reconciled:** 2026-07-23
**Production:** `https://wiseresume.app`
**Audit HEAD:** `a2ccc7cddcafa3d5c0efb0c845c8a8ae52bb3c04`
**Verdict:** `PASS_WITH_WARNINGS`

## Evidence Note

The original performance audit was audit-only and did not leave a dedicated Atlas report. This record reconstructs its prioritized findings from the original audit brief and the four remediation reports that subsequently proved each root cause.

It is an evidence index, not a new measurement run. Metrics not preserved in the later reports are marked `UNKNOWN`.

## Audit Outcome

The audit identified four high-impact work areas:

1. Public-route bundle and request overhead.
2. Editor hard-refresh and hydration delay.
3. Public Portfolio mobile LCP, CLS, and avatar transfer.
4. Tailoring timeout, no-result, duplicate, idempotency, and credit recovery.

No code, documentation, Appwrite state, Vercel setting, environment variable, commit, push, or deployment was changed by the audit itself.

## Reconstructed Findings

| Finding | Proven baseline/root cause | Remediation |
|---|---|---|
| Universal charts bundle | Shared UI helpers were assigned to the charts chunk, pulling Recharts/D3 into every entry | Phase 1, `ddf16e16` |
| Public Editor prefetch | `EditorPage` was in the universal deferred prefetch list | Phase 1, `ddf16e16` |
| Public Broadcast request | `BroadcastBanner` mounted globally and queried before route/auth exclusion | Phase 1, `ddf16e16` |
| Editor startup | Persisted Zustand resume ID was used before the route ID was synchronized; the blocking read had no explicit timeout/retry policy | Phase 2, `e319737f` |
| Public Portfolio mobile | Direct baseline: `15.388 s` LCP, `0.346` CLS, about `3.672 s` estimated TBT, `1,882,125` bytes, `110` requests; gate/data started near `8.64 s`; avatar fetched twice at about `446 KB` each | Phase 3, `da5968bb` through `9e7020a0` |
| Tailoring wait/recovery | Historic Appwrite executions failed at the exact 30-second synchronous ceiling; the old backend could attempt about 195 seconds of provider work and the frontend retried automatically | Phase 4, `ac4065f1` and `66df7a39` |

## Preserved Metrics

| Route/surface | Device/profile | LCP | CLS | TBT | Result |
|---|---|---:|---:|---:|---|
| Public Portfolio baseline | Cold mobile | `15.388 s` | `0.346` | about `3.672 s` | Poor |
| Landing | Original audit | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Evidence not retained |
| Pricing | Original audit | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Evidence not retained |
| Guides | Original audit | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Evidence not retained |
| Examples | Original audit | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Evidence not retained |
| Authenticated workspace routes | Original audit | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | Route-specific follow-up reports hold the durable evidence |

## Remediation Sequence

| Phase | Product commit(s) | Documentation commit | Final phase result |
|---|---|---|---|
| Phase 1 - bundle/prefetch/Broadcast | `ddf16e16` | `810d6169` | `PASS_WITH_WARNINGS` |
| Phase 2 - Editor startup | `e319737f` | `fa236889` | `PASS_WITH_WARNINGS` |
| Phase 3 - Public Portfolio mobile | `da5968bb`, `8bab2a66`, `18110bb8`, `9e7020a0` | `05082ae7` | `PASS_WITH_WARNINGS`; cold LCP target still missed |
| Phase 4 - Tailoring recovery | `ac4065f1`, `66df7a39` | `17a767d4` | Timing/recovery passed; final content-integrity QA later found a product bug |

## Current Interpretation

The performance remediation sequence is closed for the approved implementation scopes. Two current product warnings remain:

* Public Portfolio cold-mobile LCP is `5.860 s` median, above the `<4.0 s` target.
* Tailoring timing and recovery are bounded, but the final rich production run found that project dates can be dropped during tailoring.

## Evidence Links

* [`performance-phase-1-remediation-2026-07-22.md`](./performance-phase-1-remediation-2026-07-22.md)
* [`performance-phase-2-editor-remediation-2026-07-22.md`](./performance-phase-2-editor-remediation-2026-07-22.md)
* [`performance-phase-3-public-portfolio-remediation-2026-07-22.md`](./performance-phase-3-public-portfolio-remediation-2026-07-22.md)
* [`performance-phase-4-tailoring-remediation-2026-07-23.md`](./performance-phase-4-tailoring-remediation-2026-07-23.md)
