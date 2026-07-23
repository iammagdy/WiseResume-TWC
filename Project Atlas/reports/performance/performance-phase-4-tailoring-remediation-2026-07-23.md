# Performance Phase 4 - Tailoring Bounded Execution and Recovery

**Date:** 2026-07-23
**Verdict:** PASS_WITH_WARNINGS
**Production:** `https://wiseresume.app`
**Branch:** `main`

## Scope

This phase changed only Tailoring request duration, timeout/cancellation behavior, Appwrite execution transport, no-result recovery, idempotency cleanup, duplicate prevention, safe diagnostics, and exactly-once credit behavior.

It did not change provider/model routing, prompts, structured schema, merge semantics, scoring, plans, pricing, auth, Appwrite schema, Portfolio, Editor, Cover Letters, or unrelated AI features.

## Confirmed Root Cause

Two historical production executions prove the original backend boundary:

| Execution | Status | Duration |
|---|---|---:|
| `6a6086ce7a33f9ad3e62` | failed | `30.003 s` |
| `6a6086f0a9630fc42edb` | failed | `30.002 s` |

Both failed at Appwrite's 30-second synchronous execution ceiling. The prior Tailoring route could spend approximately 195 seconds across a 65-second primary attempt, same-provider retry, and fallback. The frontend used a synchronous execution, had no effective bounded transport wait, and automatically retried once. The exact provider attempts for the historic failures are `UNKNOWN` because their response/log bodies were unavailable.

Structured-output repair was already disabled for Tailoring and did not cause the delay.

The first production deployment exposed a second defect. Execution `6a60cd3e6de806fc8eec` completed in `4.961 s`; DeepSeek succeeded in `3.591 s`, but the browser was denied access to `getExecution`. No result-only execution followed, so the cached result was stranded and the UI showed a generic failure.

Root-cause classification:

* Primary: `APPWRITE_FUNCTION_TIMEOUT`
* Contributors: `FRONTEND_WAIT_BUG`, `FALLBACK_CHAIN_TOO_LONG`, `IDEMPOTENCY_STUCK`
* Production follow-up: `RESPONSE_HANDLING_BUG`

## Implemented Contract

| Boundary | Before | After |
|---|---:|---:|
| Appwrite transport | synchronous, hard failure at 30 s | one async provider execution |
| Primary provider | 65 s | 42 s |
| Same-provider retry | allowed | disabled for Tailoring |
| Cross-provider fallback | another 65 s | at most one, 23 s |
| Backend total | approximately 195 s possible | 68 s |
| Frontend total | ineffective/unbounded | 75 s |
| Result retrieval | depended on browser `getExecution` | status poll with result-only fallback |
| Result-only wait | immediate lookup | up to 8 s per lookup |
| Pending expiry | could remain stale | 80 s |
| Tailoring credit lock | 30 s | 78 s |
| Frontend retry | automatic once | explicit user action only |

The result-only path recomputes the authenticated user's payload fingerprint and reads the existing `idempotency_cache`. It bypasses provider routing and credit checks because it cannot create AI work.

## Files Changed

Product and recovery implementation:

* `appwrite-hubs/ai-gateway/src/main.js`
* `src/lib/appwrite-functions.ts`
* `src/lib/aiTailor.ts`
* `src/lib/aiErrorParser.ts`
* `src/pages/TailoringHubPage.tsx`
* `src/lib/devkit/sourceHashes.generated.json`

Focused tests:

* `src/lib/__tests__/appwrite-functions.tailoring.test.ts`
* `src/lib/__tests__/aiTailor-D1.test.ts`
* `src/lib/__tests__/aiErrorParser.test.ts`
* `src/pages/__tests__/TailoringHubPage-recovery.test.tsx`
* `src/pages/__tests__/TailoringHubPage-F1.test.tsx`
* `tests/hubs/ai-gateway-routing.test.cjs`
* `tests/hubs/ai-gateway-tailoring-recovery.test.cjs`

## Validation

* Focused frontend recovery suite: PASS, `5` files / `24` tests.
* Gateway routing test: PASS.
* Gateway Tailoring recovery integration test: PASS.
* `node --check appwrite-hubs/ai-gateway/src/main.js`: PASS.
* Focused changed-file ESLint: PASS.
* `git diff --check`: PASS with Windows line-ending warnings only.
* `npm run build`: PASS, 5,820 modules; no sourcemaps.
* Broader phase suite: `174` files / `1,004` tests passed, one skipped file, one todo.
* Four tests timed out only under full-suite load: three Tailoring PDF export tests and one English fallback coverage test. Both affected files passed in isolated reruns (`2` files / `9` tests).

Controlled gateway tests covered direct success, first-provider timeout plus fallback success, all-provider timeout, malformed no-result, explicit retry, concurrent duplicate, cached/result-only replay, one charge on success, and no charge on failure.

No production provider-exhaustion test was performed.

## Git and Deployment

* Product commit: `ac4065f1e74e3128a3f197973e2e6a1d7a2809b4`
* Production recovery commit: `66df7a3978c79a525742a6c07ab2836a4ca0cadf`
* Vercel GitHub deployment: `5579487506`, success.
* Vercel environment URL: `https://wise-resume-d700lmekx-iam-magdy.vercel.app`
* Appwrite workflow: `30042810382`, success, targeted `ai-gateway` only.
* Appwrite deployment: `6a627b81bff27daaf366`, `ready`.
* Appwrite source hash: `244f6be15693770dc1c6129a8e258c4fc956a6ddd04793522edc314ab712adc0`.
* Safe Appwrite smoke: HTTP 200.
* No schema, permission, auth, environment, or settings change was made.

## Production Evidence

Post-recovery smoke:

| Signal | Evidence |
|---|---|
| Provider execution | `6a627c387a11d6e9ae91`, HTTP 200, `4.754 s` |
| Provider attempt | DeepSeek `deepseek-chat`, attempt 1, success in `2.902 s` |
| Result retrieval | `6a627c398ed25d37f977`, HTTP 200, `3.653 s` |
| Provider duplication | none; only the first execution invoked a provider |
| Credit | one request-log row, two credits, non-idempotency hit |
| UI | loading ended; actionable unchanged-output state displayed |
| Retry | Retry and Edit controls visible |
| Resume save | none on unchanged result |
| Navigation | none on unchanged result |
| Stuck state | none |

The browser's observed terminal state occurred well below the 75-second frontend cap. The selected `Test Resume` produced no meaningful changes, so this run verified result transport and the unchanged-output recovery path, not creation of a new result page.

## Remaining Risks

* A newly created meaningful Tailoring result and result-page navigation should be confirmed with one richer controlled QA fixture. Do not repeatedly consume production credits to force this.
* External provider latency and outages remain possible but are bounded by the 42/23/68-second backend contract and 75-second frontend cap.
* Public Portfolio cold-mobile LCP remains above the four-second target and was not reopened.
* Authenticated Broadcast still queries a missing `active` attribute and was not changed.
