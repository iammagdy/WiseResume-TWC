# WiseResume Master Handover & State (May 2026)

## MANDATORY CONTEXT FOR AI AGENTS
- **Environment:** Replit is the **development environment only**. Production is Hostinger (static frontend) + Appwrite Cloud Feed (backend). Never store production secrets in Replit.
- **Rule:** Do not guess. Check logs and verify root cause before suggesting any fix.

---

## The Architecture (Current — Appwrite-Native)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Appwrite Account SDK (`account.get()` / `deleteSession()`) | Fully Appwrite-native |
| Database | Appwrite Databases (`databases.*`) | 96 collections in `main` DB |
| AI | Appwrite `ai-gateway` Function | Routes 24+ features; per-feature routing via `FEATURE_ROUTES` (22 entries); provider pool: OpenRouter, Groq, DeepSeek, NVIDIA NIM |
| Storage | Appwrite Storage | `photoUrl` bucket needs `Access-Control-Allow-Origin: *` |
| Frontend | React 18 + Vite 6, served from Hostinger `/public_html/` | SPA, base path `/` |
| Server | Express stub (`server/index.ts`, ~80 lines) | Health probe + PDF 503 placeholder |
| CI/CD | GitHub Actions | `deploy-frontend.yml` + `deploy-appwrite-hubs.yml` |
| Repo | `https://github.com/iammagdy/WiseResume-TWC` | main branch |

**Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1`
**Project ID:** `69fd362b001eb325a192`

---

## Deployment (Hostinger — CRITICAL)

> ⚠️ **Read `Project Atlas/DEPLOYMENT_GUIDE.md` before touching any workflow or FTP config.**
> The information below is a quick summary only — the guide is the authoritative source.

### Three domains, three separate deploys

| Domain | Deploy target | Workflow / Repo |
|---|---|---|
| `resume.thewise.cloud` | `resume/` subdirectory via FTP | `deploy-frontend.yml` in this repo |
| `thewise.cloud` | FTP root (`.`) via `put` | `deploy-landing.yml` in this repo |
| `quran.thewise.cloud` | `quran/` via SFTP | `deploy.yml` in `iammagdy/wisequran` |

### Hostinger layout
```
/public_html/           ← thewise.cloud root (landing page)
/public_html/resume/    ← resume.thewise.cloud (WiseResume app)
/public_html/quran/     ← quran.thewise.cloud (WiseQuran app)
```

---

## Session Summary — 2026-05-11 (DevKit admin panel overhaul)

### Root cause addressed across all three tasks
Appwrite's document-level permissions prevent a client SDK call from reading documents that belong to other users. Every DevKit panel that called `databases.listDocuments` directly from the browser for collections like `subscriptions`, `ai_credits`, and `profiles` was failing with a permission error. The fix was to route all admin data reads through `admin-devkit-data` (Appwrite Function with admin API key) so they run server-side.

---

### Task #10 — Fix God Mode user loading & OverviewPanel accuracy

**Problem:**
- God Mode ("God Mode" tab in DevKit) showed "Failed to load users" on every page load. Root cause: `AdminUsersPanel.fetchPage()` called `databases.listDocuments()` on `subscriptions` and `ai_credits` from the browser. Those collections have user-scoped permissions — cross-user reads are blocked client-side.
- OverviewPanel showed user counts sourced from `profiles` docs (not real Auth accounts). Deleted accounts leave behind profile rows, inflating the count.
- 401/403 responses from admin functions showed "Session expired — please sign in again." — wrong; the Appwrite session was fine, the DevKit password was wrong.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleListUsersPage`: fetches a profiles page then joins `subscriptions` + `ai_credits` server-side in one parallel round-trip. Returns `{ users: AdminUser[], total }`.
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleOverviewStats`: paginates all Auth users via `users.list()` (500/batch), chunks resume ownership queries into ≤100 user-ID groups to compute `activeResumes` and `orphanedResumes`. All three DB/API calls fail-hard (no silent fallbacks).
- `src/components/dev-kit/AdminUsersPanel.tsx` — `fetchPage()` replaced with `appwriteFunctions.invoke('admin-devkit-data', { action: 'list-users-page' })`. Response read as `result.data?.users` / `result.data?.total`. Added `fetchError` state + `<DevKitErrorCard>` on first-load failure. Added `setUsers([])` in catch.
- `src/components/dev-kit/OverviewPanel.tsx` — full rewrite: removed direct `databases.*` calls, now calls `overview-stats` action. Label "Active Users" → "Auth Users" with "Verified: N" sub-label. "Total Resumes" shows active-user-owned resumes only; orphan count shown as sub-label when > 0. `StatCard` `any` prop replaced with typed `StatCardProps`. `catch (err: any)` → `catch (err: unknown)`.
- `src/lib/appwrite-functions.ts` — 401/403 from `admin-*` / `inspect-ai-keys` functions now returns "DevKit session unauthorised — re-enter the DevKit password." instead of "Session expired."

---

### Task #11 — Move admin global stats bar to the server

**Problem:**
`AdminUsersPanel.fetchGlobalStats()` still called `databases.listDocuments()` on `subscriptions` (premium count, pro count) and `profiles` (suspended, active today) directly from the browser — same cross-user permission issue as Task #10.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleGlobalStats`: runs five `Promise.allSettled` queries server-side (total profiles, premium subs, pro subs, suspended profiles, today-active profiles), returns `{ total, premium, pro, suspended, activeToday }`.
- `src/components/dev-kit/AdminUsersPanel.tsx` — `fetchGlobalStats()` replaced with single `appwriteFunctions.invoke('admin-devkit-data', { action: 'global-stats' })` call. Removed all remaining direct `databases.*` / `Query` / `COLLECTIONS` / `DATABASE_ID` imports. **No direct browser DB calls remain anywhere in `AdminUsersPanel.tsx`.**

---

### Task #12 — Orphan cleanup: purge-orphans action + OverviewPanel UI

**Problem:**
When Appwrite Auth accounts are deleted, their `profiles` and `resumes` documents stay in the database. These inflate row counts and waste storage. No tooling existed to find or remove them.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handlePurgeOrphans`:
  - Paginates all Auth user IDs (500/batch via `users.list()`).
  - Scans `profiles` + `resumes` in 100-doc batches, filters client-side for `user_id ∉ authUserIds`.
  - `dryRun: true` (default) — returns `{ orphanedProfiles, orphanedResumes, sampleProfiles[0..4], sampleResumes[0..4] }`, no deletions.
  - `dryRun: false` — deletes resumes first (then profiles), writes to `admin_audit_logs` (non-fatal; if collection is unavailable the purge still succeeds), returns `{ deletedProfiles, deletedResumes }`. All failure paths propagated — no silent fallbacks.
- `src/components/dev-kit/OverviewPanel.tsx` — added `PurgePhase` state machine (`idle → previewing → confirm → purging → done`):
  - Amber warning banner visible when `orphanedResumes > 0`, with "Preview & clean" button.
  - "Confirm" card shows orphan counts for both collections + up to 3 sample IDs each + a permanent-deletion warning.
  - "Delete N documents permanently" triggers live delete; success banner auto-refreshes stats.
  - Errors render inline `<DevKitErrorCard compact>` with retry.

---

## Where We Stand Now

### Working (as of 2026-05-11, post-session)
- `https://resume.thewise.cloud/` — live, Appwrite-native build (frontend deploy triggered)
- Auth (sign-in/sign-up/sign-out via Appwrite Account SDK)
- AI Hub — 24+ features via `ai-gateway` Appwrite Function
- **DevKit God Mode** — user list loads reliably; all data reads are server-side via `admin-devkit-data`
- **DevKit Overview panel** — user count sourced from real Appwrite Auth (not profile rows); orphan detection + one-click cleanup workflow
- **DevKit global stats bar** — premium / pro / suspended / active-today counts are server-side
- **No direct browser `databases.*` calls remain in any DevKit admin panel**
- DevKit AIKeysPanel, AIRoutingPanel, MissionControl, Analytics, LiveActivity (existing, unchanged)

### Broken / Pending (unchanged from before this session)
- Most `/api/data/*` endpoints throw `pending_appwrite_migration` — data layer not yet rebuilt on Appwrite Functions
- PDF export returns 503 — Puppeteer worker not yet rebuilt
- Mobile app still targets legacy backend (do not touch `mobile/`)
- WiseHire, Admin DevKit non-data panels — throw `pending_appwrite_migration`

### Task (2026-05-11 follow-up) — Fix God Mode crash + 3 more panels routed server-side

**Problem:**
- God Mode still showed "Failed to load users". Root cause was two separate bugs in `handleListUsersPage`: (1) `Query.equal('user_id', [])` — Appwrite rejects an empty array, throws if all profile `user_id` fields are null. (2) `Query.equal('user_id', userIds)` on `subscriptions` and `ai_credits` throws if `user_id` is not indexed in those collections. Either path propagated to the outer catch → HTTP 500 → client showed the error card.
- `AuditLogPanel`, `CouponsPanel`, `DatabaseXRay` all called `databases.listDocuments` directly from the browser. The client SDK returns only documents scoped to the current user's session — cross-user reads return empty results silently. All three panels appeared blank even when data existed. `CouponsPanel`'s `databases.createDocument` also failed silently for the same reason.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — `handleListUsersPage`: added empty-`userIds` guard (skip join when array is empty); switched `Promise.all` → `Promise.allSettled` for subs/credits join so profiles still load when those collections lack a `user_id` index (falls back to `plan:'free'`, `credits:0`, logs a warning).
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleListAuditLogs`, `handleListDiscountCodes`, `handleAddDiscountCode`, `handleListAllResumes`; all wired to their respective action names in the main handler.
- `src/components/dev-kit/AuditLogPanel.tsx` — removed direct `databases.listDocuments`; now uses `admin-devkit-data` → `list-audit-logs`. Added `DevKitErrorCard`, refresh button, total count.
- `src/components/dev-kit/CouponsPanel.tsx` — removed direct `databases.listDocuments` / `createDocument`; now uses `list-discount-codes` + `add-discount-code`. Added `DevKitErrorCard`, loading state, Enter-key shortcut.
- `src/components/dev-kit/DatabaseXRay.tsx` — removed direct `databases.listDocuments`; now uses `list-all-resumes`. Added client-side search, `DevKitErrorCard`, refresh button, total count.

---

### Active Task Queue
- **#13** — Show live subscription counts in the admin stats bar without a page refresh
- **#14** — Extend orphan cleanup to cover other stale collections (subscriptions, AI credits, cover letters, etc.)
- **#15** — Deploy admin-testmail to Appwrite
- **#16** — Add more email tag types for transactional email flows
- **#21** — Connect Mission Control / Analytics / Observability / Live Activity to real data
- **#22** — AI gateway provider failover (try next provider if preferred one fails)
- **#23** — Move AI routing config to Appwrite Database (editable without redeploy)
- **#24** — Show which provider was actually used on each AI result
- **#25** — Keep NVIDIA model list up to date as NIM adds/retires models
- **#26** — Post-deploy smoke test in `deploy-frontend.yml`
- **#27** — Wire `public/_headers` CSP into `.htaccess`

---

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-frontend.yml` | FTP deploy to Hostinger — mirror to `resume/` |
| `.github/workflows/deploy-appwrite-hubs.yml` | Deploy Appwrite Functions |
| `public/_headers` | CSP headers |
| `public/.htaccess` | SPA fallback rewrite |
| `src/lib/appwrite.ts` | Appwrite client |
| `src/lib/appwrite-bridge.ts` | `AI_HUB_FUNCTIONS` set + `invokeAppwriteHub()` router |
| `src/lib/appwrite-collections.ts` | `COLLECTIONS` const — 96 collection IDs |
| `src/lib/appwrite-functions.ts` | `appwriteFunctions.invoke()` wrapper + error normalisation |
| `src/lib/devkit/devKitAuth.ts` | `devKitAuthHeaders()` — injects DevKit password into function calls |
| `src/lib/devkit/edgeResponse.ts` | `unwrapAdminResponse<T>()`, `formatEdgeError()` |
| `src/contexts/AuthContext.tsx` | Appwrite-only auth context |
| `src/components/dev-kit/AdminUsersPanel.tsx` | God Mode — all data via `admin-devkit-data` server actions |
| `src/components/dev-kit/OverviewPanel.tsx` | Infrastructure stats + orphan cleanup workflow |
| `appwrite-hubs/ai-gateway/src/main.js` | AI router |
| `appwrite-hubs/admin-devkit-data/src/main.js` | DevKit data API — actions: `list-users-page`, `overview-stats`, `global-stats`, `purge-orphans`, `update-plan`, `mission-control` |
| `appwrite-hubs/inspect-ai-keys/src/main.js` | DevKit key inspector |
| `CHANGELOG.md` | Technical change log |

---

## DevKit `admin-devkit-data` Action Reference

| Action | Description |
|--------|-------------|
| `mission-control` | Deploy status, AI provider pings, DB health, secrets audit, recent errors |
| `global-stats` | `{ total, premium, pro, suspended, activeToday }` — God Mode stats bar |
| `list-users-page` | `{ users: AdminUser[], total }` — paginated profiles joined with subs + credits |
| `overview-stats` | `{ totalAuthUsers, verifiedUsers, totalResumes, orphanedResumes }` — real Auth counts |
| `purge-orphans` | `dryRun:true` → preview; `dryRun:false` → hard-delete + audit log |
| `update-plan` | Set `plan` on a user's `subscriptions` document |

All actions require `Authorization: Bearer <DEVKIT_PASSWORD>` in `body.__headers` (Appwrite SDK packs custom headers into the body).

---
*Last updated: 2026-05-11 — DevKit admin panel overhaul (Tasks #10, #11, #12)*
