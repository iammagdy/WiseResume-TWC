# WiseResume DevKit Visitors Analytics — Full Audit Report

**Date:** 2026-06-25 
**Auditor:** Cascade (automated code + live Appwrite inspection)
**Project:** WiseResume-TWC — Appwrite project `69fd362b001eb325a192`, database `main`
**Scope:** WiseResume frontend → `useVisitorTracking` / `visitorTrack` → Appwrite Function: `track-visitor-event` → Appwrite collection: `visitor_events` → Appwrite Function: `admin-visitor-analytics` → DevKit `VisitorsPanel` / Visitor Intelligence

---

## 1. Executive Summary

The visitor analytics pipeline **is now functional** after the 2026-06-23 remediation (PR #122). The root cause of the original "no visitors showing" issue was that the `track-visitor-event` function **did not exist** in Appwrite and was **not registered** in the deploy script — so all visitor events were silently lost. The remediation deployed the function, set its `APPWRITE_API_KEY` variable, and verified it with a smoke test.

**Live evidence as of 2026-06-25:**
- `track-visitor-event`: deployed, ready, Execute=Any, `APPWRITE_API_KEY` present
- `admin-visitor-analytics`: deployed, ready, all required variables present
- `visitor_events` collection: 51 documents, latest from 2026-06-25T17:22
- Synchronous test execution of `track-visitor-event` → `{"ok":true,"written":1}` ✅
- Synchronous test execution of `admin-visitor-analytics` dashboard → full KPI data returned ✅

**However**, the `admin-visitor-analytics` function has **not been called from the frontend** since 2026-06-23 (only 13 real executions total, last on 2026-06-23). This means the VisitorsPanel is either not being opened, or the DevKit session authentication is preventing the function call from reaching Appwrite.

**Failure classification: G — Multiple issues** (see §5).

---

## 2. Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite, Appwrite SDK v25)                                   │
│                                                                             │
│  AppInterior.tsx                                                            │
│    └─ useVisitorTracking({ userId, enabled: !isPublicStandalone })          │
│         ├─ trackPageView(path)      → fires on every navigation             │
│         ├─ trackClick(target, page) → fires on data-track clicks            │
│         ├─ trackSectionView(section, page) → fires on data-section scroll   │
│         └─ trackFeatureUse(name, page) → fires on feature use               │
│                                                                             │
│  visitorTrack.ts                                                            │
│    ├─ TIER 1 (pre-consent): ephemeral session ID, no localStorage           │
│    ├─ TIER 2 (post-consent): persistent anon_id in localStorage             │
│    ├─ Queue + flush every 10s (or on visibilitychange/pagehide)             │
│    └─ flush() → functions.createExecution('track-visitor-event', body,      │
│                  async=true) ← fire-and-forget, errors silently ignored     │
│                                                                             │
│  VisitorsPanel.tsx (DevKit)                                                 │
│    └─ devKitCall({ functionId: 'admin-visitor-analytics', action, payload })│
│         └─ appwriteFunctions.invoke()                                       │
│              └─ functions.createExecution('admin-visitor-analytics', body,  │
│                   async=false, path='/', method='POST')                     │
│                                                                             │
│  DevKit Auth: admin-devkit-data → verify-devkit-session → signed token      │
│    └─ Token stored in _devKitToken (module variable)                        │
│    └─ Sent as Bearer token in __headers.Authorization                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPWRITE FUNCTIONS                                                          │
│                                                                             │
│  track-visitor-event (node-22, timeout=30s, Execute=Any)                    │
│    ├─ Bot guard (BOT_UA regex)                                              │
│    ├─ Rate limiting (in-memory, per session/anon/IP)                        │
│    ├─ Sanitize events (allowlisted fields only)                             │
│    ├─ Write to visitor_events via APPWRITE_API_KEY (server-side)            │
│    └─ Strip optional fields (referrer, os) and retry on unknown attr error  │
│                                                                             │
│  admin-visitor-analytics (node-22, timeout=300s, Execute=Any)               │
│    ├─ Auth: verifySignedToken (HMAC-SHA256 with API_KEY/DEVKIT_PASSWORD)    │
│    ├─ Reads visitor_events via APPWRITE_API_KEY                             │
│    ├─ Actions: live-count, kpis, country-dist, top-pages, click-targets,    │
│    │   sections, sessions, cohort, dashboard, journey                       │
│    └─ MAX_TOTAL_DOCS cap: 5000 (prevents timeout on large datasets)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPWRITE DATABASE                                                           │
│                                                                             │
│  Database: main                                                             │
│  Collection: visitor_events                                                 │
│    Attributes: user_id, session_id, anon_id, event_type, page, target,      │
│      section, country, device_type, browser, metadata, referrer, os         │
│    Indexes: idx_visitor_events_event_type, idx_visitor_events_session_id,   │
│      idx_visitor_events_anon_id                                             │
│    Document count: 51 (as of 2026-06-25T18:55)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Code Findings

### 3.1 Frontend Tracking (`src/lib/visitorTrack.ts`)

- **Two-tier tracking**: Pre-consent (ephemeral session ID, no localStorage) and post-consent (persistent `anon_id`).
- **`trackPageView`**: Always fires (pre-consent). Queues a `page_view` event.
- **`trackClick` / `trackSectionView` / `trackFeatureUse`**: Only fire if consent is granted (`getConsent() === true`). This is a **consent gate** — click and section events are blocked until the user accepts cookies.
- **Flush mechanism**: `setInterval(flush, 10_000)` + `visibilitychange` + `pagehide`. Calls `functions.createExecution('track-visitor-event', body, true)` with `async=true` (fire-and-forget).
- **Error handling**: `try/catch` in `flush()` silently ignores all errors — analytics never surfaces failures to the visitor.
- **Country resolution**: `fetch('https://ip-api.com/json/?fields=countryCode')` — client-side geo lookup cached in `sessionStorage`. **This is failing in production** (all events have `country=null` except the smoke test).

### 3.2 Frontend Hook (`src/hooks/useVisitorTracking.ts`)

- Correctly wired: fires `page_view` on navigation, attaches delegated click listener for `data-track` elements, observes `data-section` elements with `IntersectionObserver`.
- Syncs `user_id` via `setVisitorUserId`.
- `enabled` flag passed from `AppInterior.tsx` as `!isPublicStandalone`.

### 3.3 Frontend Integration (`src/AppInterior.tsx`)

- `useVisitorTracking({ userId: user?.id ?? null, enabled: !isPublicStandalone })` — correctly enables tracking for app routes and excludes public standalone routes.
- Does NOT exclude `/devkit` routes — admin's own visits are tracked.

### 3.4 DevKit VisitorsPanel (`src/components/dev-kit/VisitorsPanel.tsx`)

- Calls `admin-visitor-analytics` via `devKitCall` with `functionId: 'admin-visitor-analytics'`.
- Fetches `live-count` (fast diagnostic) and `dashboard` (full data) actions.
- Has auto-retry on transient failures (`NETWORK_ERROR` or `FUNCTION_RUNTIME_FAILED`).
- Shows empty state with helpful diagnostics when `eventCount === 0` or data is null.
- Gated on `isUnlocked` from `useDevKitSession()` — shows "Visitor data locked" if DevKit session is not unlocked.

### 3.5 DevKit Auth (`src/lib/devkit/devKitAuth.ts`, `src/lib/devkit/devKitClient.ts`)

- `devKitAuthHeaders()` returns `{ Authorization: 'Bearer <token>' }` from `getDevKitToken()`.
- `devKitCall()` calls `appwriteFunctions.invoke()` which packs headers into `__headers` in the execution body (SDK limitation: custom HTTP headers can't be forwarded).
- `devKitLogin()` calls `admin-devkit-data` with `action: 'verify-devkit-session'` — verifies Appwrite JWT + admin label, returns signed session token.

### 3.6 `track-visitor-event` Function (`appwrite-hubs/track-visitor-event/src/main.js`)

- Bot guard: `BOT_UA` regex filters crawlers/monitors.
- Rate limiting: in-memory, per `session_id` / `anon_id` / IP. `RL_MAX_PER_WINDOW` per window.
- Sanitization: allowlisted fields only, unknown fields dropped.
- Write: `databases.createDocument('main', 'visitor_events', ID.unique(), doc)` using `APPWRITE_API_KEY`.
- Unknown attribute handling: strips `referrer` and `os` (optional fields) and retries.
- Config: `APPWRITE_API_KEY` (required), `APPWRITE_FUNCTION_API_ENDPOINT` / `APPWRITE_ENDPOINT` (fallback), `APPWRITE_FUNCTION_PROJECT_ID` / `APPWRITE_PROJECT_ID` (fallback).

### 3.7 `admin-visitor-analytics` Function (`appwrite-hubs/admin-visitor-analytics/src/main.js`)

- Auth: `verifySignedToken` — HMAC-SHA256 signed token verified against `APPWRITE_API_KEY`, `APPWRITE_FUNCTION_API_KEY`, or `DEVKIT_PASSWORD`. Token must have `purpose === 'devkit'` and valid `exp`.
- Reads `visitor_events` via `APPWRITE_API_KEY` with `databases.read` scope.
- Actions: `live-count`, `kpis`, `country-dist`, `top-pages`, `click-targets`, `sections`, `sessions`, `cohort`, `dashboard`, `journey`.
- `MAX_TOTAL_DOCS` cap: 5000 (prevents timeout).
- `dashboard` action aggregates all data in one call (KPIs + country + pages + clicks + sections + sessions + cohort).

### 3.8 Deploy Script (`scripts/deploy_hubs.cjs`)

- `track-visitor-event` is in the `HUBS` registry (added in PR #122).
- `desiredFunctionSettings` forces `execute: ['any']` for all hubs.
- `syncVariablesForHubs` sets `APPWRITE_API_KEY` on `track-visitor-event` from the deploy secret.
- `admin-visitor-analytics` is in the `sharedAdminIds` list — gets `DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `ADMIN_EMAIL`, `ADMIN_TEST_HMAC_SECRET`.
- Deploy workflow: `.github/workflows/deploy-appwrite-hubs.yml` — manually triggered (`workflow_dispatch`).

### 3.9 Schema Script (`scripts/setup_visitor_events_schema.cjs`)

- Only adds `referrer` (512) and `os` (32) string attributes.
- Additive only — checks if attribute exists before creating.
- Does NOT create the base collection or the 11 original attributes.

### 3.10 Documentation (`Project Atlas/`)

- `visitor_events.md` references Supabase sources (legacy, pre-Appwrite migration). Schema description matches but sources are outdated.
- `track-visitor-event.md` references Supabase deploy (legacy). Production status says "ACTIVE — deployed 2026-05-05 via `supabase functions deploy`" — this is stale; the Appwrite-native deployment was 2026-06-23.
- `appwrite-remediation-deploy-and-schema-2026-06-23.md` is the authoritative record of the fix.

---

## 4. Live Appwrite Findings

### 4.1 Function: `track-visitor-event`

| Property | Value |
|---|---|
| Exists | ✅ Yes |
| Runtime | node-22 |
| Execute permissions | `["any"]` ✅ |
| Enabled | true |
| Timeout | 30s |
| Deployment ID | `6a3a16ec8f1873b7e7a0` |
| Deployment created | 2026-06-23T05:17:32.957Z |
| Deployment status | ready ✅ |
| Variables | `APPWRITE_API_KEY` [SECRET] ✅ |
| `APPWRITE_ENDPOINT` | Not set (falls back to `APPWRITE_FUNCTION_API_ENDPOINT` or hardcoded default) |
| `APPWRITE_PROJECT_ID` | Not set (falls back to `APPWRITE_FUNCTION_PROJECT_ID` or hardcoded default `69fd362b001eb325a192`) |
| Total executions | 41 |
| Latest execution | 2026-06-25T17:22:43Z (completed, 200) |
| All recent executions | status=completed, code=200, responseBody=(empty — expected for async=true) |

### 4.2 Function: `admin-visitor-analytics`

| Property | Value |
|---|---|
| Exists | ✅ Yes |
| Runtime | node-22 |
| Execute permissions | `["any"]` ✅ |
| Enabled | true |
| Timeout | 300s |
| Deployment ID | `6a39c3d59ceddcd150b0` |
| Deployment created | 2026-06-22T23:23:01.883Z |
| Deployment status | ready ✅ |
| Variables | `DEVKIT_PASSWORD` [SECRET] ✅, `APPWRITE_ENDPOINT` [SECRET] ✅, `APPWRITE_PROJECT_ID` [SECRET] ✅, `APPWRITE_API_KEY` [SECRET] ✅, `ADMIN_TEST_HMAC_SECRET` [SECRET] ✅ |
| Total executions | 15 (13 real + 2 audit test) |
| Last real execution | 2026-06-23T02:14:30Z |
| All executions | status=completed, code=200 (one 400 on 2026-06-20) |

### 4.3 Collection: `visitor_events`

| Property | Value |
|---|---|
| Exists | ✅ Yes |
| Enabled | true |
| Document count | 51 (as of 2026-06-25T18:55) |
| Latest document | 2026-06-25T18:55:41Z (audit test) / 2026-06-25T17:22:51Z (real visitor) |

**Attributes:**

| Attribute | Type | Size | Required | Status |
|---|---|---|---|---|
| `user_id` | string | 65000 | optional | ✅ |
| `session_id` | string | 255 | optional | ✅ |
| `anon_id` | string | 255 | optional | ✅ |
| `event_type` | string | 50 | optional | ✅ |
| `page` | string | 1024 | optional | ✅ |
| `target` | string | 255 | optional | ✅ |
| `section` | string | 255 | optional | ✅ |
| `country` | string | 110 | optional | ✅ |
| `device_type` | string | 50 | optional | ✅ |
| `browser` | string | 100 | optional | ✅ |
| `metadata` | string | 4000 | optional | ✅ (extra, not used by tracker) |
| `referrer` | string | 512 | optional | ✅ (added by setup script) |
| `os` | string | 32 | optional | ✅ (added by setup script) |

**Indexes:**
- `idx_visitor_events_event_type` (event_type) ✅
- `idx_visitor_events_session_id` (session_id) ✅
- `idx_visitor_events_anon_id` (anon_id) ✅

**Schema drift:** No drift detected. All 13 attributes present and match code expectations. The `metadata` attribute is extra (not used by the current tracker but harmless).

### 4.4 Document Analysis (51 documents)

| Time range | Count | Pages | Event types |
|---|---|---|---|
| 2026-06-23 (smoke test) | 1 | `/` | page_view (country=US) |
| 2026-06-23 (real visitors) | 48 | `/`, `/auth`, `/dashboard`, `/settings`, `/auth/reset-password` | page_view, section_view |
| 2026-06-24 | 7 | `/`, `/auth`, `/dashboard` | page_view |
| 2026-06-25 | 3 | `/` | page_view |
| 2026-06-25 (audit test) | 1 | `/AUDIT_TEST_1782413933264` | page_view |

**Key observations:**
- All events have `country=null` except the smoke test (country=US) — **geo resolution is failing**.
- Only `page_view` and `section_view` events — **no `click` or `feature_use` events** (these require consent).
- `section_view` events only from 2026-06-23 — suggests consent was granted by at least one user that day.
- Low volume: ~50 events in 2 days.

### 4.5 Synchronous Test Executions

**Test 1: `track-visitor-event` (synchronous)**
```
Input: { events: [{ event_type: 'page_view', page: '/AUDIT_TEST_1782413933264', ... }], userAgent: 'Mozilla/5.0 ...' }
Result: status=completed, code=200, responseBody={"ok":true,"written":1}
Document count: 50 → 51 ✅
```

**Test 2: `admin-visitor-analytics` live-count (synchronous)**
```
Input: { action: 'live-count', __headers: { Authorization: 'Bearer <signed_token>' } }
Result: status=completed, code=200, responseBody={"success":true,"liveCount":1,"totalEvents":51}
```

**Test 3: `admin-visitor-analytics` dashboard (synchronous)**
```
Input: { action: 'dashboard', range: '7d', page_num: 0, __headers: { Authorization: 'Bearer <signed_token>' } }
Result: status=completed, code=200, responseBody={"success":true,"data":{"kpis":{"totalVisitsToday":4,"uniqueVisitorsToday":4,"totalVisits":42,"uniqueVisitors":23,...},"countryDist":[...],"topPages":[...],"sections":[...],"sessions":{...}}}
```

All three tests passed. The entire pipeline is functional.

---

## 5. Root Cause

### Original Issue (pre-2026-06-23)

The `track-visitor-event` function **did not exist** in Appwrite and was **not registered** in `deploy_hubs.cjs`. The frontend was calling `functions.createExecution('track-visitor-event', ...)` but Appwrite returned a 404 (function not found). The `try/catch` in `flush()` silently swallowed the error. Result: zero events were ever written to `visitor_events`, and the VisitorsPanel showed "0 documents."

This was fixed by PR #122 (2026-06-23): the function was added to the `HUBS` registry, deployed, and its `APPWRITE_API_KEY` variable was set. A smoke test confirmed `{"ok":true,"written":1}`.

### Current Status (2026-06-25)

The pipeline **is now working**:
- 51 documents in `visitor_events` (events from 2026-06-23 through 2026-06-25)
- `track-visitor-event` is receiving and processing executions (41 total)
- `admin-visitor-analytics` returns correct data when called

### Why VisitorsPanel May Still Appear Empty

The `admin-visitor-analytics` function has **not been called from the frontend** since 2026-06-23 (only 13 real executions, last on 2026-06-23). Possible reasons:

1. **User has not opened the VisitorsPanel since the fix** — the panel was checked before 2026-06-23 (when the collection was empty), showed no data, and hasn't been revisited.
2. **DevKit session authentication failure** — the `admin-visitor-analytics` function requires a signed DevKit token. If `admin-devkit-data` fails to mint the token (e.g., missing `DEVKIT_PASSWORD`, JWT validation failure, admin label not set), the VisitorsPanel's `devKitCall` will receive a 401, which would show as an error in the panel.
3. **DevKit session locked/expired** — the 15-minute inactivity timeout may have locked the session before the user navigated to the Visitors tab.

### Failure Classification: **G — Multiple issues**

1. **Fixed:** `track-visitor-event` was not deployed (root cause of original empty analytics)
2. **Active:** `admin-visitor-analytics` not being called from frontend (likely user hasn't checked since fix, or DevKit auth issue)
3. **Active:** Country geo-resolution failing (`ip-api.com` blocked or CORS issue) — all events have `country=null`
4. **Active:** No click/section events being recorded (consent gate blocks these — consent may not be being granted)

---

## 6. Evidence

### Evidence 1: `track-visitor-event` function exists and is deployed
```
track-visitor-event: EXISTS
  runtime: node-22
  execute: ["any"]
  enabled: true
  timeout: 30
  deploymentId: 6a3a16ec8f1873b7e7a0
  deploymentCreatedAt: 2026-06-23T05:17:32.957+00:00
  variables: APPWRITE_API_KEY:[SECRET]
```

### Evidence 2: `admin-visitor-analytics` function exists and is deployed
```
admin-visitor-analytics: EXISTS
  runtime: node-22
  execute: ["any"]
  enabled: true
  timeout: 300
  deploymentId: 6a39c3d59ceddcd150b0
  deploymentCreatedAt: 2026-06-22T23:23:01.883+00:00
  variables: DEVKIT_PASSWORD:[SECRET], APPWRITE_ENDPOINT:[SECRET], APPWRITE_PROJECT_ID:[SECRET], APPWRITE_API_KEY:[SECRET], ADMIN_TEST_HMAC_SECRET:[SECRET]
```

### Evidence 3: `visitor_events` collection has 51 documents with correct schema
```
visitor_events: EXISTS
  attributes: user_id(string,65000,optional), session_id(string,255,optional), anon_id(string,255,optional),
    event_type(string,50,optional), page(string,1024,optional), target(string,255,optional),
    section(string,255,optional), country(string,110,optional), device_type(string,50,optional),
    browser(string,100,optional), metadata(string,4000,optional), referrer(string,512,optional), os(string,32,optional)
  indexes: idx_visitor_events_event_type(event_type), idx_visitor_events_session_id(session_id), idx_visitor_events_anon_id(anon_id)
  documentCount: 51
```

### Evidence 4: Synchronous test of `track-visitor-event` — writes successfully
```
Test execution:
  status: completed
  responseStatusCode: 200
  responseBody: {"ok":true,"written":1}
Document count: 50 → 51
Latest doc: 2026-06-25T18:55:41.393Z page=/AUDIT_TEST_1782413933264 event_type=page_view
```

### Evidence 5: Synchronous test of `admin-visitor-analytics` dashboard — returns data
```
responseBody: {"success":true,"data":{"kpis":{"totalVisitsToday":4,"uniqueVisitorsToday":4,"totalVisits":42,
"uniqueVisitors":23,"newVisitors":23,"returningVisitors":0,"topCountry":"??","topCountryCount":50,
"mobilePct":22,"desktopPct":78,...},"countryDist":[{"country":"??","count":50},{"country":"US","count":1}],
"topPages":[{"name":"/","count":22,"sessions":20},{"name":"/auth","count":11,"sessions":7},...],...}}
```

### Evidence 6: `track-visitor-event` execution history (41 total, latest today)
```
2026-06-25T17:22:43 status=completed code=200
2026-06-25T07:36:24 status=completed code=200
2026-06-25T06:39:43 status=completed code=200
2026-06-24T20:24:51 status=completed code=200
... (41 total)
```

### Evidence 7: `admin-visitor-analytics` execution history (15 total, last real on 2026-06-23)
```
2026-06-25T18:56:50 status=completed code=200  ← AUDIT TEST
2026-06-25T18:56:39 status=completed code=200  ← AUDIT TEST
2026-06-23T02:14:30 status=completed code=200  ← LAST REAL EXECUTION
2026-06-23T02:14:30 status=completed code=200
2026-06-23T02:14:18 status=completed code=200
2026-06-22T23:23:52 status=completed code=200
...
```

### Evidence 8: All events have `country=null` (geo resolution failing)
```
2026-06-25T17:22:51 page=/ event=page_view country=N/A
2026-06-25T07:36:31 page=/ event=page_view country=N/A
2026-06-24T20:24:55 page=/ event=page_view country=N/A
... (all N/A except smoke test with country=US)
```

### Evidence 9: Remediation doc confirms original root cause
From `appwrite-remediation-deploy-and-schema-2026-06-23.md`:
> **`track-visitor-event`** did not exist in Appwrite and was **not registered in `deploy_hubs.cjs`**... A `track-visitor-event` execution returned `200 {"ok":true,"written":1}` and a `visitor_events` row landed... The collection was empty (0 rows) beforehand — confirming the old browser-direct writes were all silently rejected.

---

## 7. Comparison to the Working Personal Portfolio Analytics

The personal portfolio analytics uses a 4-layer architecture:
1. Frontend tracker
2. Ingestion API (edge function)
3. Append-only events table
4. Protected stats/dashboard API

WiseResume's architecture maps directly:
1. `useVisitorTracking` / `visitorTrack.ts` → frontend tracker ✅
2. `track-visitor-event` Appwrite Function → ingestion API ✅
3. `visitor_events` Appwrite collection → append-only events table ✅
4. `admin-visitor-analytics` Appwrite Function → protected stats/dashboard API ✅

**Key differences:**
- Portfolio uses Supabase Edge Functions with RLS; WiseResume uses Appwrite Functions with API key auth
- Portfolio uses Cloudflare headers for geo (`CF-IPCountry`); WiseResume uses client-side `ip-api.com` fetch (currently failing)
- Portfolio uses `checkIpRateLimit` (120 req/min); WiseResume uses in-memory rate limiting per session/anon/IP
- Portfolio allows anon+authenticated inserts via RLS; WiseWrite uses server-side API key writes (more secure)
- Portfolio has `stitch-visitor-identity` to link anon → user post-signup; WiseResume does not have this (events carry `user_id` only if consent + auth at time of event)

**Parity gaps:**
- No `stitch-visitor-identity` equivalent in WiseResume (anon events are never retroactively linked to a user after signup)
- No `purge-old-visitor-events` cron in WiseResume (events accumulate indefinitely)
- Country resolution is broken in WiseResume (client-side `ip-api.com` vs server-side Cloudflare headers in portfolio)

---

## 8. Recommended Fix Plan (DO NOT IMPLEMENT)

### Phase 1: Minimal fix to make visitors record (ALREADY DONE ✅)

The 2026-06-23 remediation already fixed the core issue:
- ✅ `track-visitor-event` deployed and registered in `deploy_hubs.cjs`
- ✅ `APPWRITE_API_KEY` variable set
- ✅ Execute permission = `any`
- ✅ Smoke test confirmed writes work

**Action needed:** Verify the VisitorsPanel loads data by opening DevKit → Growth → Visitors tab with an unlocked DevKit session. If it still shows no data, check the DevKit auth flow (see Phase 2).

### Phase 2: Diagnostics / health improvements

1. **Verify DevKit auth flow**: Open DevKit, check if `admin-devkit-data` `verify-devkit-session` action returns a valid signed token. Check browser console for errors.
2. **Add `APPWRITE_ENDPOINT` and `APPWRITE_PROJECT_ID` variables to `track-visitor-event`**: Currently relies on Appwrite-injected `APPWRITE_FUNCTION_*` fallbacks. Explicit variables are more robust.
3. **Fix country geo-resolution**: Replace client-side `ip-api.com` fetch with server-side geo in `track-visitor-event` (use `CF-IPCountry` header or Appwrite's geo headers). Alternatively, use a CORS-friendly geo API.
4. **Add execution logging to `track-visitor-event`**: The `async=true` executions have empty `responseBody` in Appwrite — add `log()` calls to capture write counts for debugging.
5. **Add `flush` error logging**: The `visitorTrack.ts` `flush()` silently swallows all errors. Add `console.warn` in dev mode to help diagnose issues.

### Phase 3: Parity with personal portfolio analytics

1. **Implement `stitch-visitor-identity`**: After a user signs up, retroactively update their pre-signup `anon_id` events with their `user_id`.
2. **Add `purge-old-visitor-events` cron**: Automatically delete events older than N days to prevent unbounded growth.
3. **Add `city` attribute**: The portfolio has `city` from Cloudflare headers; WiseResume only has `country`.
4. **Add `created_at` index**: For efficient time-range queries (currently queries scan all documents).
5. **Increase `MAX_TOTAL_DOCS` or add pagination**: The 5000 cap may truncate results on high-traffic periods.

### Phase 4: UI/UX improvements

1. **Show country distribution with "Unknown" instead of "??"**: When `country` is null, display "Unknown" instead of "??".
2. **Add consent banner visibility indicator**: In DevKit, show whether the consent banner is being displayed and how many users have granted consent.
3. **Add tracking health dashboard**: Show execution counts, success rates, and error rates for `track-visitor-event` in DevKit Diagnostics.
4. **Add "last event received" timestamp**: Show the timestamp of the most recent event in the VisitorsPanel header for quick health checks.

---

## 9. Risks

### Security
- `track-visitor-event` has `Execute=Any` — anyone can call it. Bot guard and rate limiting are the only abuse controls. A determined attacker could flood the collection with garbage events.
- `admin-visitor-analytics` has `Execute=Any` but requires a signed DevKit token — the token is verified via HMAC-SHA256. If `DEVKIT_PASSWORD` or `APPWRITE_API_KEY` leaks, an attacker could mint valid tokens.
- The signed token's HMAC secret is `APPWRITE_API_KEY` (or `DEVKIT_PASSWORD`). If the API key is rotated, old tokens become invalid immediately.

### Privacy
- Pre-consent tracking uses ephemeral session IDs (no localStorage) — GDPR-safe.
- Post-consent tracking uses persistent `anon_id` in localStorage — user can decline via consent banner.
- `user_id` is only included when consent is granted AND user is authenticated.
- **Risk**: The `visitor_events` collection has no retention policy — events accumulate indefinitely. Consider a purge cron.

### Rate Limits
- In-memory rate limiting in `track-visitor-event` is per-runtime instance. If Appwrite scales to multiple runtime instances, the rate limit is per-instance (not global).
- `RL_MAX_PER_WINDOW` allows a limited number of requests per window per session/anon/IP.

### Bot Filtering
- `BOT_UA` regex covers common crawlers but may miss newer user agents.
- Legitimate browsers with "Headless" in their UA (e.g., Puppeteer users) will be filtered.
- No IP-based bot filtering (only UA-based).

### Admin Self-Tracking
- `useVisitorTracking` is enabled for all non-public-standalone routes, including `/devkit`. Admin's own visits are tracked.
- **Risk**: Admin visits inflate metrics. Consider excluding `/devkit` routes from tracking.

### Data Volume
- 51 events in 2 days — very low volume. The `MAX_TOTAL_DOCS` cap of 5000 is not a concern at this scale.
- If traffic increases, the `dashboard` action may timeout (300s) when fetching and aggregating thousands of events.
- No pagination on `dashboard` action (fetches all events in range up to 5000).

---

## 10. Final Yes/No Checklist

| Check | Status | Notes |
|---|---|---|
| `track-visitor-event` exists | ✅ Yes | Deployed 2026-06-23, deployment ready |
| `track-visitor-event` active deployment live | ✅ Yes | Deployment `6a3a16ec8f1873b7e7a0`, status=ready |
| `track-visitor-event` Execute = Any | ✅ Yes | `execute: ["any"]` |
| `track-visitor-event` has `APPWRITE_API_KEY` | ✅ Yes | Variable present [SECRET] |
| `visitor_events` exists | ✅ Yes | Collection in database `main` |
| `visitor_events` has required schema | ✅ Yes | All 13 attributes present, 3 indexes |
| Frontend calls `track-visitor-event` | ✅ Yes | 41 executions, documents being written |
| Executions appear after app visit | ✅ Yes | Latest execution 2026-06-25T17:22 |
| `visitor_events` count increases | ✅ Yes | 51 documents (was 0 before 2026-06-23) |
| `admin-visitor-analytics` exists | ✅ Yes | Deployed 2026-06-22, deployment ready |
| `admin-visitor-analytics` can read `visitor_events` | ✅ Yes | Dashboard test returned full data |
| VisitorsPanel renders data | ⚠️ Unverified | No frontend executions since 2026-06-23; needs manual verification |

---

## Test Events Created During Audit

1. **`track-visitor-event` synchronous test**: `page_view` to `/AUDIT_TEST_1782413933264` — written successfully, document count 50→51.
2. **`admin-visitor-analytics` live-count test**: Called with signed token — returned `totalEvents: 51`.
3. **`admin-visitor-analytics` dashboard test**: Called with signed token — returned full dashboard data.

All test events are clearly identifiable by the `AUDIT_TEST` prefix and `audit-test-session` session ID.

---

*Audit complete. No code changes, redeployments, or Appwrite setting modifications were made. One test document was written to `visitor_events` (clearly identifiable). Two test executions were created on `admin-visitor-analytics` (clearly identifiable).*
