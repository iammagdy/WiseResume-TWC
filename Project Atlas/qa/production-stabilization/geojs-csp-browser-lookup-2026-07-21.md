# GeoJS CSP Browser Lookup Audit and Resolution

**Date:** 2026-07-21
**Environment:** Production, `https://wiseresume.app`
**Product Commit:** `d6f0709ecb517b5c8f246825765867bfd6ce24c5`
**Vercel Deployment:** `dpl_EwaBNSHJ2LSF6NiKnMfjnhzPro3n`
**Verdict:** VERIFIED_READY

## Scope

This report covers the focused GeoJS CSP warning audit and minimal resolution. It does not reopen owner permissions, legacy Tailor History reads, Appwrite Realtime CSP, Appwrite hub deployment, Tailoring, Cover Letters, payments, credits, AI routing, or Appwrite schema work.

## Confirmed Root Cause

`src/lib/visitorTrack.ts` fetched `https://get.geojs.io/v1/ip/country.json` directly from the browser during visitor page-view tracking. Production CSP did not include GeoJS in `connect-src`, so the request was blocked and logged as a CSP warning.

The browser GeoJS path was not required for product behavior. It only attempted to enrich visitor analytics with a country code before sending events to the Appwrite `track-visitor-event` function.

## Classification

Browser GeoJS was classified as:

- `OPTIONAL_ANALYTICS_ENRICHMENT`
- `PRIVACY_RISK`

It was not a required dependency for auth, security decisions, payments, credits, AI routing, resume exports, Tailoring, Cover Letters, dashboard loading, or public portfolio rendering.

## Trace

- `src/pages/AppLanding.tsx` calls `useVisitorTracking({ userId: null })`.
- `src/pages/AppInterior.tsx` calls `useVisitorTracking({ userId: user?.id ?? null, enabled: !isPublicStandalone && !location.pathname.startsWith('/devkit') })`.
- `src/hooks/useVisitorTracking.ts` calls `trackPageView(path)` on route navigation and wires delegated click, section, performance, and session-end tracking.
- `src/lib/visitorTrack.ts` previously attempted browser GeoJS resolution, cached country in `sessionStorage`, and re-flushed queued events.
- `flush()` posts event batches to Appwrite `functions.createExecution('track-visitor-event', ...)`.
- `appwrite-hubs/track-visitor-event/src/main.js` writes `visitor_events` and can enrich missing country server-side from Appwrite request metadata; it still contains a server-side GeoJS fallback if metadata is unavailable.
- DevKit visitor analytics consume stored `visitor_events.country` as aggregate analytics only. Missing country displays as Unknown or empty aggregate data.

## Resolution

Removed the browser GeoJS request instead of widening CSP.

Changes:

- Removed direct browser fetch to `https://get.geojs.io/v1/ip/country.json`.
- Removed browser country session cache and the re-flush after country lookup.
- Kept visitor analytics event submission intact.
- Left `country` unset in browser event payloads so Appwrite ingestion can enrich from request metadata when available.
- Added focused regression tests for the no-browser-GeoJS behavior and CSP guard.

No Appwrite hubs were deployed. No Appwrite schema, permission, environment variable, AI, credit, payments, or provider settings were changed.

## Validation

- `npx vitest run src/lib/__tests__/visitorTrack.geo.test.ts` - PASS, 4 tests.
- `node tests/hubs/track-visitor-event.test.cjs` - PASS.
- `npx tsc --noEmit` - PASS.
- `npm run build` - PASS, with existing Browserslist and chunk-size warnings only.
- `git diff --check` - PASS, with Windows line-ending warnings only.

## Deployment Evidence

- Product commit `d6f0709ecb517b5c8f246825765867bfd6ce24c5` was pushed to `origin/main`.
- Vercel production deployment `dpl_EwaBNSHJ2LSF6NiKnMfjnhzPro3n` reached `READY`.
- Vercel deployment commit matched `d6f0709ecb517b5c8f246825765867bfd6ce24c5`.
- Vercel runtime log scan for the last hour returned no runtime errors.

## Production Browser Evidence

Production browser smoke covered:

- `https://wiseresume.app/?geojs_audit=landing`
- `https://wiseresume.app/dashboard?geojs_audit=dashboard`

Observed results:

- Landing loaded with status OK and title `WiseResume AI - AI Resume Builder`.
- Authenticated dashboard loaded and displayed `Good afternoon, QA`.
- Appwrite account endpoint returned 200.
- Captured network requests contained no `get.geojs.io` requests.
- Captured network requests contained no `country.json` requests.
- `track-visitor-event` Appwrite executions continued for page/performance/session events.
- Captured visitor event payloads had no browser-derived `country`.
- No GeoJS `connect-src` CSP violation appeared.
- The only CSP warning observed was the known warning that `frame-ancestors` is ignored when delivered by a meta tag.
- Appwrite Realtime websocket URLs were observed for `wss://fra.cloud.appwrite.io/v1/realtime?project=69fd362b001eb325a192`.
- Manual browser websocket probe to Appwrite Realtime returned `open`.

Production HTML check:

- `https://wiseresume.app/` returned 200.
- HTML contained no `get.geojs.io`.
- HTML contained no `country.json`.
- Active CSP did not include GeoJS.

## Privacy and Security

- Removed direct browser IP exposure to GeoJS.
- Did not add a third-party GeoIP host to browser CSP.
- Did not add new data collection or storage fields.
- Did not change auth, authorization, Appwrite permissions, database schema, AI routing, or billing logic.
- Remaining server-side GeoJS fallback is outside this browser CSP fix and should be reviewed separately if the owner wants country analytics to avoid all third-party GeoIP dependency.

## Remaining Risks

- Country analytics may show Unknown when Appwrite request metadata is unavailable.
- The Appwrite `track-visitor-event` hub still contains a server-side GeoJS fallback, but it was not changed or deployed in this task.
- Cover Letter Pro/Premium verification remains `BLOCKED_EXTERNAL_ACCESS`.
