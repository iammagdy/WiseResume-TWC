# WiseResume DevKit Visitor Analytics Upgrade Report

## Overview

This upgrade transforms the DevKit Growth & Traffic dashboard from a simple visitor analytics panel into a premium, full-featured command center. The Analytics tab is now the primary overview for the entire WiseResume application, while the Visitors tab focuses on session-level deep dives.

## What Changed

### Information Architecture Refactor

**Before:**
- Visitors was the default tab in Growth & Traffic
- Analytics was a secondary tab with basic KPIs and charts
- Session journal and journey lookup were in Visitors

**After:**
- **App Overview (Analytics)** is the DEFAULT tab — a command center for the whole app
- **Visitor Deep Dive (Visitors)** focuses on session/journey-level analytics only
- Tab labels renamed for clarity: "App Overview" and "Visitor Deep Dive"

### Analytics Tab (App Overview) — New Composition

| Section | Data Source | Description |
|---|---|---|
| A. Hero summary | `admin-devkit-data` + `admin-visitor-analytics` | One-line overview: visitor events, active users, AI credits, portfolio views, top country |
| B. KPI strip (2 rows) | `admin-devkit-data` + `admin-visitor-analytics` | Visits today, unique visitors, active users, AI credits, DAU, WAU, stickiness, portfolio views |
| C. Growth funnel | `admin-devkit-data` + `admin-visitor-analytics` | Full-width: Visitor → Signup → Created Resume → Used AI → Tailored → Exported/Shared |
| D. Traffic & active users chart | `admin-devkit-data` | Full-width area chart with events, active users, 7-day rolling average |
| E. Product usage grid | `admin-devkit-data` | Top product features (non-AI) with sparklines + activity heatmap |
| F. Acquisition grid | `admin-visitor-analytics` | Top referrers, top pages (cleaned), visitor countries, user profile countries, devices |
| G. AI usage section | `admin-devkit-data` | Credits today/yesterday/range + most-used AI tools with sparklines |
| H. System health | `admin-visitor-analytics` (health action) | Tracking status, ingestion health, performance metrics, missing schema warnings |

### Visitors Tab — Trimmed to Deep Dive

**Kept:**
- KPI strip (visits, unique visitors, new/returning, top country)
- World map (country distribution)
- Device/browser donut charts
- Top pages (ranked list)
- Click targets (ranked list)
- Section engagement (ranked list)
- Recent sessions list with pagination
- Journey lookup (search by anon_id or session_id)
- Activity heatmap (day-of-week × hour-of-day)
- New vs returning visitors
- OS breakdown + top interactions
- Diagnostics panel (visitor tracking health)
- Pre-signup cohort

**Moved to Analytics:**
- Daily trend chart (now in Analytics traffic chart)
- Top referrers (now in Analytics acquisition grid)
- Engagement funnel (now replaced by growth funnel in Analytics)
- Performance metrics (now in Analytics health section)

### Data Cleanup

New utility module `src/components/dev-kit/analytics/dataCleanup.ts`:

- **Page label normalization**: `/auth` → "Auth", `/dashboard` → "Dashboard", `/settings` → "Settings", etc.
- **Test route filtering**: Hides `/AUDIT_TEST`, `/test-*`, `/dev-test`, `/_test` routes from production top pages
- **Referrer normalization**: Strips `www.` prefix, hides `localhost`/`127.0.0.1` in production
- **Unknown labeling**: Replaces `??`, `null`, `undefined` with "Unknown"
- **Country labeling**: Visitor countries and user profile countries are labeled distinctly

## Files Changed

| File | Change |
|---|---|
| `appwrite-hubs/admin-visitor-analytics/src/main.js` | `runSafe` wrapper, enriched dashboard, new actions (health, export, hourly, referrers, returning, funnel, top-events), new computation helpers |
| `appwrite-hubs/track-visitor-event/src/main.js` | New event types (session_end, perf), /devkit ingestion guard, expanded sanitize() with new fields |
| `scripts/setup_visitor_events_schema.cjs` | Idempotent additive schema setup for all existing + new attributes |
| `src/AppInterior.tsx` | /devkit exclusion from useVisitorTracking |
| `src/components/dev-kit/GrowthTrafficPanel.tsx` | Analytics is now default tab; tab labels renamed |
| `src/components/dev-kit/AnalyticsPanel.tsx` | Full rewrite as command-center dashboard with dual data sources |
| `src/components/dev-kit/VisitorsPanel.tsx` | Trimmed to visitor/session deep-dive; removed sections moved to Analytics |
| `src/components/dev-kit/analytics/RangeSwitcher.tsx` | Added 24h range option |
| `src/components/dev-kit/analytics/types.ts` | Added 24h to AnalyticsRange |
| `src/components/dev-kit/analytics/dataCleanup.ts` | NEW: shared data cleanup utilities |
| `src/lib/visitorTrack.ts` | /devkit exclusion, UTM capture, retry queue, session_end/perf events |

## Schema Changes

Additive-only, idempotent. No destructive changes.

**New attributes created:**
- `duration_ms` (integer, optional)
- `label` (string, size 512, optional)
- `utm_source` (string, size 128, optional)
- `utm_medium` (string, size 64, optional)
- `utm_campaign` (string, size 128, optional)
- `is_returning` (boolean, optional)

**Existing attributes verified:** All 12 existing attributes confirmed present.

**Warning:** `country` attribute exists with size=10 (expected 110) — left unchanged (non-destructive).

**Index:** `idx_visitor_events_page` failed — `page` column (size 1024) exceeds Appwrite's 767-byte index key limit. Non-critical; queries work without the index.

**`$createdAt` index:** Not supported by Appwrite (system field). Correctly skipped.

## Functions Deployed

| Function | Status | Notes |
|---|---|---|
| `track-visitor-event` | Deployed, ready | API key updated |
| `admin-visitor-analytics` | Deployed, ready | API key updated, smoke check HTTP 200 |

No other functions were touched.

## Validation Results

| Check | Result |
|---|---|
| Typecheck (`tsc --noEmit`) | Clean |
| Lint (eslint) | Clean |
| Build (`vite build`) | Succeeds |
| Tests (`track-visitor-event.test.cjs`) | Pass |
| Design detector | No findings |
| Pre-existing test failures | 5 (unrelated: template branding, portfolio completion) |

## Live Verification

- DevKit → Growth & Traffic → App Overview (Analytics) is the default tab
- Visitor Deep Dive tab accessible and renders session-level data
- Both `admin-devkit-data` and `admin-visitor-analytics` functions execute successfully
- `/devkit` routes excluded from visitor tracking (3-layer guard)

## Known Limitations

1. **`country` attribute size**: Existing size=10 may truncate some country codes. Non-destructive — not modified.
2. **`page` index**: Cannot create index due to Appwrite 767-byte key limit on size-1024 strings.
3. **`$createdAt` filtering**: Appwrite does not support custom indexes on system attributes. Dashboard uses client-side date filtering within fetched documents.
4. **Growth funnel accuracy**: Funnel steps after "Visitors" are approximated from feature event names (resume, tailor, export, share). Exact conversion tracking would require dedicated funnel events.
5. **Visitor countries vs profile countries**: These are distinct data sources and are labeled separately in the UI. Visitor countries come from geo-resolved visitor events; profile countries come from registered user profiles.
6. **AI success/failure rates**: Not available in current `admin-devkit-data` analytics payload. Would require backend enrichment.
7. **Auto-refresh**: Only active on "Today" range, gated on `useReducedMotion()`.

## What Remains Missing

- Dedicated conversion events for precise funnel measurement
- AI request success/failure rate breakdown
- Real-time WebSocket-based live count (currently polled)
- `$createdAt` server-side filtering (Appwrite limitation)
- Page index for faster queries on large datasets
