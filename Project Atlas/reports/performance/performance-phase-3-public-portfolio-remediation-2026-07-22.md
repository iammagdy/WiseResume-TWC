# Performance Phase 3 - Public Portfolio Mobile Remediation

**Date:** 2026-07-22
**Verdict:** PASS_WITH_WARNINGS
**Production:** `https://wiseresume.app`
**Route:** `/p/magdy`
**Final product SHA:** `9e7020a0b7ce25c62b00425351ca537cb8d9e612`
**Vercel deployment:** `dpl_9hA3b3zKGZXddKKYrC4WmG54gBUn` (`READY`, `PROMOTED`)

## Scope

This pass changed only Public Portfolio mobile LCP/CLS, avatar delivery, public gate/data startup, and optional work proven to compete with the hero. It did not change portfolio content, privacy, password architecture, contact/interest semantics, analytics semantics, Appwrite auth, AI, Tailoring, Editor, Credits, custom domains, schema, permissions, environment variables, or service settings.

## Root Causes

### Data Request Delay

* Exact portfolio routes were dispatched through broad application startup before the public page mounted.
* Direct production baseline gate/data requests started near `8.64 s`.
* Gate and data were already parallel, not sequential. The delay was route/module startup, not a gate-to-data waterfall.
* `AppInterior`, monitoring, and the public page module graph competed before the requests and hero could complete.

### Avatar Delivery

* The original Appwrite Storage `/view` asset was approximately `446 KB` and was requested twice in the direct baseline trace.
* The image completed near LCP and was the confirmed mobile LCP element.
* The initial implementation used Radix Avatar Image, which probes the image before rendering it; cache-disabled traces therefore showed two transfers. The final hero uses one native image over the existing initials fallback.

### CLS

* The two largest baseline shifts came from centered typewriter phrases wrapping to different line counts.
* Smaller shifts came from the chat launcher hint and deferred sections/footer.
* Avatar geometry was explicit after remediation and was not the remaining dominant shift.

### Main Thread and Optional Work

* The public page and hero imported Framer Motion before first render.
* The global idle-prefetch bootstrap fetched Framer and authenticated app-route chunks during slow public navigation.
* Monitoring could begin while public data and hero work were still active.
* A one-second below-fold delay remained too short on slow production traces; PublicSections/Framer could start before avatar paint and extend LCP.
* Bundle/resource timing proves these dependencies competed in the critical window. Exact JavaScript function-level attribution remains `UNKNOWN`.

## Implementation

### Routing and Data

* Added direct `/p/:username` and `/ar/p/:username` routes before `AppInterior`.
* Added a stable route skeleton.
* Started existing `portfolio-gate` and sanitized `get-public-portfolio` queries in the route shell.
* Reused exact TanStack Query keys in `PublicPortfolioPage`, preserving request deduplication.
* Kept gate/data calls on existing server functions; no direct collection read or permission change was introduced.

### Avatar

* Added `src/lib/publicAvatar.ts` for Appwrite Cloud `/view` to `/preview` conversion.
* Preserved existing project/token query values while adding bounded square dimensions, quality `82`, and WebP output.
* Added responsive `160/288/432 px` hero candidates and `64/96 px` sticky-header candidates.
* Added explicit hero `144x144` dimensions, eager loading, high fetch priority, async decode, and stable fallback.
* Left external and legacy avatar URLs unchanged.

### Layout and Scheduling

* Reserved typewriter geometry across all phrases.
* Stabilized the chat launcher/hint geometry.
* Removed Framer Motion from the public page and hero first-render path.
* Delayed monitoring ten seconds on exact portfolio routes.
* Excluded exact portfolio routes from the global app-route/Framer prefetch bootstrap.
* Delayed PublicSections, contact setup, and chat four seconds after sanitized data.
* Preserved eventual analytics, tracking, contact, interest, and chat behavior.

## Files Changed

### Runtime

* `src/App.tsx`
* `src/main.tsx`
* `src/pages/PublicPortfolioPage.tsx`
* `src/components/portfolio/public/PublicHero.tsx`
* `src/components/portfolio/public/StickyHeader.tsx`
* `src/components/portfolio/public/TypewriterText.tsx`
* `src/components/portfolio/public/ChatWidget.tsx`
* `src/lib/publicAvatar.ts`
* `src/lib/buildChunkPolicy.ts`
* `vite.config.ts`

### Tests

* `src/lib/__tests__/publicAvatar.test.ts`
* `src/lib/__tests__/viteChunkPolicy.test.ts`
* `src/components/portfolio/public/__tests__/PublicHero.test.tsx`
* `src/components/portfolio/public/__tests__/TypewriterText.test.tsx`
* `src/routing/__tests__/publicPortfolioPerformanceRoutes.test.ts`

## Product Commits

* `da5968bb5261023ef5531d5f61d7f8ec78e6ca91` - `perf(portfolio): optimize public mobile critical path`
* `8bab2a66aacce0e92b096c69853301f9c7fa75db` - `perf(portfolio): defer noncritical public work`
* `18110bb82ddfc14f5c138cf546019a0517e01326` - `perf(portfolio): remove residual avatar contention`
* `9e7020a0b7ce25c62b00425351ca537cb8d9e612` - `perf(portfolio): protect slow hero paint`

## Before and After

| Metric | Direct production baseline | Final production |
|---|---:|---:|
| Cold mobile LCP | `15.388 s` | `5.860 s` median (`5.124-6.408 s`) |
| Mobile CLS | `0.346` | `0.064` median |
| Estimated TBT | `3.672 s` | `0.922 s` median |
| Hero visible | `9.994 s` | `5.249 s` median |
| FCP | `11.432 s` | `5.748 s` median |
| TTFB | `0.566 s` | `0.476 s` median |
| Gate/data start | `8.638/8.649 s` | `3.623/3.635 s` median |
| Gate/data duration | approximately `0.50/0.58 s` | approximately `1.04/0.98 s` in the median trace |
| Avatar | two approximately `446 KB` original `/view` requests | one `11.25-11.28 KB`, `432 px`, WebP `/preview` request |
| Requests | `110` | `73` median in the acceptance window |
| Transfer | `1,882,125 B` | approximately `638,783 B` median before late monitoring completes; `796,585 B` when monitoring completed in-window |

The current mobile LCP element remains the avatar. The avatar itself now completes well before LCP; remaining paint delay is entry/provider startup, Appwrite response time, font/main-thread work, and browser paint scheduling.

## Final Local Production-Build Runs

Mobile viewport `390x844`, DPR 3, 150 ms latency, 200 KB/s download, approximately 94 KB/s upload, CPU x4, cache disabled.

| Run | Data start | Hero visible | Avatar end | LCP | CLS | Estimated TBT | Transfer |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | `3.740 s` | `5.625 s` | `5.292 s` | `7.556 s` | `0.040` | `1.378 s` | `611,147 B` |
| 2 | `3.493 s` | `5.255 s` | `4.991 s` | `5.432 s` | `0.061` | `0.788 s` | `611,154 B` |
| 3 | `3.933 s` | `5.943 s` | `5.548 s` | `6.100 s` | `0.041` | `1.276 s` | `611,154 B` |
| 4 | `3.671 s` | `6.233 s` | `5.861 s` | `6.432 s` | `0.041` | `1.329 s` | `611,144 B` |
| 5 | `3.367 s` | `5.099 s` | `4.960 s` | `5.144 s` | `0.060` | `0.979 s` | `611,154 B` |

Median local LCP was `6.100 s`. Vite preview serves uncompressed assets, so these runs are relative diagnostics. Every run issued one avatar request; PublicSections/Framer/contact/chat began after LCP.

## Final Production Runs

### Mobile

| State | LCP | CLS | Estimated TBT | Hero visible | Avatar | Requests/transfer |
|---|---:|---:|---:|---:|---:|---:|
| Cold 1 | `6.408 s` | `0.067` | `0.681 s` | `5.249 s` | `11,251 B` | `73 / 638,783 B` |
| Cold 2 | `5.124 s` | `0.064` | `0.922 s` | `5.073 s` | `11,283 B` | `73 / 638,752 B` |
| Cold 3 | `5.860 s` | `0.064` | `0.966 s` | `5.711 s` | `11,283 B` | `73 / 796,585 B` |
| Warm | `2.784 s` | `0.066` | `0.828 s` | `2.751 s` | cache hit | `70 / 316,053 B` |

Cold median LCP was `5.860 s`; median CLS `0.064`; median estimated TBT `0.922 s`. Optional chunks began between `8.626 s` and `9.248 s`, after LCP in all three cold runs.

### Desktop

* Cold: H1 LCP `1.996 s`, hero visible `1.970 s`, CLS `0.112`, estimated TBT `0.011 s`, one `3,361 B` `160 px` avatar request.
* Warm: hero visible `0.898 s`, FCP `0.912 s`; the no-interaction LCP observer later reported `5.328 s` when changing typewriter text became a larger candidate. Desktop CLS was `0.113` due below-fold/footer replacement in the tall viewport. The formal Phase 3 target was mobile CLS `<0.1`; desktop dynamic-text/late-section LCP/CLS remains a follow-up risk.

## Validation

* Comprehensive focused portfolio suite before the final scheduling-only change: `15` files / `98` tests passed.
* Final affected suite after the scheduling-only change: `6` files / `27` tests passed.
* `node tests/hubs/portfolio-password-verification.test.cjs` passed.
* `node tests/hubs/portfolio-settings.test.cjs` passed.
* `npx tsc --noEmit` passed; the final build reran it.
* `npm run build` passed with `5,820` modules and no sourcemaps.
* `git diff --check` passed with Windows line-ending warnings only.

## Deployment

* Vercel deployment `dpl_9hA3b3zKGZXddKKYrC4WmG54gBUn` is `READY` and `PROMOTED`.
* Git source SHA is exactly `9e7020a0b7ce25c62b00425351ca537cb8d9e612`.
* Aliases: `wiseresume.app`, `www.wiseresume.app`, and `resume.thewise.cloud`.
* Alias assignment succeeded with no alias error.
* Appwrite deployment: `NOT REQUIRED`; no Hub source changed.

## Production Functional and Security Evidence

* `/p/magdy`, `/ar/p/magdy`, and `/p/explore-test-123-updated-001` rendered with no horizontal overflow.
* Contact form rendered on the tested public portfolios.
* Interest action returned `200 {ok:true}`. The API creates the interaction and owner notification before returning success.
* Portfolio analytics returned `200` after render.
* Arabic route set `lang=ar`, `dir=rtl`, and retained the expected hero.
* Gate/data response scans found no `user_id`, owner ID, `password_hash`, `portfolio_settings`, or owner contact-email field.
* Unprotected navigations issued exactly one gate and one data execution.
* No `AppInterior` or original avatar `/view` request occurred.
* No page errors were observed. Existing console items remain: expected anonymous `/v1/account` `401`, browser warning for meta-delivered `frame-ancestors`, and the existing developer-theme Google Font CSP rejection.
* Vercel final-deployment error-log query returned no log records.

## Verification Limitations

* The documented `testprotected` fixture is stale. Live `portfolio-gate` reports `exists: false`; `get-public-portfolio` returns `Portfolio not found`. Production wrong-password/correct-unlock browser QA is unavailable until a safe protected fixture is restored.
* Realtime owner notification observation requires an authenticated owner session. Anonymous QA proved API success and the notification-creation transaction but could not subscribe to owner-scoped notification reads.
* Contact submission itself was not sent because Turnstile rejects headless automation. Rendering and unchanged regression contracts passed.

## Acceptance and Next Action

* Mobile CLS `<0.1`: PASS.
* Avatar transfer `<100 KB`: PASS.
* No private data exposure: PASS for scanned public responses.
* Contact/interest/analytics behavior: PASS for rendering and safe production action.
* Cold mobile LCP `<4.0 s`: FAIL (`5.860 s` median).

The phase is therefore `PASS_WITH_WARNINGS`, not `VERIFIED_READY`. The remaining delay occurs before optional portfolio work: the shared entry/provider graph delays route-shell requests to approximately `3.6 s`, then Appwrite and hero paint require roughly another `1.5-2.8 s`. Any follow-up must separately approve either a smaller public entry/provider graph or a pre-React request start that reuses the existing server-function and query-cache contract. Do not duplicate the backend, bypass the password gate, or broaden Appwrite permissions.

Keep Tailoring no-result/timeout and authenticated Broadcast `active` schema drift as separate tasks.
