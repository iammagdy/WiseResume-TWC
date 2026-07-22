# WiseResume Performance Phase 2 Editor Remediation - 2026-07-22

## Verdict

`PASS_WITH_WARNINGS`

The normal production hard-refresh target is met: five warm runs reached interactive Editor inputs and Preview in a median `1.653 s`, with no stale-resume flash or persistence regression. Warnings remain because one cold post-deployment run took `4.427 s`, exact production Appwrite request count was unavailable from the selected browser backend, and three unrelated Tailoring export tests timed out only under full-suite concurrency.

## Scope

Changed only Editor hard-refresh bootstrap, requested-resume readiness, stale-store protection, bounded validation, and loading/failure UX.

Not changed: autosave semantics, persistence model, Appwrite schema/permissions/functions, auth architecture, AI/credits, Tailoring, Cover Letters, exports, Portfolio, Broadcast schema, environment variables, Vercel settings, or general Editor design.

## Confirmed Root Cause

The production baseline took approximately `7.94 s` to become usable even though the browser load event completed in approximately `865 ms`.

The blocking chain was:

```text
route ?id=<requested>
-> Editor renders useResume(currentResumeId) from persisted Zustand state
-> passive effect later copies route ID into the store
-> stale/empty store can query the previous ID or delay the requested ID
-> render guards accept any non-null currentResume before target confirmation
-> Appwrite getDocument has no Editor-specific timeout and inherits query retries
-> independent 8-second fallback can redirect to Dashboard while unresolved
```

The eight-second timer did not hydrate data. It was a racing safety redirect that could fire when the unbounded startup chain remained unresolved. The Editor did not wait for the full resume-library query, so list loading was not the cause.

Critical startup data is auth, requested resume ID, the exact owner-confirmed document, and normalized editable state. Metrics, AI credits, activity, full resume library, and optional preview enhancements are noncritical.

## Implemented Fix

* `src/lib/editorResumeStartup.ts`: route-first target resolution, target-document confirmation, `5,000 ms` timeout wrapper, `2,500 ms` slow-loading threshold, and typed timeout error.
* `src/hooks/useResumes.ts`: scoped document-query timeout and retry options; Editor uses a bounded request with `retry: false` while preserving missing/network/timeout distinctions.
* `src/pages/EditorPage.tsx`: URL target is the first-render query key; stale/nonmatching store data is null to all pre-guard effects, autosave, and Preview; store ID alignment occurs before passive effects; the eight-second redirect is removed; loading, slow, retryable failure, and missing states are distinct.
* `src/lib/__tests__/editorResumeStartup.test.ts`: route/store resolution, matching-document, timeout, and stale-state coverage.
* `src/hooks/__tests__/useResume.editorStartup.test.tsx`: direct bootstrap, stable-ID deduplication, route switching, retry, timeout, and failure classification coverage.

## Validation

* `git diff --check`: PASS.
* `npx tsc --noEmit`: PASS.
* Focused startup tests: PASS, 2 files / 11 tests.
* Related regression tests: PASS, 9 files / 47 tests, covering Editor components, resume/template store behavior, Preview, create-resume structure, auth cache, and protected route behavior.
* `npm run build`: PASS, 5,819 modules in `54.91 s`; no sourcemaps; existing Browserslist-age and large-chunk warnings only.
* Focused ESLint for the new startup utility/tests: PASS.
* Broader targeted lint retained existing `useResumes.ts` explicit-`any` findings and existing `EditorPage` hook warnings; this task did not broaden into unrelated lint cleanup.
* Full Vitest run: 170 files passed, 1 skipped; 983 tests passed, 1 todo. Three `TailoringHubResultPage.export.test.tsx` tests timed out under full-suite concurrency and caused a duplicate-DOM follow-on. The complete file passed 8/8 in isolation in `9.51 s`, so this is recorded as suite timing/isolation noise rather than an Editor regression.

## Local Production-Build Evidence

Five hard refreshes of the same authenticated Editor route:

| Run | Browser load return | Auth ready | Resume loaded | Inputs interactive | Preview visible |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.283 s | 1.071 s | 1.619 s | 1.763 s | 1.763 s |
| 2 | 0.301 s | 0.866 s | 1.348 s | 1.485 s | 1.485 s |
| 3 | 0.282 s | 0.734 s | 1.129 s | 1.263 s | 1.263 s |
| 4 | 0.380 s | 0.846 s | 1.307 s | 1.463 s | 1.463 s |
| 5 | 0.346 s | 0.814 s | 1.593 s | 1.735 s | 1.735 s |

Median usable/Preview time: `1.485 s`. Fastest: `1.263 s`. Slowest: `1.763 s`. The slow notice and removed eight-second path did not activate.

A local direct route switch from `explore-test-blank-123` to `Test Resume` displayed loading and then the correct target; the previous resume was never observed.

## Deployment

* Product commit: `e319737f43527a5528b66b165e3a09bc22b5b07e` - `perf(editor): reduce resume hydration startup delay`.
* Vercel deployment: `dpl_GLhcMR5mu95pRBSKw8VwSbNmEpx4`.
* Status: `READY`.
* Exact deployed SHA: `e319737f43527a5528b66b165e3a09bc22b5b07e`.
* Production aliases: `https://wiseresume.app`, `https://www.wiseresume.app`, and `https://resume.thewise.cloud`.
* Appwrite deployment: `NOT REQUIRED` and not performed.

## Production Performance Evidence

One cold/post-deployment run reached interactive inputs in `4.427 s` after auth at `3.444 s`; this is retained as a cold outlier rather than merged into the warm median.

Five warm hard refreshes:

| Run | Browser load return | Auth ready | Resume loaded | Inputs interactive | Preview visible |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.434 s | 1.006 s | 1.506 s | 1.653 s | 1.653 s |
| 2 | 0.457 s | 0.853 s | 1.898 s | 2.400 s | 2.400 s |
| 3 | 0.773 s | 1.251 s | 1.685 s | 1.830 s | 1.830 s |
| 4 | 0.424 s | 0.752 s | 1.331 s | 1.442 s | 1.442 s |
| 5 | 0.430 s | 0.783 s | 1.302 s | 1.434 s | 1.434 s |

Warm median interactive/Preview time: `1.653 s`. Fastest: `1.434 s`. Slowest: `2.400 s`. Median resume load: `1.506 s`. Median auth readiness: `0.853 s`. The slow notice and removed eight-second Editor timeout did not activate.

Five Dashboard-to-Editor browser runs completed correctly in `3.123-3.143 s`, median `3.130 s`. These values include the browser automation locator's post-click stabilization wait; they prove successful warm navigation but are not claimed as pure application readiness timings.

## Production Correctness Evidence

* Resume switch: from `explore-test-blank-123` to `Test Resume`; loading was visible at `1.517 s`, the correct target appeared at `1.743 s`, and the old title was never observed.
* Autosave: entered the harmless full-name marker `Perf Phase 2 QA`, waited for autosave, and confirmed Preview showed it.
* Refresh persistence: after hard refresh, Preview still showed the marker and the same resume.
* Cleanup: cleared the marker through the UI, waited for autosave, refreshed, and confirmed `Your Name`, score `0%`, and no marker. The QA resume is back to its original blank state.
* Console: 45 captured entries; 15 warnings and zero other problems. Every warning was the existing `BroadcastBanner` Appwrite error `Attribute not found in schema: active`. No Editor/resume timeout, load, or ownership error was observed.
* Deployed assets included the new `EditorPage-DDSAHJgT.js` chunk.

## Request Count Evidence

Integration tests prove:

* one `getDocument` call for a stable resume ID across rerenders;
* one call for each distinct target when switching IDs;
* no automatic retry for the Editor startup query.

The selected in-app browser backend did not expose a production network request timeline. Exact production Appwrite document request count and duplicate count are therefore `UNKNOWN`; they are not fabricated from asset inventory or UI timing.

## Remaining Risks

1. Public Portfolio mobile LCP/CLS/avatar behavior remains open.
2. Tailoring no-result/timeout behavior remains open.
3. Authenticated Broadcast `active` schema mismatch remains open and requires a separately approved Appwrite contract/schema task.
