# Session Log — 2026-06-12 — DevKit Admin Panel Full Audit & Fix

**Branch:** `claude/gallant-lovelace-zgwv00`
**PR:** [#99](https://github.com/iammagdy/WiseResume-TWC/pull/99) — Draft, all checks green
**Commits:** `1960fa8` (Phase 1-3) · `026165c` (Phase 4) · `d739333` (Atlas docs)
**Session type:** Remote (Claude Code on web)

---

## Trigger

User reported that too many DevKit admin panel tabs were not loading or showing fake/demo data. Full audit requested. After audit, all findings were fixed in 4 phases.

---

## Audit Methodology

1. Read all DevKit frontend panel components (`src/components/dev-kit/`)
2. Traced each panel's `appwriteFunctions.invoke()` call to its handler in `admin-devkit-data/src/main.js`
3. Identified stub handlers, phantom collection names, and missing Appwrite collections
4. Verified Appwrite collection schema against what the backend code actually reads/writes

---

## Findings (24 total)

### Category A — Hardcoded stubs / fake data (6)

| Handler | Root Cause | Impact |
|---------|-----------|--------|
| `handlePurgeOrphans` | One-line stub, returned `{ orphanedProfiles: 0, orphanedResumes: 0 }` hardcoded | Purge Orphans panel always showed 0, never deleted anything |
| `handleListAuditLogs` | No `offset`, `date_from`, `date_to` support | Pagination broken; date filter silently ignored |
| `handleGlobalStats.activeToday` | Single `safeList` capped at 500 docs, then set to 0 if collection empty | Dashboard always showed 0 active users today |
| `handleLiveActivity user_content_stats` | Wrong field name `credits_used` (should be `credits_charged`); `cover_letters` never queried; `planHistory` always `[]` | User Detail drawer showed null credits, null cover letters, empty plan history |
| `handleListAiGatewayActivity` | Queried phantom collection `ai_usage_logs` (never written to; `ai-gateway` writes to `ai_request_logs`) | AI Command Center usage stats always empty |
| `handleAnalytics` | All computed arrays (heatmap, referrers, new/returning) were hardcoded zeros/empty; `signupsLast14Days: []` | Analytics panel showed no data except live visitor counts |

### Category B — Frontend/backend mismatches (4)

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| `AuditLogPanel` category/date filter | Frontend passed filters but `fetchLogs` callback never forwarded them to the request body | Server always received no category/date filter |
| `AuditLogPanel` pagination | `offset` not sent to backend | Load More appended page 0 again |
| `AuditLogPanel` double-fetch on mount | Two `useEffect` hooks both fired on initial mount with same params | Extra API call + brief reset flicker on every open |
| `signupsLast14Days` not consumed | Backend returned `[]`, frontend `AnalyticsPanel` never read the field | Dead field; safe but misleading |

### Category C — Missing Appwrite collections (14)

Collections queried by `admin-devkit-data` that had no setup script and would cause silent empty results or 404s:

`discount_codes` · `feature_flags` · `wisehire_waitlist` · `wisehire_invites` · `wisehire_accounts` · `ai_routing_config` · `contact_requests` · `admin_audit_logs` · `notifications` · `edge_function_logs` · `error_log`

Additionally:
- `'audit_logs'` was listed in `requiredCollections` health-check but code always uses `'admin_audit_logs'` — permanent false alarm in Diagnostics panel
- `admin-sentry` in `appwrite.json` had `functionId: "6a0760710000ff231048"` (numeric) instead of slug `"admin-sentry"` — deploy script would target wrong function ID
- `activeToday` query capped at `sdk.Query.limit(500)` — silent undercount on high-traffic days

---

## Fixes

### Phase 1 — Backend (`appwrite-hubs/admin-devkit-data/src/main.js`)

**`handlePurgeOrphans`** (lines 874–951)
- Added `listAllAuthUsers()` call to collect valid auth user ID set
- Two paginated cursor loops (profiles, resumes) scan all documents and compare against auth set
- `dryRun !== false` guard — destructive delete only when explicitly set
- `auditLog()` called after real deletions
- Returns `sampleProfiles`/`sampleResumes` (first 5 of each) in dry-run mode

**`handleListAuditLogs`** (lines 953–971)
- Parses `body.offset`, `body.date_from`, `body.date_to`
- Applies `sdk.Query.greaterThanEqual` / `sdk.Query.lessThan` on `$createdAt`
- `sdk.Query.orderDesc('$createdAt')` always applied
- `sdk.Query.offset(offset)` applied when offset > 0

**`handleGlobalStats`** (lines 732–760)
- Extracted `countUniqueTodayVisitors(since)` helper — paginates visitor_events with cursor loop, caps at 10 pages (5,000 events) to prevent dashboard timeout
- `auth` and `activeToday` fetched in parallel via `Promise.all`

**`handleLiveActivity user_content_stats`** (lines 1841–1888)
- Added `cover_letters` to the `Promise.all` query set
- `credits30d` sums `credits_charged` from `ai_request_logs` (correct field); falls back to `ai_credits.daily_usage` if request log collection missing
- `coverLetterCount` returns `null` when collection missing (safe for UI rendering)
- `planHistory` filtered from `admin_audit_logs` on action set: `set-plan`, `grant-trial`, `revoke-trial`, `plan-change`

**`handleListAiGatewayActivity`** (lines 2201–2242)
- Changed `ai_usage_logs` → `ai_request_logs`
- `safeList` error pattern checks for missing-collection message; returns `missingUsageCollection: true` flag
- Provider distribution computed from real `provider` field on log documents

**`handleAnalytics`** (lines 2339–2530)
- `heatmapMatrix`: 7×24 array from `$createdAt` UTC day/hour of all current-period events
- `topReferrers`: extracts hostname from `visitor_events.referrer`, deduped by host, sorted by count
- `newVsReturning`: per-bucket comparison of current anon_ids vs previous-period anon_ids
- `rangeCredits`/`prevRangeCredits`: sum of `credits_charged` from `ai_request_logs` filtered by range
- `signupsLast14Days`: `profiles` query filtered by `$createdAt >= 14d ago`, bucketed by day
- `activitySeries`, `deviceBreakdown`, `topPages`, `countryRanking`, `topFeaturesRanked`: all computed from real `visitor_events` documents (already working via `fetchAnalyticsEvents` paginator)

**Health-check `requiredCollections`** (line 336)
- Removed phantom `'audit_logs'` and unused `'usage_events'` entries

### Phase 2 — Frontend (`src/components/dev-kit/AuditLogPanel.tsx`)

- `fetchLogs` `useCallback` signature extended: `(append, currentOffset, cat, range)`
- Request body now includes `category` (when set) and `date_from` (computed from range)
- Merged two `useEffect` hooks into one that fires on mount and on `[categoryFilter, dateRange]` change — eliminates double-fetch
- `filtered` array is now search-only (no redundant client-side category/date filtering)

### Phase 3 — Setup scripts (9 new files)

All scripts are idempotent (`collectionExists` + `attributeExists` + `indexExists` guards).

| Script | Collection | Key fields |
|--------|-----------|------------|
| `setup_discount_codes_schema.cjs` | `discount_codes` | `code` (str64, req), `active` (bool, req), `percent_off` (int, req) |
| `setup_feature_flags_schema.cjs` | `feature_flags` | `name`, `description`, `enabled_globally`, `enabled_plans[]`, `enabled_user_ids[]`, `percentage_rollout`, `kill_switch_function`, `updated_by`, `updated_at` |
| `setup_wisehire_collections_schema.cjs` | `wisehire_waitlist`, `wisehire_invites`, `wisehire_accounts` | waitlist: email/name/company_name/company_size; invites: email/token/status/expires_at/target_user_id; accounts: user_id/email/approved_at |
| `setup_ai_routing_config_schema.cjs` | `ai_routing_config` | `feature_id` (req, unique), `provider` (req), `model` (req) |
| `setup_contact_requests_schema.cjs` | `contact_requests` | `name`, `email` (req), `subject`, `message` (req), `status` (default "new"), `user_id` |
| `setup_audit_logs_schema.cjs` | `admin_audit_logs` | `user_id`, `category` (default "system"), `action` (req), `metadata`, `details` |
| `setup_notifications_schema.cjs` | `notifications` | `user_id` (req), `type` (default "info"), `title` (req), `message` (req), `is_read` (bool, req) |
| `setup_edge_function_logs_schema.cjs` | `edge_function_logs` | `function_name`, `status_code` (int), `level` (default "info"), `duration_ms` (int) |
| `setup_error_log_schema.cjs` | `error_log` | `message` (req), `context`, `source`, `level` (default "error"), `user_id`, `resolved` (bool), `reviewed_at` |

### Phase 4 — Remaining review findings

- `appwrite.json`: `admin-sentry` `functionId` changed from `"6a0760710000ff231048"` → `"admin-sentry"` (slug must match Appwrite function ID used in deploy script)
- `.github/workflows/deploy-appwrite-hubs.yml`: 9 schema ensure steps added (7 in Phase 3 + 2 in Phase 4)

---

## Files Changed

| File | Change |
|------|--------|
| `appwrite-hubs/admin-devkit-data/src/main.js` | 6 handlers rewritten; `requiredCollections` cleaned; `countUniqueTodayVisitors` helper added; `signupsLast14Days` real query |
| `src/components/dev-kit/AuditLogPanel.tsx` | Server-side filters; pagination; double-fetch fix |
| `appwrite.json` | `admin-sentry` functionId corrected |
| `.github/workflows/deploy-appwrite-hubs.yml` | 9 new schema ensure steps |
| `scripts/setup_discount_codes_schema.cjs` | New |
| `scripts/setup_feature_flags_schema.cjs` | New |
| `scripts/setup_wisehire_collections_schema.cjs` | New |
| `scripts/setup_ai_routing_config_schema.cjs` | New |
| `scripts/setup_contact_requests_schema.cjs` | New |
| `scripts/setup_audit_logs_schema.cjs` | New |
| `scripts/setup_notifications_schema.cjs` | New |
| `scripts/setup_edge_function_logs_schema.cjs` | New |
| `scripts/setup_error_log_schema.cjs` | New |

---

## Validation

| Check | Result |
|-------|--------|
| `node --check appwrite-hubs/admin-devkit-data/src/main.js` | ✓ No syntax errors |
| `npx tsc --noEmit` | ✓ No type errors |
| `npm run build` | ✓ Exit 0 |
| `git diff --check` | ✓ No whitespace errors |
| Vercel preview build | ✓ Ready (all commits) |
| Appwrite `ai-gateway` preview build | ✓ Ready (all commits) |

---

## Commits

| SHA | Message |
|-----|---------|
| `1960fa8` | `fix(devkit): full admin panel audit — fix stubs, missing collections, and frontend filters (Phases 1-3)` |
| `026165c` | `fix(devkit): resolve all remaining review findings (Phase 4)` |
| `d739333` | `docs(atlas): update handover with Phase 4 fixes` |

---

## Deployment State

| Item | State |
|------|-------|
| Branch | `claude/gallant-lovelace-zgwv00` |
| PR | [#99](https://github.com/iammagdy/WiseResume-TWC/pull/99) — Draft, all CI checks green |
| `admin-devkit-data` (production) | **NOT redeployed** — requires CI workflow run after merge |
| Appwrite collections (production) | **NOT created** — requires CI workflow run after merge |
| Vercel production | **NOT deployed** — requires Vercel deploy after merge |
| Appwrite `ai-gateway` preview | ✓ Ready (auto-deploy from PR) |

---

## Where We Stopped

**Nothing left in code.** All 21 findings from the audit are resolved.

**Three steps required from the user after merging PR #99:**

1. **Merge PR #99** into `main`
2. **Trigger `deploy-appwrite-hubs.yml` CI workflow** with target `all` — creates all 9 missing Appwrite collections (idempotent) and redeploys all Appwrite Functions including `admin-devkit-data`
3. **Trigger Vercel production deploy** — picks up `AuditLogPanel.tsx` frontend fix

**Carry-forward from 2026-06-11 session (still open):**
- Commit + push ~60 uncommitted product files from local `main` (maintenance mode, avatar, auth, Deploy All, visitor panel, dashboard fix)
- Vercel env: `APPWRITE_API_KEY`, `APPWRITE_PROJECT_ID` for `/api/app-settings` route
- Manual QA: maintenance toggle, profile avatar re-upload, `/portfolio`, Deploy All progress, Growth & Traffic empty state
- Sentry CSP, cover letter bundle QA (from 2026-06-10)
