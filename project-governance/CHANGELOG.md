# CHANGELOG

Local changelog tracking WiseResume changes.

## 2026-04-18 (Security — Task #8: Portfolio Password Server-Side Enforcement + Local-Only Mode Removal)

### SECURITY — Portfolio password enforcement moved server-side; Local-Only Mode toggle removed

Two user-trust issues addressed:

1. **"Local-Only Mode" removed.** The toggle in Settings → Privacy claimed data would remain on-device when enabled. The flag (`localOnlyMode`) had no consumers outside the UI — Supabase writes continued regardless. The toggle has been removed entirely to prevent the misleading label from persisting.
   - `src/store/settingsStore.ts` — `localOnlyMode` state, getter, setter, and `privacyStatus` reference removed.
   - `src/components/settings/sections/PrivacySection.tsx` — toggle and supporting copy removed.

2. **Portfolio password enforcement moved to the server.**
   - New SQL migration `supabase/migrations/20260426000000_portfolio_password_server_side.sql`: adds `get_portfolio_gate_info(p_username)` RPC (gate metadata only, no hash) and overwrites `get_public_portfolio` with a `p_password` overload that calls `extensions.digest()` server-side for SHA-256 comparison.
   - `src/hooks/usePublicPortfolio.ts` — `usePortfolioGate` uses new RPC; hash never returned to browser; graceful fallback to REST (no hash) if RPC missing; `usePublicPortfolio` forwards raw password to server.
   - `src/pages/PublicPortfolioPage.tsx` — client-side `sha256hex()` removed; `PasswordGate` switched to `onSubmit` (raw password over HTTPS).

**Migration status:** SQL written, GitHub Actions run failed (SUPABASE_ACCESS_TOKEN not in GitHub secrets). App ships with graceful fallbacks. Migration must be applied manually via Supabase SQL editor — see `Project Atlas/01-Currently Implemented/critical-systems/11-portfolio-password-security.md`.

- **Engineering card:** `Project Atlas/01-Currently Implemented/critical-systems/11-portfolio-password-security.md` (new).
- **Plain-language summary:** "Security Fix — Portfolio passwords are now enforced on the server" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief:** `.local/tasks/security-trust-fixes.md`.

---

## 2026-04-18 (Governance — Documentation Discipline rule + Phases 1–5 backfill)

### GOV — Documentation Discipline rule (three-surface mandate)

The constitution now mandates that **every** accepted change be documented in three surfaces before a task can be marked done: (1) `Project Atlas/01-Currently Implemented/`, (2) `Project Atlas/04-For You (Plain Language)/`, (3) `project-governance/CHANGELOG.md`. The in-app "What's New" page (`src/pages/WhatsNewPage.tsx`) is **explicitly out of scope** for this rule — that page is the product's release-notes UI for end users, not an engineering-change documentation surface.

- **`project-governance/CONSTITUTION.md`** — added §6.6 ("Documentation Discipline") with the three-surface mandate, the WhatsNew exclusion, and a per-change-type mapping table (frontend page / edge function / migration / shared infra / build / background job / AI resilience / analytics / governance / dependency). Updated §6.5 ("Task Completion Definition") so a task is not "done" until all three surfaces have been updated and the agent's final summary explicitly lists which Atlas files were touched.
- **`Project Atlas/MAINTENANCE.md`** — added a "Three-surface documentation rule" section that mirrors §6.6 and points back to the constitution as the source of truth. Extended the "If you change… / Re-verify…" mapping table with rows for build/bundle changes, server-side scheduled jobs, AI provider resilience, component-level background-work hygiene, analytics/data-lifecycle, and governance changes themselves. Added an explicit reminder that the plain-language doc must be touched whenever a user-visible behavior changes. Bumped `Last verified:` to 2026-04-18.

### STABILITY — Phase 1 documentation backfill (database integrity & indexes)

Phase 1 of the 2026-Q2 stability initiative — adding `ON DELETE CASCADE` foreign keys to every relational column in the Drizzle schema and adding the 18 missing FK-style B-tree indexes — is documented after the fact to bring Atlas in line with the new three-surface rule. No code changes in this entry; documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-1-db-integrity-and-indexes.md` (new).
- **Plain-language summary**: "Phase 1 — A more careful database" section in `Project Atlas/04-For You (Plain Language)/stability-improvements.md` (new doc).
- **Source brief**: `.local/tasks/phase-1-db-integrity.md`. **Files touched by the underlying work**: `server/schema.ts`, `server/db.ts`, `drizzle.config.ts`, `server/index.ts`.

### STABILITY — Phase 2 documentation backfill (frontend re-render & bundle fixes)

Phase 2 — `React.memo` on resume template sub-components, 80–120ms debounce on `LivePreviewPanel`, removal of `framer-motion` from layout-shell primitives, `lazyWithRetry` on `AuroraBackground`, and `@tanstack/react-virtual` on the dashboard resume list past ~30 rows — is documented for Atlas. No code in this entry; documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-2-frontend-rerender-and-bundle.md` (new).
- **Plain-language summary**: "Phase 2 — A snappier resume editor and a faster homepage" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-2-frontend-rerender.md`. **Files touched by the underlying work**: `vite.config.ts`, `src/AppInterior.tsx`, `src/components/templates/`, `src/components/editor/LivePreviewPanel.tsx`, `src/lib/lazyWithRetry.ts`, `src/pages/DashboardPage.tsx`.

### STABILITY — Phase 3 documentation backfill (background work hygiene)

Phase 3 — `visibilitychange`-driven pause of `AIHealthBadge` polling, OCR moved to a Web Worker, `pdfjs-dist` worker enabled with per-page yield, 250–400ms debounce on `useResumeScore`, and a sweep of all component-level `setInterval` / `setTimeout` cleanups — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-3-background-work-hygiene.md` (new).
- **Plain-language summary**: "Phase 3 — The platform stops working when you're not looking" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-3-background-hygiene.md`. **Files touched by the underlying work**: `src/components/ai/AIHealthBadge.tsx`, `src/hooks/useActiveStatus.ts`, `src/lib/pdfParser.ts`, `src/hooks/useResumeScore.ts`.

### STABILITY — Phase 4 documentation backfill (AI provider resilience)

Phase 4 — new `ai_provider_breaker` table + upsert RPC, circuit-breaker logic in `_shared/aiClient.ts` (5 failures in 60s opens for 60s, then a single probe), explicit `usage_date` pass-through to `atomic_refund_credit` in `_shared/creditUtils.ts` to fix the off-by-day refund bug, structured BYOK error classification (`invalid_key` / `quota_exceeded` / `upstream_5xx`) surfaced via `useAIAction` / `useAIEnhance`, and a new admin-gated `/api/fn/ai-breaker-status` endpoint — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-4-ai-provider-resilience.md` (new).
- **Plain-language summary**: "Phase 4 — When an AI provider has a bad day, we don't make you wait for it" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-4-ai-resilience.md`. **Files touched by the underlying work**: `supabase/functions/_shared/aiClient.ts`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/_shared/dbClient.ts`, `supabase/functions/ai-health/index.ts`, `server/schema.ts`, `src/hooks/useAIAction.ts`, `src/hooks/useAIEnhance.ts`.

### STABILITY — Phase 5 documentation backfill (analytics data lifecycle)

Phase 5 — BRIN indexes on `created_at` for `portfolio_visits`, `error_log`, `audit_logs`; a once-per-day Express-process retention sweep deleting in 10k batches; env-tunable retention windows (defaults: 90 / 30 / 365 days); per-table deleted-row-count logging; an admin status endpoint; and the policy section in `replit.md` — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-5-analytics-data-lifecycle.md` (new).
- **Plain-language summary**: "Phase 5 — Old analytics data is now cleaned up automatically" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-5-data-lifecycle.md`. **Files touched by the underlying work**: `server/schema.ts`, `server/index.ts`, `replit.md`.

**Files changed in this changelog entry**: `project-governance/CONSTITUTION.md`, `project-governance/CHANGELOG.md`, `Project Atlas/MAINTENANCE.md`, `Project Atlas/01-Currently Implemented/README.md`, `Project Atlas/01-Currently Implemented/stability-fixes/` (new subfolder, 1 README + 5 cards), `Project Atlas/04-For You (Plain Language)/README.md`, `Project Atlas/04-For You (Plain Language)/current-features.md`, `Project Atlas/04-For You (Plain Language)/stability-improvements.md` (new).

---

## 2026-04-23 (Governance — AUDIT-2026-04 Backfill)

### GOV — Project governance refresh against live codebase

A targeted audit (`project-governance/AUDIT-2026-04.md`) reconciled the governance docs against the live `supabase/functions/`, `supabase/migrations/`, and `src/integrations/supabase/` state. Only facts already present in the codebase were added to governance — no new behavior was introduced. Surgical edits only; section ordering and tone preserved.

- **PRODUCT.md** — WiseHire status updated from "Phase 1 in spec, not yet built" to: Phase 1 fully shipped end-to-end; Phase 2 and Phase 3 partially shipped (edge functions and frontend pages exist, but several backing tables have no migration file). Public job board explicitly marked **NOT shipped** — the routes do not exist in `src/AppInterior.tsx`.
- **ARCHITECTURE.md §3** — Stack table edge function count corrected from 87 → 93.
- **ARCHITECTURE.md §5** — Promoted `discount_codes`, `coupon_redemptions`, `admin_audit_log`, `admin_user_notes`, `app_settings` from "Additional Tables (verify)" into a new "Coupons, Admin & Platform" section under "Current Tables." Added missing tables: `tool_cache`, `company_briefings`, `portfolio_history`, `portfolio_interactions`, `portfolio_username_rules`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_user_overrides`, `interview_answers`, `interview_report_tokens`, `resume_snapshots`, `tailoring_results`, `error_log`. Added a `seo_noindex` note on `portfolio_settings`. Marked `signup_otps` deprecated. Added an explicit type-generation status note.
- **ARCHITECTURE.md §7** — Function count corrected from 92 → 93. Added missing live functions: `admin-onboarding-funnel`, `admin-portfolio-usernames`, `portfolio-interest`. Removed `fetch-github-projects` from the Portfolio table (function directory no longer exists; see audit item A1).
- **ARCHITECTURE.md §2 — Rule C** — Marked **suspended pending owner sign-off** because `fetch-github-projects` is missing from `supabase/functions/`. Cross-references `AUDIT-2026-04.md` item A1.
- **ARCHITECTURE.md §9** — WiseHire function count corrected from 13 → 14 (added missing `wisehire-validate-early-access`). Removed bogus public job-board routes `/jobs`, `/jobs/:companySlug`, `/jobs/:companySlug/:roleSlug`, `/my-applications` (not registered in `src/AppInterior.tsx`). Tagged the 9 WiseHire Phase 2/3 tables that have **no migration file** with a clear warning (see audit item A5).
- **DECISIONS.md** — Added ADR #9 (single source of truth for plan credit limits via `creditLimits.json`) and ADR #10 (atomic credit deduction RPC, migration `20260416000001`). A proposed ADR #11 (WiseHire public job board) was retracted after verification — see audit item A5.
- **CONSTITUTION.md §5** — Decision count updated from 8 → 10 to match the actual ADR count after the additions/retraction above.
- **AUDIT-2026-04.md** — New audit report listing every drift found, the source file proving it, and the fix applied.

**Files changed**: `project-governance/PRODUCT.md`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CONSTITUTION.md`, `project-governance/CHANGELOG.md`, `project-governance/AUDIT-2026-04.md` (new).

---

## 2026-04-22 (WiseHire — Pipeline Bulk Ops + Atomic Credit Refund)

### FEAT — WiseHire pipeline bulk operations & master CV RPCs

- **DB** (`supabase/migrations/20260422000001_pipeline_bulk_and_master_cv_rpcs.sql`): Added RPCs supporting bulk pipeline-stage moves on `wisehire_candidates` and master-CV reuse across briefs.
- **DB** (`supabase/migrations/20260422000002_atomic_refund_credit_and_reset_premium_usage.sql`): Added `atomic_refund_credit` RPC for safe rollback of credits when an AI call fails after deduction, plus `reset_premium_usage` for premium-tier daily reset bookkeeping.
- **DB** (`supabase/migrations/20260422000003_portfolio_username_admin.sql`): Created `portfolio_username_rules`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_user_overrides`. Backed by new `admin-portfolio-usernames` edge function.

**Files changed**: `supabase/migrations/20260422000001_*.sql`, `supabase/migrations/20260422000002_*.sql`, `supabase/migrations/20260422000003_*.sql`, `supabase/functions/admin-portfolio-usernames/`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-21 (Portfolio — Analytics Enhancements)

### FEAT — Portfolio interactions table + premium analytics RPCs

- **DB** (`supabase/migrations/20260421000001_portfolio_interactions.sql`): New `portfolio_interactions` table records granular events (clicks, scroll depth, downloads) on public portfolios. RLS: owner read.
- **DB** (`supabase/migrations/20260421000002_portfolio_analytics_enhancements.sql`): RPCs for premium analytics aggregations (top sources, daily trend, engagement breakdown).
- **DB** (`supabase/migrations/20260423000000_analytics_premium_rpcs.sql`): Additional premium-tier analytics RPCs feeding the dev kit + premium portfolio dashboard.

**Files changed**: `supabase/migrations/20260421000001_*.sql`, `supabase/migrations/20260421000002_*.sql`, `supabase/migrations/20260423000000_*.sql`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-20 (WiseHire — Phase 1 MVP Shipped)

### FEAT — WiseHire MVP launch (Phase 1)

WiseHire shipped its full Phase 1 MVP under invite-only Early Access. All routes are gated by `WiseHireGuard` enforcing `account_type = 'hr'`.

- **DB** (`supabase/migrations/20260420000001_wisehire_account_type.sql`): Added `profiles.account_type` (`job_seeker` | `hr`, NOT NULL, DEFAULT `job_seeker`).
- **DB** (`20260420000002` … `20260420000008`): Created `wisehire_waitlist`, `wisehire_invites`, `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events`. All with RLS scoped to the owning HR user.
- **DB** (`20260420000020_wisehire_redeem_early_access_rpc.sql`, `20260420000021_wisehire_waitlist_drop_size_check.sql`, `20260420000022_error_log.sql`, `20260420000023_audit_logs_nullable_user_id.sql`): Supporting RPCs and a new `error_log` table for server-side error capture.
- **Edge functions**: `wisehire-waitlist-join`, `wisehire-validate-invite`, `wisehire-validate-early-access`, `wisehire-complete-signup`, `wisehire-write-jd`, `wisehire-generate-brief`, `admin-wisehire-invite`, `admin-wisehire-waitlist`. AI endpoints enforce the four-layer security invariant (Rule A) and **fail-closed** rate limiting per WiseHire policy.
- **Phase 2 follow-on** (edge functions and frontend pages only — backing tables NOT yet migrated, will fail at runtime): `wisehire-bulk-screen`, `wisehire-mask-cvs`, `wisehire-send-outreach`, `ScorecardPage`, `ScorecardTemplatesPage`, `PublicScorecardPage`. Public share routes `/share/brief/:shareToken` and `/share/scorecard/:shareToken` are live. Tables `wisehire_bulk_screen_jobs`, `wisehire_scorecards`, `wisehire_scorecard_templates`, `wisehire_candidate_notes`, `wisehire_outreach_emails` have **no migration file**.
- **Phase 3 follow-on** (edge functions and frontend pages only — backing tables NOT yet migrated): `wisehire-talent-search`, `wisehire-talent-view`, `wisehire-apply`, `TalentPoolPage`, `WiseHireAnalyticsPage`. Tables `talent_pool_profiles`, `talent_pool_views`, `wisehire_applications` have **no migration file**. The first-party public job board (`/jobs/*`) was **NOT shipped** — those routes are not registered in `src/AppInterior.tsx`. Portfolio view notifications still planned.

**Files changed**: 14 new edge function directories under `supabase/functions/wisehire-*` and `supabase/functions/admin-wisehire-*`; new migrations under `supabase/migrations/2026042*` (Phase 1 schema + supporting RPCs only — Phase 2/3 table migrations still pending); new routes under `src/pages/wisehire/`; `project-governance/PRODUCT.md`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-19 (Resumes — Phase 2 Features + Persisted Briefings)

### FEAT — Resume snapshots, interview report tokens, persisted company briefings

- **DB** (`supabase/migrations/20260419000000_phase2_features.sql`): Added `resume_snapshots`, `interview_answers`, `interview_report_tokens`. Snapshots back the rollback path after a `tailor-resume` run; report tokens enable signed read-only interview report links.
- **DB** (`supabase/migrations/20260419000000_add_company_briefings.sql`): Added `company_briefings` table. Backs the cache-reuse UI in `AgenticChatSheet` (Wise AI Phase 3) alongside `tool_cache`.
- **DB** (`supabase/migrations/20260419000001_phase2_security_fix.sql`): Tightened RLS on the new tables to owner-only access.

**Files changed**: `supabase/migrations/20260419000000_phase2_features.sql`, `supabase/migrations/20260419000000_add_company_briefings.sql`, `supabase/migrations/20260419000001_phase2_security_fix.sql`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-18 (Tailoring — RLS + Atomic Portfolio Chat Quota)

### FEAT — `tailoring_results` RLS + atomic portfolio chat quota

- **DB** (`supabase/migrations/20260418000000_rls_tailoring_results_and_audit_docs.sql`): Locked down `tailoring_results` with owner-only RLS. Added inline audit-doc comments on related tables.
- **DB** (`supabase/migrations/20260418000001_atomic_portfolio_chat_quota.sql`): Atomic per-portfolio-visitor chat quota check + decrement RPC, eliminating a check-then-decrement race in `ask-portfolio`.

**Files changed**: `supabase/migrations/20260418000000_*.sql`, `supabase/migrations/20260418000001_*.sql`, `project-governance/CHANGELOG.md`.

---

## 2026-04-17 (Security — RLS Hardening + Portfolio noindex)

### SEC — Explicit RLS block policies + portfolio SEO control

- **DB** (`supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`): Added explicit-block RLS policies to `credit_transactions` (clients SELECT only, INSERT/UPDATE/DELETE blocked), `subscriptions` (SELECT only — lifecycle managed by Stripe via service role), idempotently removed an obsolete UPDATE policy on `ai_credits`, and blocked all client access to `rpc_rate_limits` (only accessible via SECURITY DEFINER RPCs). Avatar storage bucket now enforces `image/*` MIME types server-side with a 5 MB cap.
- **DB** (`supabase/migrations/20260417000001_portfolio_noindex_and_rpc_update.sql`): Added `portfolio_settings.seo_noindex BOOLEAN`. Updated `get_public_portfolio` RPC to return `seoNoindex`. `usePortfolioSEO.ts` injects `<meta name="robots" content="noindex, nofollow">` when true.
- **Edge** (`supabase/functions/_shared/logger.ts`): New JSON-formatted edge function logger with DEBUG/INFO/WARN/ERROR levels and structured error serialization. Adopted in `creditUtils.ts` and `authMiddleware.ts`.
- **Cleanup**: Deleted `supabase/functions/_shared/deductCredits.ts` (no longer imported after the atomic credit refactor — see Decision #10).

**Files changed**: `supabase/migrations/20260417000000_*.sql`, `supabase/migrations/20260417000001_*.sql`, `supabase/functions/_shared/logger.ts`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/_shared/authMiddleware.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-16 (Performance + Atomic Credit Deduction)

### PERF/SEC — Performance indexes + atomic credit deduction RPC

- **DB** (`supabase/migrations/20260416000000_add_performance_indexes.sql`): Added indexes on every high-traffic column — all `user_id` foreign keys, `ai_credits.usage_date`, the rate-limit lookup keys, etc.
- **DB** (`supabase/migrations/20260416000001_atomic_credit_deduction.sql`): Introduced `atomic_attempt_and_deduct_credit` SECURITY DEFINER RPC that performs the credit check + increment in one transaction. All AI edge functions now route credit enforcement through `_shared/creditUtils.ts` → `checkAndDeductCredit`. See Decision #10.
- **`supabase/functions/_shared/creditUtils.ts`**: Now verifies that a key row exists in `user_api_keys` before granting BYOK unlimited credits — `ai_provider` preference alone is no longer sufficient.
- **`supabase/functions/hard-purge/index.ts`**: Wrapped in `requireAdminAuth`. Previously had no authentication.

**Files changed**: `supabase/migrations/20260416000000_*.sql`, `supabase/migrations/20260416000001_*.sql`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/hard-purge/index.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-15 (Wise AI Phase 3 — Tool Cache)

### FEAT — `tool_cache` table for Wise AI tool output reuse

- **DB** (`supabase/migrations/20260415165312_tool_cache.sql`): New `tool_cache` table — `(user_id, tool_name, cache_key, output JSONB, expires_at)` with a 7-day TTL and a unique index for upsert. RLS: owner only.
- **`src/hooks/useToolCache.ts`** (new): `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge` — RLS-safe reads/writes.
- **`AgenticChatSheet`**: Inline cache-reuse card shows cached company-briefing age → "View Saved Briefing" or "Generate Fresh." `CompanyBriefingSheet` accepts new props `initialCompanyName`, `initialBriefing`, `onBriefingGenerated` and auto-generates when a company name arrives without cached data.

**Files changed**: `supabase/migrations/20260415165312_tool_cache.sql`, `src/hooks/useToolCache.ts`, `src/components/editor/AgenticChatSheet.tsx`, `src/components/wise-ai/CompanyBriefingSheet.tsx`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-15 (Release v2.5.4)

- Updated the app version to v2.5.4.
- Added a new plain-language changelog entry for users.
- Improved the admin email search so it waits briefly before running lookups while you type.

---

## 2026-04-15 (Task #8 — Wise AI Phase 1: Chat Persistence + History)

### FEAT — Wise AI chat session persistence (spec: 002-wise-ai-agent-evolution)

- **DB** (`supabase/migrations/20260415161238_chat_sessions.sql`): Two new tables with RLS. `chat_sessions` (id, user_id FK→auth.users CASCADE, resume_id FK→resumes SET NULL, title, created_at, updated_at) + `chat_messages` (id, session_id FK→chat_sessions CASCADE, role CHECK IN ('user','assistant'), content, function_call JSONB). Sessions are never auto-pruned (the 50-session limit is a UI display cap only via `.limit(50)` in `useChatSessions`). Performance indexes on `(user_id, updated_at DESC)` and `(session_id, created_at ASC)`.
- **`src/lib/agenticChat.ts`**: Added `action?: 'delete' | 'update'` to `SuggestionProposal` interface to support the delete-experience confirmation flow.
- **`src/hooks/useChatHistory.ts`** (new): TanStack Query hooks — `useChatSessions()` (50-session list ordered by `updated_at DESC`, enabled only when authenticated), `useSessionMessages(sessionId)` (messages for a session), `useDeleteChatSession()` (mutation with cache invalidation).
- **`src/hooks/useAgenticChat.ts`**: Full persistence layer added. On mount loads the latest session from DB (once per auth session). `sessionIdRef` tracks active session; session row created on FIRST user message with title derived from message text (first 50 chars; "Chat — [date]" if < 10 chars). All user and assistant messages persisted fire-and-forget via `persistMessage()`. New public exports: `startNewSession()` (clears messages + nulls sessionId), `loadSession(id)` (loads a historical session's messages from DB + sets sessionId). Added `delete_experience` acceptance logic in `applySuggestion`: when `action === 'delete'` and `section === 'experience'`, filters the matching entry from `currentResume.experience` via identifier lookup.
- **`src/hooks/useChatHistory.ts`** (new): see above.
- **`supabase/functions/agentic-chat/index.ts`**: Added `delete_experience` tool (params: `identifier`, `explanation`, optional `itemId`). Handler looks up the matching experience entry in `currentResume`, builds a human-readable description of the entry, and returns a `SuggestionResult` with `action: 'delete'` — the frontend shows a confirmation card before applying. `SuggestionResult` interface extended with `action?: 'delete' | 'update'`.
- **`src/components/editor/AgenticChatSheet.tsx`**: History panel added behind a Clock icon button in the header. Toggles between `'chat'` and `'history'` panel states. History view: session list (title + date) with two-step inline delete confirm (Trash2 → Delete/Cancel). Clicking a session loads it via `loadSession()` and returns to chat view. Empty state shown when no sessions exist. New `DeleteConfirmCard` component: renders for `proposal.action === 'delete'` proposals — shows "Entry to remove" block with destructive styling + "Yes, Delete" / "Cancel" buttons instead of the standard Before/After diff. `FunctionCallBadge` updated with `delete_experience → 'Deleted Experience'` label. `clearChat` replaced with `startNewSession` throughout.

**Files changed**: `supabase/migrations/20260415161238_chat_sessions.sql`, `src/lib/agenticChat.ts`, `src/hooks/useChatHistory.ts` (new), `src/hooks/useAgenticChat.ts`, `supabase/functions/agentic-chat/index.ts`, `src/components/editor/AgenticChatSheet.tsx`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Task #7 — Build from Text resume creation mode)

### FEAT — "Build from Text" in CreateResumeDialog

- **`CreateResumeDialog.tsx`**: Added fifth `CreateMode` value `'paste'`. New "Build from Text" option appears in the mode picker (after "Import Profile"). Mode renders a textarea for freeform career text and an optional title input. On submit, calls `parse-linkedin` edge function with `platform: 'generic'`, maps the parsed `ProfileData` to `ResumeData` (same field mapping as `showLocalImport`), creates the resume via `useResumeMutations.createResume`, and navigates to `/editor`. Errors render inline below the textarea (no toast). Loading state shows "Building..." on the submit button. State (`pasteText`, `pasteTitle`, `pasteError`) is reset in `resetAndClose`.
- **`parse-linkedin/index.ts`** — `generic` platform hint updated: added explicit instruction that input may be informal or bullet-point notes, and that AI must never invent data not present in the text.
- **Intent**: Competes directly with Google's "Smart CV Generator" — lets users build a structured resume from any unstructured career text (notes, a bio, informal bullet points) without needing a polished LinkedIn export or PDF.

**Files changed**: `src/components/dashboard/CreateResumeDialog.tsx`, `supabase/functions/parse-linkedin/index.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Governance — AI System Architecture Amendment)

### GOV-AI-AUDIT — AI System Governance Update

A full audit of all AI providers, AI Studio tools, and Supabase edge functions was run on 2026-04-15. Findings were used to expand `project-governance/ARCHITECTURE.md` and promote four structural observations into enforceable governance rules.

**Section 2 (Modification Rules) — Four new enforceable rules added:**
- **Rule A — Four-Layer Security Invariant**: Every new AI endpoint must enforce, in order: JWT auth → rate limit → atomic credit check → payload size guard. BYOK users bypass credit check only.
- **Rule B — Deterministic Scoring is Sacred**: `score-resume` uses no AI and must not deduct credits. Its `_shared/scoringFunctions.ts` logic must remain deterministic. Replacing it with AI requires a spec + constitution amendment.
- **Rule C — Orphan Function Retention**: `fetch-github-projects` is retained pending UI wiring ("Sync GitHub" in portfolio settings). Deletion without explicit owner sign-off is a governance violation.
- **Rule D — Voice Pipeline Change Protocol**: The three-layer interview voice pipeline (ElevenLabs STT → Gemma LLM → browser TTS) must be validated end-to-end before any change merges.

**Section 8 (AI System Architecture) — Expanded with:**
- Credit system clarifications: 2-credit cost for `tailor-resume`/`generate-cover-letter`; `score-resume` credit exemption noted.
- BYOK Strict Mode and hard-vs-skippable error distinction documented.
- Full 8-step AI routing priority chain (previously only 3 steps documented).
- AI Studio Tools Inventory: all 15 tools listed by category with edge function mappings.
- `wise-ai-chat` dispatch map: all 7 accepted `type` values with purpose descriptions.
- Voice Interview Pipeline: three-layer diagram, fallback path, and scoring behaviour documented.
- Key Frontend AI Hooks table: `useAIAction`, `useAICredits`, `useVoiceInterview`, `useAIEnhance`, `usePlan`.

**Files changed**: `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---
