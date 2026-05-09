## 2026-05-09 — New Appwrite Functions: admin-visitor-analytics + admin-onboarding-funnel

### Files created
- `appwrite-hubs/admin-visitor-analytics/package.json` — Node.js 18 manifest; depends on `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-visitor-analytics/src/main.js` — Multi-action Appwrite Function (~290 lines) implementing:
  - `live-count` — counts unique `anon_id`s with activity in the last 5 minutes; returns `{ liveCount, topCountries }` (top-level, no `data` wrapper, matching `MissionControlPanel` expectation).
  - `kpis` — aggregates today + range page-views, unique visitors, device/browser breakdown, top country from `visitor_events`.
  - `country-dist` — visit counts grouped by 2-letter country code.
  - `top-pages` — most visited page paths with session count.
  - `click-targets` — most-clicked `data-track` elements; optionally filtered by `page`.
  - `sections` — most-viewed page sections with unique-visitor count.
  - `sessions` — paginated (50/page) session list built by grouping events; returns `{ sessions, total, page }`.
  - `cohort` — unique visitors grouped by ISO week label.
  - `journey` — all events for a `session_id` or `anon_id`, sorted chronologically.
- `appwrite-hubs/admin-visitor-analytics/README.md` — deploy guide (Console + CLI), variable table, collection schema, action reference.
- `appwrite-hubs/admin-onboarding-funnel/package.json` — Node.js 18 manifest; depends on `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-onboarding-funnel/src/main.js` — Single-action Appwrite Function (~220 lines):
  - Accepts `{ days, granularity }` from `OnboardingFunnelPanel`.
  - Fetches `audit_logs` documents with `category = 'onboarding'` in the requested rolling window.
  - Computes per-step unique-user funnel (`started → path_selected → review_opened → completed`).
  - Computes `methodBreakdown` (CV upload / LinkedIn / manual), `skipRates` (skip events ÷ users that reached the step), `saveFailures` (grouped error messages), and a time-series `series` array bucketed by day or week with all gaps filled as 0.
  - Sets `truncated: true` when event volume ≥ 9 999.
- `appwrite-hubs/admin-onboarding-funnel/README.md` — deploy guide, variable table, collection schema, funnel-step reference.

### What this unblocks
`VisitorsPanel` and the `MissionControlPanel` live-count call `admin-visitor-analytics`. `OnboardingFunnelPanel` calls `admin-onboarding-funnel`. Both panels have been failing with "Function not found" since the Supabase cutover. Once these functions are deployed in Appwrite Console (project `69fd362b001eb325a192`, fra), both panels become operational.

---

## 2026-05-09 — New Appwrite Function: admin-devkit-data

### Files created
- `appwrite-hubs/admin-devkit-data/package.json` — Node.js 18 package manifest; depends on `node-appwrite ^11.1.1` and `axios ^1.4.0`.
- `appwrite-hubs/admin-devkit-data/src/main.js` — full multi-action Appwrite Function (5 actions, ~430 lines). Implements:
  - `mission-control` — GitHub latest-commit fetch, production site ping, OpenRouter/Groq/Resend provider health pings, Appwrite DB connectivity check, secrets inventory from Function Variables, last 10 errors from `error_log`, last 5 admin actions from `admin_audit_logs`.
  - `analytics` — range-bucketed (today/7d/30d/90d/all) aggregations over `usage_events`, `ai_usage_logs`, `portfolio_visits`, `profiles`; returns full `PremiumAnalyticsData` shape including `rangeKpis`, `activitySeries`, `dauRollingSeries`, `newVsReturning`, `heatmap`, `topFeaturesRanged`, `topReferrers`, `deviceBreakdown`, `countryRanking`.
  - `observability` → `get_telemetry` (aggregates `edge_function_logs` into per-function p50/p95/error-rate/sparkline rows), `get_error_stream` (filters `error_log` by since/function_name/severity), `mark_reviewed` (updates a document in `error_log`).
  - `live-activity` → `usage_events`, `error_log`, `contact_requests` resources.
  - `edge-fn-drift` — lists all deployed Appwrite Functions; returns count, oldest/newest deploy timestamps, count older than 30 days.
- `appwrite-hubs/admin-devkit-data/README.md` — deploy instructions (Console + CLI), full variable table, request/response shapes for all 5 actions, collection-permission matrix.

### What this unblocks
Mission Control, Analytics, Observability, and Live Activity panels all call `admin-devkit-data`. Until now every call returned "Function with the requested ID could not be found". Once this function is deployed in Appwrite Console (project `69fd362b001eb325a192`, fra), all four panels will become functional.

---

## 2026-05-09 — DevKit: error messages migrated from Supabase → Appwrite references

### Files changed
- `src/lib/devkit/errorTranslate.ts` — replaced `SUPABASE_DIRECTIVE` constant with `APPWRITE_DIRECTIVE` (project ID `69fd362b001eb325a192`, fra region); rewrote all six existing error patterns so every `humanMessage`, `hint`, and `aiPromptHead` references Appwrite Functions and the Appwrite Console instead of Supabase/Kinde; added a new seventh pattern matching "Function with the requested ID could not be found" which tells the admin the Appwrite Function is not yet deployed; added an eighth pattern for Appwrite Database collection/document not found; JSDoc on `ErrorContext.function` field updated from "Supabase Edge Function name" to "Appwrite Function name".
- `src/components/dev-kit/EmailManagementPanel.tsx` — inline "RESEND_API_KEY is not configured" warning now directs admin to Appwrite Console → Functions → admin-email → Variables (was Supabase dashboard → Edge Functions → Secrets).
- `src/components/dev-kit/EmailAutomationsPanel.tsx` — audience-unconfigured link changed from `https://supabase.com/dashboard` / "Supabase Edge Function Secrets" to `https://cloud.appwrite.io` / "Appwrite Function Variables".

### What this fixes
Every "Copy AI fix prompt" in a DevKit error card was telling the AI assistant to check "production Supabase (project ref jnsfmkzgxsviuthaqlyy)". Supabase has been fully decommissioned. The prompts now correctly reference Appwrite and give actionable steps (deploy via Appwrite Console, update Appwrite Function Variables). Two panel-level UI strings also referenced Supabase and are now corrected.

---

## 2026-05-09 — DevKit: per-panel crash boundaries + MissionControl initial-render guard

### Files changed
- `src/pages/DevToolsPage.tsx` — added `DevKitPanelBoundary` import; `renderPanel()` now wraps every panel case in `<DevKitPanelBoundary panelName="…">` via a local `wrap()` helper; a single panel crash no longer takes down the whole DevKit shell — the sidebar, header, and all other tabs stay live; the boundary shows the error name, stack trace, component stack, timestamp, and a "Copy full error" button so crashes can be reported precisely.
- `src/components/dev-kit/MissionControlPanel.tsx` — initial-render guard changed from `!data && loading` to `!data && (loading || !error)` — the skeleton now shows on the very first render tick (before the `useEffect` fires and sets `loading: true`) so the full UI never renders with `data === null`.

### Bug fixed
Production error `TypeError: Cannot read properties of undefined (reading 'data')` was crashing one or more DevKit panels and propagating to the global error boundary, which made it look like the whole `/devkit` route was down. Root cause: no `DevKitPanelBoundary` was scoped to individual panels in `renderPanel()`, so any panel-level throw reached React's root. The boundary is now applied to all 20 panels.

## 2026-05-09 — DevKit: all hidden panels wired + Cmd+K palette + session context

### Files changed
- `src/pages/DevToolsPage.tsx` — full rewrite: wrapped in `DevKitSessionProvider`; replaced local `isAuthenticated` state with `useDevKitSession()` `isUnlocked`; password and passkey login both call `unlock()` so all panels receive a live session token; auto-unlock from remembered session via `loadRememberedToken()`; sidebar reorganised into 7 labelled groups; all 20 panels imported and rendered; Cmd+K command palette (⌘K / Ctrl+K) with live search; session lock countdown warning; mobile "More" sheet shows all panels in a grid grouped by category; `MissionControlPanel` receives correct `onNavigate` handler with tab-to-id map; panel count badge in sidebar footer.
- `src/components/dev-kit/AITestSlotModelsCard.tsx` — new component; reads per-slot AI test model config via `fetchAITestSlotModels()` helper; displays OpenRouter / Groq / DeepSeek slot models with override-vs-default label; "Manage in AI Radar" button deep-links to ai panel via `onNavigateToKeys` prop; handles loading / error / refresh states.

### Previously hidden panels now connected (12 total)
`AnalyticsPanel`, `VisitorsPanel`, `LiveActivityPanel`, `MissionControlPanel`, `ObservabilityPanel`, `EmailManagementPanel`, `EmailAutomationsPanel`, `FeatureFlagsPanel`, `ModerationPanel`, `OnboardingFunnelPanel`, `PortfolioUsernamesPanel`, `DevKitRunner`.

### Root cause of panels being hidden
`DevKitSessionProvider` was never mounted anywhere in the app. Panels that call `useDevKitSession()` would have thrown "must be used within DevKitSessionProvider" at runtime. Now the provider wraps the entire DevTools shell.
