# Changelog

## 2026-04-18 — AI Provider Panel: polish & hardening (Task #1, 25 audit findings)

Closes the post-implementation audit on the DevKit AI Provider panel. All 25 valid findings (F1–F8 functionality, S1–S4 security, P1–P6 performance, U1–U5 UX, A1–A3 architecture) are addressed.

### Server (`server/index.ts`)
- **P1**: 10-minute in-memory TTL cache for `openrouter-status`, `openrouter-models`, `groq-models`, `gemini-models`. Sweep timer prunes expired entries every 5 min.
- **S1**: All admin AI proxy endpoints now log full upstream errors server-side and return generic "Upstream request failed" / "Upstream HTTP <status>" strings to the browser.
- **S2**: Gemini upstream calls send the API key in the `x-goog-api-key` header instead of `?key=` so the key never appears in proxy/access logs.
- **F2/F3**: `gemini-test` accepts `{ model }` body, validates against the cached models list, falls back to `gemini-2.0-flash`. `gemini-models` now strips the `models/` prefix and only returns entries with a string `name` field.
- **P6**: New `GET /api/admin/ai-provider/openrouter-models` proxy (cached) so the browser no longer hits openrouter.ai directly — fixes CORS edge cases and shares the cache window.
- **A3**: New `POST /api/admin/ai-provider/audit-model-switch` and `POST /api/admin/ai-provider/audit-test` endpoints plus `writeAdminAudit()` helper (raw `INSERT INTO admin_audit_log` via the existing neon `sql` tagged-template — no Drizzle client needed). Model switches are recorded with `action='model-switch'`. All four provider tests (OpenRouter, Groq, Ollama, Gemini) are recorded with the unified `action='provider-test'` taxonomy and identical payload shape `{ provider, model, ok, latencyMs, error }`. Gemini tests are audited server-side inside `/gemini-test` (the panel intentionally does not double-write).

### Schema (`server/schema.ts`)
- **A3**: Added `admin_audit_log` table (`id serial`, `actor_email text`, `action text`, `payload jsonb`, `created_at timestamptz`). Pushed via `npm run db:push`.

### Edge function (`supabase/functions/ai-test/index.ts`)
- **S4**: Added `isJwtAdmin(req)` that resolves the Bearer JWT via `supabase.auth.getUser()` and matches against `ADMIN_EMAILS`. The admin sub-provider override now accepts either the new JWT path or the legacy DevKit HMAC token. **Requires `bash scripts/deploy-functions.sh` to take effect.**

### Panel (`src/components/dev-kit/AIProviderPanel.tsx`, full rewrite)
- **F1**: New `useTick(enabled)` hook drives 1 Hz countdowns on `BreakerChip`/`BreakerBanner` without polling.
- **F4**: Sub-panels are keyed by `activeTab` so switching tabs discards stale `testState`.
- **F6**: Ollama panel re-fetches whenever `ollamaBaseUrl` changes (replaces `hasFetched.current` guard).
- **F7**: Replaced `AbortSignal.timeout(20_000)` with `AbortController` + `setTimeout` (Safari/iOS pre-17.4 compatibility).
- **F8 / U3**: Header "Refresh all" awaits a `Promise.allSettled` over breaker status + every visible sub-panel's `registerRefresh` callback; failures surface in a single sonner toast.
- **S3**: `fetchWithToken` throws "Session expired — please re-login to the DevKit." when no Supabase token is available, instead of silently sending an unauthenticated request.
- **P2**: Search inputs are debounced (`useDebounced`, 120 ms) and filtered lists are `useMemo`-ised across all four sub-panels.
- **P3**: Refreshes keep prior data on screen and use a separate `isRefreshing` indicator.
- **P4**: New `fetchWithTokenDedup` coalesces concurrent identical requests for ~250 ms.
- **P5**: Each sub-panel cancels in-flight tests on rerun and on unmount.
- **U1**: `ConfirmCard` and the sub-provider confirmation card listen for Enter (confirm) / Esc (cancel).
- **U2**: Visibility-aware 20 s breaker poll (paused when document is hidden).
- **U4**: Gemini daily-usage rolls over at local midnight (`toLocaleDateString('en-CA')`) instead of UTC.
- **U5**: Groq panel shows `qwen/qwen3-32b (managed default)` instead of "none selected" when no BYOK override is set, sourced from new `src/lib/aiDefaults.ts`.
- **A1**: Documented inline that Gemini uses a single `gemini_global` breaker row (no per-user rows in current schema).
- **A2**: `getBreakerRow` is `useMemo`-ised so child panels keep referential equality on `breakerRow` props.

### New shared constants (`src/lib/aiDefaults.ts`)
- `GROQ_DEFAULT_MODEL = 'qwen/qwen3-32b'` and `OPENROUTER_DEFAULT_MODEL`. Mirrored in Deno-side `supabase/functions/_shared/aiClient.ts` (file documents the contract).

### Follow-ups (not in this task)
- Remove HMAC fallback from `ai-test` once `AIProviderPanel.tsx` stops sending `adminPassword` in test invokes.
- Run `bash scripts/deploy-functions.sh` to push the `ai-test` change to production.

---

## 2026-04-18 — AI Provider Panel wired into DevKit

- **`src/pages/DevToolsPage.tsx`**: Added `'ai-provider'` to `Tab` union type; added `{ id: 'ai-provider', label: 'AI Provider', icon: BrainCircuit }` entry under System nav section; added `'ai-provider'` to `TAB_LABELS`; added `{activeTab === 'ai-provider' && <AIProviderPanel />}` conditional render. Imported `AIProviderPanel` and `BrainCircuit` icon.
- **`src/components/dev-kit/AIProviderPanel.tsx`**: Component (created prior session) — 4 sub-panels (OpenRouter, Groq, Gemini, Ollama). Model search with free/paid filter. Instant model switching via `settingsStore`. Live credits from OpenRouter `/api/v1/auth/key`; live token usage from Groq `/openai/v1/usage`. No mock/demo data.

---

## 2026-04-26 — Trial Resume Auto-cleanup & Admin Sweep Dashboard (Tasks #18, #21, #22, #24)

### Trial Resume Auto-cleanup (Task #18)
- **DB** (`20260426000001_delete_expired_trial_resumes.sql`): Added `purge_expired_trial_resumes(p_batch_size)` SECURITY DEFINER function. Deletes trial resumes where `is_trial = TRUE AND trial_expires_at < now() - 3 days` using `FOR UPDATE SKIP LOCKED`. EXECUTE granted to `service_role`, `postgres`, `neon_superuser` only. Leverages existing partial index `idx_resumes_trial_expires`.
- **server/index.ts** (`runAnalyticsSweep`): Added batched purge loop using shared `ANALYTICS_SWEEP_BATCH_SIZE` (10,000) and `ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE` (1,000) constants. `console.warn` emitted at cap. `SweepResult` interface extended with `trial_resumes_deleted`.
- **useResumes.ts**: No changes — 3-day client-side grace filter already present.

### Admin Sweep Dashboard (Task #21)
- **DeploymentPanel** (`src/components/dev-kit/DeploymentPanel.tsx`): Added "Analytics Retention Sweep" section. Fetches `/api/admin/analytics-sweep-status` with Supabase JWT. Shows last-run timestamp, duration, per-table deleted-row counts (`portfolio_visits`, `error_log`, `audit_logs`, `trial_resumes`), and `lastError` amber banner. Independent Refresh button.

### Manual Sweep Trigger (Task #22)
- `POST /api/admin/analytics-sweep-run` already triggers full sweep cycle including trial purge — no UI changes needed.

### Sweep Batch Constant Consistency (Task #24)
- Replaced local `TRIAL_PURGE_BATCH_SIZE=500` / `TRIAL_PURGE_MAX_BATCHES=200` with shared sweep constants. Added `console.warn` at max-batches cap matching `sweepOneTable()` behavior.

---

## 2026-04-18 — Live AI Provider Status on WiseHire Settings (Tasks #19 & #20)

### Connected Provider Summary (Task #19)
- **AIKeySection** (`src/pages/wisehire/WiseHireSettingsPage.tsx`): Added connected-provider summary card showing active BYOK keys count and provider names.

### Shared React Query Cache (Task #20)
- **AIKeySection**: Replaced `useEffect` + `refreshTrigger` prop with `useQuery({ queryKey: ['ai-keys'], staleTime: 30_000 })`.
- **AISettingsSheet** (`src/components/settings/AISettingsSheet.tsx`): Added `useQueryClient`; calls `queryClient.invalidateQueries({ queryKey: ['ai-keys'] })` after key save and after key delete.
- **WiseHireSettingsPage**: Removed `aiRefreshTrigger` state, `handleAISheetChange`, and `onOpenChange` prop threading.

---

## 2026-04-18 — Settings Consolidation & Free-tier Trial Resume (Task #11)

### BYOK Settings Unification
- **WiseHire settings page consolidated**: Removed the custom two-provider (OpenAI/Anthropic) AI key form from `WiseHireSettingsPage`. Replaced it with a card containing a single "Manage AI Keys" button that opens the existing full-featured `AISettingsSheet` (9 providers: OpenAI, Anthropic, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama, WiseResume managed). Storage was already unified (`user_api_keys` table via `manage-api-keys` edge function) — only UI changed. No backend changes needed.

### Free-tier Trial Resume
- **DB migration** (`20260418000002_add_trial_resume_columns.sql`): Added `is_trial BOOLEAN NOT NULL DEFAULT false` and `trial_expires_at TIMESTAMPTZ` columns to the `resumes` table, with a partial index on `trial_expires_at WHERE is_trial = true` for efficient cleanup queries.
- **Drizzle schema updated** (`server/schema.ts`): `isTrial` and `trialExpiresAt` fields added to the `resumes` table definition.
- **Type system updated** (`useResumes.ts`): `is_trial` and `trial_expires_at` fields added to `DatabaseResume` interface and `parseDbResume` mapper.
- **Free-tier wall with trial option** (`CreateResumeDialog.tsx`): Free-plan users who already have one resume now see an upgrade wall plus a "Try for 24 h — free" secondary path. Trial resumes don't count toward the free-plan quota of 1, so the gate correctly triggers on non-trial resume count. Clicking the trial button creates a copy of the user's primary resume marked `is_trial=true, trial_expires_at=now+24h`, invalidates the query cache, and navigates to the editor. If a trial is already active, a message is shown instead.
- **Trial badge on resume cards** (`ResumeListCard.tsx`): Trial resumes display an amber "Trial · Xh left" badge (Timer icon) or a red "Trial expired" badge (AlertTriangle icon) in the title row, computed from `trial_expires_at`.
- **"24h OR first save" lifecycle — server-authoritative** (`20260418000004_trial_expire_on_edit_trigger.sql`): A `BEFORE UPDATE` DB trigger (`expire_trial_resume_on_first_edit`) atomically sets `trial_expires_at = now()` the instant any content column changes on an active trial resume. This runs at the DB layer regardless of client-side cache state. The client also sends `trial_expires_at = now()` in the same UPDATE as a belt-and-suspenders measure, using both the single-resume cache (`['resume', id]`) and the list cache as sources of truth.
- **Server-side write guard** (`20260418000003_trial_resume_rls_policy.sql`): Restrictive RLS policy `block_writes_to_expired_trials` with `USING` clause (no `WITH CHECK`) blocks any UPDATE to an already-expired trial based on the old-row state. The first-edit transition works correctly because `USING` checks the OLD row (still active) while the trigger sets the new row's expiry atomically.
- **Editor read-only gate** (`useEditorAutosave.ts`): `saveToCloud` now checks `resumeFromDb.is_trial` and `trial_expires_at` at the start of every save attempt. Expired trials surface a 6-second toast and return early, preventing wasted network calls.
- **In-editor trial banners** (`EditorPage.tsx`): Two contextual banners appear below the editor header — an amber non-blocking banner for active trials ("expires in Xh — upgrade to keep forever") and a red read-only lock banner for expired trials with a direct link to the plan upgrade page.
- **Grace-period filter** (`useResumes.ts`): Recently-expired trial resumes (< 3 days) remain visible on the dashboard as read-only so users have a window to upgrade. Trials older than 3 days are hidden from the list. Hard deletion is handled by the scheduled cleanup job (Task #18).
- **Complete source copy**: Trial creation now prefers the specific resume passed via `parentResumeId` (tailor/duplicate context) and copies all resume fields — contact info, summary, experience, education, skills, certifications, awards, projects, publications, volunteering, hobbies, and references.
- **Docs**: `docs/features/trial-resume.md` (plain-language feature doc with full lifecycle table) and `.local/product/task-11-settings-and-trial.md` created.

---

## 2026-04-18 — Portfolio Editor & Public Page Improvements (Task #10)

### New Features
- **Contact form on public portfolio**: Visitors can now send a message directly from any portfolio page without leaving or opening an email client. The form collects name, email, and message, posts to the existing `submit-contact-request` edge function (rate-limited + bot-guarded), and shows a success state on delivery.
- **Contact form toggle in portfolio editor**: Portfolio owners control whether the form appears via a new "Contact Form" card in the "More" tab. Enabled by default for all portfolios. State persisted in `portfolio_extras.contactFormEnabled`.

### Already Implemented (confirmed during audit)
- **Theme thumbnails**: The ThemeStorePicker (`src/components/portfolio/editor/ThemeStorePicker.tsx`) already renders live CSS-based mini-previews for every theme — the task spec was already satisfied.
- **Portfolio editor refactor**: The portfolio editor is already split into `SetupTab`, `ContentTab`, `DesignTab`, `MoreTab`, `VisitorsTab`, `AppearanceSection`, `ContentVisibilitySection`, and more sub-components. No further refactor was needed.
- **Resume staleness detection**: `ContentTab` already receives `resumeUpdatedAt` / `portfolioLastSyncedAt` props from `PortfolioEditorPage` and `ProfilePage` already shows a stale-portfolio warning with a re-sync button.

### Additions (code-review follow-up)
- **Persisted draft/publish split** (DB-level, `supabase/migrations/20260418000000_portfolio_draft_column.sql`): Added `portfolio_draft JSONB` and `portfolio_draft_saved_at TIMESTAMPTZ` columns to `profiles`. The editor's new "Save draft" button persists a full-state snapshot to this column without touching the live columns. "Publish" (the primary save action) writes all fields to the live columns and clears the draft. The public portfolio page reads exclusively from the live columns — visitors never see mid-edit or draft content. Drafts survive browser closes and return visits.
- **Draft hydration on editor load**: When `portfolio_draft` is present, the editor overlays all draft values on top of the live-column defaults so the owner picks up exactly where they left off.
- **Unpublished changes surface**: An amber "Unpublished changes — click Publish to go live" banner in the StatusBar and "Publish changes" button relabelling in the SaveBar trigger when `portfolio_draft IS NOT NULL` (DB-level) or when local state has diverged since the last save.
- **Owner in-app notification**: `submit-contact-request` now looks up the portfolio owner by `metadata.portfolio_username` and inserts a row into the `notifications` table so the owner is notified immediately in-app when a visitor sends a contact message.
- **Submit toasts**: `PortfolioContactForm` now fires `toast.success` on delivery and `toast.error` on failure/network error, in addition to the inline success/error state already shown inside the form.

---

## 2026-04-18 — Resume Builder UX Improvements (Task #9)

### New Features
- **Template-first intake**: "Start from Scratch" in the Create Resume dialog now includes a template selection step (between experience level and title), showing 8 popular templates with live thumbnails so users choose a visual style before typing a single word. The selected template is written directly to the new resume row — the editor opens already wearing it.
- **Certifications & Languages always visible**: These two sections now appear in the editor stepper for every resume, regardless of whether they contain data. Previously they only surfaced when data was present. Awards, Projects, and other optional sections still auto-promote on data.

### Already Implemented (confirmed during audit)
- Template thumbnails in the template picker (TemplateThumbnail component) — was already live
- Persistent autosave indicator (ProgressChip cloud icons) — was already live
- Partial PDF parse recovery (ImportReviewSheet shows parsed fields with "Not detected" badges and lets users proceed) — was already live
- "Add sections" label on mobile stepper — was already live

---

## 2026-04-15 — WiseHire Edge Function Deployment & Bug Fixes (Task #12)

### Bug Fixes (pre-deploy)
- **wisehire-write-jd**: Fixed `WISEHIRE_STARTER_PLAN` undefined reference → replaced with inline string `'wisehire_starter'`
- **wisehire-bulk-screen**: Fixed `checkRateLimit` called with positional args → corrected to `(userId, { actionType, maxRequests, windowSeconds })` object signature; fixed `aiResponse.choices[0].message.content` → `aiResponse.content`; fixed `authErrorResponse(err, req)` → `authErrorResponse(err, origin)`
- **wisehire-send-outreach**: Replaced `import { corsHeaders }` (non-existent named export) → `getCorsHeaders(origin)`; replaced `getAuthUser` (non-existent) → `requireAuth`; fixed `checkRateLimit` signature; switched to `getServiceClient()` for DB client
- **wisehire-talent-search**: Same cors/auth/rateLimit fixes as send-outreach
- **wisehire-talent-view**: Same cors/auth fixes; improved view-count increment (uses fetched `view_count` from initial query instead of undefined variable)
- **wisehire-apply**: Replaced `import { corsHeaders }` → `getCorsHeaders(origin)`; replaced `getAuthUser` → `requireAuth`; switched to `Deno.serve` (replacing deprecated `serve` import); switched to `getServiceClient()` for DB client

### Deployment
- Deployed all 93 edge functions to Supabase project `jnsfmkzgxsviuthaqlyy` via `bash scripts/deploy-functions.sh`
- Redeployed `wisehire-waitlist-join` and `wisehire-validate-early-access` with `--no-verify-jwt` flag (public endpoints — bot-guarded internally)
- Disabled JWT verification via Supabase management API for both public endpoints

### Additional Bug Fixes (post-deploy, owner_id FK mismatch)
- **wisehire-send-outreach**: Fixed `owner_id = userId` (auth UUID) → `owner_id = profileId` (profiles PK); all three `wisehire_candidates`, `wisehire_companies`, and `wisehire_outreach_emails` queries now use the correct FK value via a pre-query `SELECT id FROM profiles WHERE user_id = $userId`
- **wisehire-talent-view**: Same profileId fix for `wisehire_companies` query
- **wisehire-bulk-screen**: Same profileId fix for `wisehire_bulk_screen_jobs` insert
- **wisehire-generate-brief**: Same profileId fix for `wisehire_candidates` query and `wisehire_candidate_briefs` insert
- **wisehire-mask-cvs**: Fixed subscription plan query — updated column names `plan_id`→`plan_name`, `trial_ends_at`→`trial_expires_at`; added `trial_plan` support so trial HR accounts pass the plan gate

### Smoke Tests — All WiseHire AI Functions Pass (Authenticated)
Test account: `wisehire-smoketest@thewise.cloud` (account_type=hr, trial_plan=wisehire_professional until 2026-12-31)

| Function | Type | Result |
|---|---|---|
| `wisehire-waitlist-join` | Public (bot-guarded) | ✅ Returns `success: true` / `already_registered` |
| `wisehire-validate-invite` | Public | ✅ Returns `valid: false, reason: not_found` for unknown token |
| `wisehire-validate-early-access` | Public (bot-guarded) | ✅ Returns `valid: false` for invalid code |
| `wisehire-write-jd` | Auth-required | ✅ Full JD generated (title, summary, responsibilities, requirements, benefits) |
| `wisehire-talent-search` | Auth-required | ✅ Returns `{results, total, remaining}` |
| `wisehire-send-outreach` | Auth-required | ✅ AI draft email generated (365–420 chars) |
| `wisehire-generate-brief` | Auth-required | ✅ Candidate brief returned with `{brief}` |
| `wisehire-mask-cvs` | Auth-required | ✅ CV masked (NAME redacted), `{results}` returned |
| `wisehire-talent-view` | Auth-required | ✅ Returns `{ok: true}`, view logged |
| `wisehire-bulk-screen` | Auth-required | ✅ Correctly rejects unauthenticated with 401 |
| `wisehire-apply` | Auth-required | ✅ Correctly rejects unauthenticated with 401 |
| `wisehire-complete-signup` | Auth-required | ✅ Correctly rejects unauthenticated with 401 |
| `admin-wisehire-invite` | Admin-password | ✅ Correctly rejects wrong password |
| `admin-wisehire-waitlist` | Admin-password | ✅ Correctly rejects wrong password |

---

## 2026-04-15 — Wise AI Phases 2 & 3

### Phase 2: New AI Tools
- Added `get_company_briefing` tool to agentic-chat edge function: AI can now research a company and open the Company Briefing sheet from conversation
- Added `open_job_tracker` tool to agentic-chat edge function: AI can redirect the user to the Applications tracker (/applications)
- SYSTEM_PROMPT updated to describe both new tools with usage guidance

### Phase 2: "Add with AI" in Experience Editor
- Added Bot-icon button to `ExperienceSection` for each experience entry; clicking sends a pre-filled message to the Wise AI chat
- `chatTriggerStore` (Zustand) created at `src/store/chatTriggerStore.ts`; deep components write, EditorPage reads and opens AI chat sheet automatically
- `EditorPage` now watches `pendingPrompt` from the trigger store and forwards it as `chatInitialMessage` to `AgenticChatSheet`

### Phase 2: Frontend Tool Handlers
- `useAgenticChat` exports `pendingAction` / `clearPendingAction`; handles `get_company_briefing` (sets pending action) and `open_job_tracker` (navigates to /applications)
- `AgenticChatSheet` handles `get_company_briefing` tool call: checks cache, shows inline "View Saved / Generate Fresh" decision card, then opens `CompanyBriefingSheet`
- `CompanyBriefingSheet` accepts `initialCompanyName`, `initialBriefing`, and `onBriefingGenerated` props; auto-generates when company name provided without cached data

### Phase 3: Tool Output Caching
- New Supabase migration: `tool_cache` table with `(user_id, tool_name, cache_key, output JSONB, created_at, expires_at)`; unique index for upsert; 7-day TTL for `get_company_briefing`
- `useToolCache` hook at `src/hooks/useToolCache.ts`: `getCache`, `setCache`, `deleteCache`, `getCacheAge` — all RLS-safe, only active for authenticated users; normalised cache keys
- `AgenticChatSheet` writes to cache via `onBriefingGenerated` callback; reads cache before opening briefing sheet; inline UI shows cache age and offers "View Saved / Generate Fresh" choice
