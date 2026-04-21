# Changelog

## 2026-04-21 — TPL-3: photo handling + print-safe CSS wiring (Task #32)

- **`src/components/templates/CreativeTemplate.tsx`** — added `crossOrigin="anonymous"` to the photo `<img>` so html2canvas does not taint the export canvas when `photoUrl` is on a different origin (taint causes `toDataURL('image/png')` to throw `SecurityError` and aborts the entire PDF export).
- **`src/components/templates/DesignerTemplate.tsx`** — added `crossOrigin="anonymous"` and removed `loading="lazy"` from the photo `<img>`. html2canvas does not trigger lazy loading; the offscreen capture would otherwise serialize an unpainted image and the photo would render blank in the exported PDF.
- **`src/components/editor/TemplateSelector.tsx`** —
  - `handleSelect` now fires a one-time `toast.warning` (sonner) when the user picks `'creative'` or `'designer'`: "Photos may hurt ATS scoring in some regions" with a description explaining the Workday / Greenhouse / US/UK scoring penalty. Suppression is persisted in `localStorage` under the key `wr.photoTemplateAtsHintShown` so it fires once per browser, not on every selection. Wrapped in try/catch so private-mode browsers without localStorage just skip the persistence (worst case the user sees the toast more than once).
  - When the sheet is opened and Creative/Designer is already the active template, an inline amber `role="note"` banner is rendered above the grid as a passive secondary cue.
- **`src/styles/print-safe.css`** (deleted) — every selector in the file was gated on `[data-pdf-force-layout]`. A repo-wide grep confirmed nothing in the codebase set the attribute and nothing imported the stylesheet (no `import`, no `<link>`, not in `index.html`, not in `main.tsx`, not in any Vite config). The file was dead code. Per the audit's finding #5 (P1), deletion was preferred over wiring the attribute because none of the 30 templates rely on `backdrop-filter`, `position: sticky`, or animated gradients inside the captured tree.
- **`replit.md`** — documented the print-safe.css deletion decision and the photo `<img>` invariants (`crossOrigin="anonymous"`, no `loading="lazy"`) so future template work doesn't regress either.

## 2026-04-21 — AI-5: stop secret/prompt leakage in AI errors (Task #25)

- **`supabase/functions/_shared/scrubSecrets.ts`** (new) — `scrubSecrets(s)` and `scrubAndCap(s, max=100)` redact common API key shapes (URL `key=…`, `Bearer …`, OpenAI `sk-…`, Anthropic `sk-ant-…`, Groq `gsk_…`, xAI `xai-…`, Google `AIza…`, Slack `xoxb-…`) to the marker `[REDACTED]`. Pure, idempotent, null-safe.
- **`supabase/functions/_shared/aiClient.ts`** —
  - Gemini `callVertexAI` switched from `?key=${apiKey}` to the `x-goog-api-key` request header so the key cannot leak via Deno-constructed `TypeError`/`AbortError` `.message` strings.
  - Every provider error path (`callOllamaDirect`, `callOpenRouterDirect`, `callOpenAICompatible`, `callAnthropicDirect`, `callGroqDirect`, the WiseResume managed `callOpenRouterUpstream`, and `handleGeminiError`) now scrubs `errorText` before `console.error` and runs the upstream `errorMessage` through `scrubAndCap` (~100 chars) before forwarding into `createAIError`.
  - `toUserError` scrubs both the stderr line and the `diag` returned in the JSON envelope; non-Error / non-string branches stringify-then-scrub.
  - `isBreakerOpen` and `getOpenRouterAdminSettings` emit a `recordFailOpen(...)` signal on every fail-open branch. `getOpenRouterAdminSettings` now prefers the last successfully-cached value over the hardcoded `OPENROUTER_CURATED_MODELS[0]` on DB error — only cold-start with no cache falls back to the default.
- **`supabase/functions/_shared/userRateLimiter.ts`** — fail-open count-query path and best-effort insert path both call `recordFailOpen('rate_limiter_fail_open' | 'rate_limiter_insert_fail_open', { feature, reason })`.
- **`supabase/functions/_shared/opsHealth.ts`** (new) — `recordFailOpen(event, { feature, reason })` is a fire-and-forget `queueMicrotask` insert into `public.ops_health_events`. Errors are swallowed so a broken health table cannot itself cause an outage.
- **`supabase/migrations/20260507000020_ops_health_events.sql`** (new) — `public.ops_health_events(id, ts, event, feature, reason)` with length-cap CHECKs, `(ts desc)` and `(event, ts desc)` indexes, RLS enabled with `revoke all from anon, authenticated` (only the service role and the SECURITY DEFINER RPC reach it). `public.ops_health_recent_counts(p_window_minutes default 60)` returns per-(event, feature) counts in the window for an on-call dashboard; EXECUTE granted to `service_role` only.
- **`src/lib/aiErrorParser.ts`** — `aiErrorToastMessage` no longer echoes the server diagnostic message for the `internal` code; it always returns the friendly mapped copy. The diag remains on `info.message` for console-only logging.
- **`src/hooks/useAIAction.ts`** — `mapErrorMessageToUserCopy` no longer passes through "Something went wrong: …" verbatim; it maps to the generic friendly copy.
- **Tests** — `supabase/functions/_shared/__tests__/scrubSecrets.test.ts` (Deno) covers each documented pattern, idempotency, non-string inputs, the `scrubAndCap` length bound, and an integration assertion that a Deno-style fetch error containing a fake Gemini key in the URL is redacted in BOTH the JSON envelope returned by `toUserError` AND the captured stderr (`[REDACTED]` marker present, key absent). `src/lib/__tests__/aiErrorParser.test.ts` (Vitest) asserts the toast no longer surfaces the server diag for the `internal` code while `parseAIErrorBody` still preserves it on the parsed info object for console logging.

---

## 2026-04-21 — DB perf: audit unused indexes, no drops shipped (Task #14)

- **`.local/db-analysis/pg_stat_user_indexes.json`** (new) — snapshot of `pg_stat_user_indexes` for the 32 advisor-flagged indexes plus owning-table size and `n_live_tup`, captured against project `jnsfmkzgxsviuthaqlyy` via the Supabase Management `/database/query` endpoint. Includes `pg_stat_get_db_stat_reset_time(...)` (= `2025-12-08 11:03:29 UTC`) and `pg_get_indexdef(...)` per row.
- **`docs/db-unused-index-analysis.md`** (new) — per-index classification of all 32 candidates into (b) keep — backs a known query, or (c) keep — newly created and not yet exercised. None classified as (a) safe to drop. Documents the re-evaluation criteria (re-run when target tables exceed ~1k rows AND advisor still flags them after ≥ 2 weeks of post-growth traffic).
- **`supabase/migrations/20260505000000_unused_index_audit_no_drops.sql`** (new) — documentation-only migration (single `RAISE NOTICE` in a `DO` block, no DDL). Records the audit checkpoint and references `docs/db-unused-index-analysis.md`.
- **Why no drops** — every flagged table is currently 0–15 rows in production (total relation size ≤ 24 KB), so the planner always picks a sequential scan and `idx_scan = 0` is expected behaviour, not evidence the index is unneeded. 21 of 32 flagged indexes are on `wisehire_*` / `talent_pool_*` tables for the WiseHire feature that launched 2026-04-20 (one day before the advisor was run). The remaining 11 back documented filter / lookup paths (per-user resume & application lists, share-token URL resolution, coupon validation, admin queues, analytics group-bys), each ≤ 16 KB. The advisor `unused_index` count is unchanged; remaining entries are all categorized in the doc.

---

## 2026-04-20 — DevKit: one-click sample resume seeding for AI Studio testing (Task #17)

- **`src/lib/devkit/sampleResume.ts`** (new) — `buildSampleResume(displayName)` factory returning a realistic `ResumeData` payload + a `Demo Resume — <First>` title. Includes 3 work experiences (Northwind Labs / Brightline Health / Pixelforge Studio), 1 education entry (UC Davis BS CS), 12 skills, an AWS certification, an open-source project, and a volunteering entry. `templateId` defaults to `'modern'`. The summary, achievements, and responsibilities are written with enough specificity that `update_summary`, `tailor`, `cover_letter`, and interview-prep tools have meaningful content to operate on (vs. the cosmic placeholder in `src/lib/templateData.ts`'s `sampleResumeData`).
- **`src/components/dev-kit/AppSettingsPanel.tsx`** — Imports `useResumeMutations`, `useResumes`, `useAuth`, and `buildSampleResume`. New `handleCreateSampleResume` callback derives a display name from `user.name` (falling back to email local-part) and calls `createResume.mutateAsync({ resume, title })`, which goes through the standard `supabase.from('resumes').insert(...)` path used by `CreateResumeDialog`. New "Demo Data" section rendered just before the Reset Credits dialog with a "Create sample resume" button (loading + disabled states wired). When at least one existing resume already starts with the title `Demo Resume`, an inline hint warns that clicking again will create another copy. No new edge function or admin endpoint — the seed is per-caller, invoked under the admin's own JWT, so it lands in the same `resumes` table and is immediately selectable from `/ai-studio`.
- **Why** — Task #16 verification surfaced that the admin test account (`Magdy.saber@outlook.com`) had no resumes, which makes the AI Studio chat composer inactive (it requires a selected resume). This unblocks live verification of any future work touching chat / tailoring / cover letters / interview prep when only an admin account is available.

---

## 2026-04-19 — Scroll-stack cards: fix zoom, internal animation, and iOS touch zoom (maintenance)

- **`src/components/landing/ScrollStack.css`** — `.lp-stack-parallax` counter-translate removed (was `translate3d(0, calc(var(--card-translate-y,0px)*-0.15),0)`; now `transform:none`). This caused the demo screenshot inside the card to visibly drift as the user scrolled — the "content animates inside the card" complaint. Added `touch-action: manipulation` to `.scroll-stack-scroller`, `.scroll-stack-card-wrap`, and `.scroll-stack-card` to prevent iOS Safari double-tap zoom on scroll-stack touch events.
- **`src/components/landing/FeatureSection.tsx`** — `containerVariants` motion.div changed from `initial={prefersReducedMotion ? 'visible' : 'hidden'} whileInView="visible"` to `initial="visible" animate="visible"`. The whileInView slide animations (x:±100, y:70) were firing while the card was already in view inside the scroll stack, making text/media/bullets slide in unexpectedly. Outer padding reduced from `clamp(48px, 6vw, 80px)` to `clamp(24px, 3vw, 44px)`; pane `minHeight` reduced from 280 to 200. Total card height drops from ~530px to ~390px — fits within a 720px viewport with the 20% stack pin.
- **`src/components/landing/wisehire/WiseHireDemoSection.tsx`** — `DEMO_SLOT_HEIGHT` reduced from 380 to 300 (BriefDemo at ~350px still shows through Considerations with minor bottom clip). Top padding reduced from `clamp(32px, 4vw, 56px)` to `clamp(20px, 3vw, 36px)`; inner gap reduced from 24 to 16px. Total card height drops from ~550px to ~440px — fits within a 720px viewport.

---

## 2026-04-19 — Landing page FCP: 5–16s → 820ms; eliminate staggered hero paint (maintenance)

- **`src/lib/captureErrorShim.ts`** (new) — Dependency-free `captureError()` + `setRealCaptureError()` + `earlyCaptureBuffer` (capped at 100 entries). Allows eager-loaded code to call `captureError` without importing `@sentry/react` into the entry chunk.
- **`src/components/ErrorBoundary.tsx`** — Changed `import { captureError }` from `@/lib/monitoring` → `@/lib/captureErrorShim`. ErrorBoundary mounts at the top of `App.tsx`, so the old import dragged Sentry into the entry graph and ran `Sentry.init()` before first paint.
- **`src/components/dev-kit/DevKitPanelBoundary.tsx`** — Same import swap: `@/lib/monitoring` → `@/lib/captureErrorShim`.
- **`src/main.tsx`** — Replaced hand-rolled `earlyErrorBuffer` array + inline `captureError` closure with `import { captureError } from "./lib/captureErrorShim"`. Deferred Sentry load: after `createRoot`, on `requestIdleCallback` (1.5s `setTimeout` fallback), dynamically imports `./lib/monitoring`, calls `initMonitoring()`, wires `setRealCaptureError(mon.captureError)`, and drains `earlyCaptureBuffer`. Added `void import('@/components/landing/LandingMotionStage')` warmup so the framer-motion chunk starts downloading in parallel with the hero instead of being a waterfall hop.
- **`src/components/landing/landingAnimations.ts`** — `SCATTER_SECTION_ITEM.hidden(i)` now returns the identity transform (`opacity:1, filter:'', x:0, y:0`) for `i === 0`. The hero painted at opacity 0 (scatter start state) and spring-animated to visible — producing the "wallpaper then text 1 second later" gap. Sections below the fold (i ≥ 1) keep the scatter entrance.
- **Measured result:** FCP 5,920–16,288ms → 820ms ("good"). Hero, CTA, badges, and feature ticker all visible together on first paint.

---

## 2026-04-19 — Preview tailored resume before committing (Task #5)

- **`src/lib/tailorMerge.ts`** (new) — `buildMergedResume(currentResume, tailorResult, enabledSections, rejectedBullets)` shared helper. Centralises the section-by-section merge of `SuperTailorResult` onto `ResumeData`, including ID-based merge for `experience`/`education` and per-bullet rejection re-application.
- **`src/components/editor/tailor/TailorPreviewSheet.tsx`** (new) — Bottom drawer that renders an ephemeral merged resume snapshot via the same lazy-loaded template components as `LivePreviewPanel` (no DB write, no zoom/PDF chrome). Props: `open`, `onOpenChange`, `resume`, `templateId?`, `onApply?`, `isApplying?`, `applyLabel?`. Falls back to `modern` template if `resume.templateId` not in the registry.
- **`src/components/editor/TailorSheet.tsx`** — Replaced inline merge logic in `handleApplyChanges` with `buildMergedResume()` call. Added `showTailorPreview` state. Added Eye-icon "Preview" button to sticky CTA footer between "Discard" and the primary CTA (renamed from "Preview & Apply" to "Compare & Apply" to disambiguate from the new template-rendered preview). Mounted `<TailorPreviewSheet>` that computes merged resume on demand and forwards Apply CTA to existing `handleApplyChanges`.
- **`src/pages/TailorPage.tsx`** — Same refactor: `handleApplyChanges` now uses `buildMergedResume()`. Added `showTailorPreview` state and `<TailorPreviewSheet>` mount. `ResultsPanel` gained `onPreview: () => void` prop and a third "Preview" button next to Discard/Apply (responsive flex-wrap).
- **Behaviour** — Preview honours current `enabledSections` toggles and `rejectedBullets`. No new resume row is created until the user clicks Apply (either from the results panel or from inside the preview drawer).

---

## 2026-04-19 — Fix two React Query cache bugs in WiseResume (Task #50)

- **`src/hooks/useChatHistory.ts`** — `useChatSessions`: added `user` to `useAuth()` destructure; queryKey changed from `['chat_sessions']` to `['chat_sessions', user?.id]`. `useDeleteChatSession`: added `const { user } = useAuth()`; `invalidateQueries` target updated to `['chat_sessions', user?.id]`. Prevents cross-user session cache bleed during account switching within a single browser tab.
- **`src/hooks/useResumeVersions.ts`** — `deleteVersion` mutationFn input changed from `versionId: string` to `{ versionId: string; resumeId: string }`; `onSuccess` now invalidates `['resume-versions', variables.resumeId]` instead of the global prefix `['resume-versions']`. Prevents unnecessary refetches of all other open resumes' version lists on delete.
- **`src/components/editor/VersionHistorySheet.tsx`** — `deleteVersion.mutate(version.id)` → `deleteVersion.mutate({ versionId: version.id, resumeId: resumeId! })`.

---

## 2026-04-19 — refundCredit() on all AI failure paths across 24 edge functions (Task #49)

Added credit refunds to every failure path that occurs after `checkAndDeductCredit()` in all 24 WiseResume AI edge functions. No-ops for BYOK/unlimited users.

**Functions patched** (all refund on AI call exceptions, empty/null content, and unparseable JSON):
- 1-credit: `analyze-resume`, `career-assessment`, `career-path-advisor`, `one-page-optimizer`, `recruiter-simulation`, `generate-resignation-letter`, `explain-gap`, `fill-gap`, `tailor-section`, `company-briefing`, `optimize-for-linkedin`, `parse-linkedin`, `generate-question-bank`, `suggest-template`, `detect-and-humanize`, `enhance-section`, `generate-headshot`, `parse-job-url`, `parse-job-text`, `elevenlabs-scribe-token`, `parse-resume`
- 2-credit: `generate-cover-letter`, `tailor-resume` (Stage 2 only)
- Multi-path: `generate-portfolio-bio` (7 separate callAI paths)

**Structural fixes required for correct scoping:**
- `detect-and-humanize/index.ts`: hoisted `creditCheck` before detect/humanize if-blocks so both branches share the same reference.
- `parse-job-text/index.ts`: hoisted `creditCheck` before inner AI try block.
- `elevenlabs-scribe-token/index.ts`: hoisted `creditCheck` out of `!hasByokKey` block.
- `parse-resume/index.ts`: hoisted `_refundUserId` before outer try; inner catch refunds on 429 rate-limit and on service-unavailable fallback (503/500/0/401/403/404) even when `localParseResume` succeeds; outer catch refund guarded by `if (creditCheck && _refundUserId)`.
- `generate-headshot/index.ts`: added try/catch around `response.json()` with refund; added refund before `!imagePart?.inlineData` 500 return.
- `parse-linkedin/index.ts`: added refund before `throw new Error("No structured data returned from AI")`.
- `enhance-section/index.ts`: added refund before `throw new Error('No content in AI response')`.

**Stale comments removed:** "Atomically deduct credits server-side…" comments deleted from 12 files via sed.

---

## 2026-04-19 — Edge function redeploy + GitHub sync (maintenance)

- Deployed 7 updated Supabase Edge Functions to project `jnsfmkzgxsviuthaqlyy` via Supabase CLI v2.90.0: `track-portfolio-view`, `portfolio-interest`, `resolve-short-link`, `admin-portfolio-usernames`, `generate-cover-letter`, `generate-resignation-letter`, `weekly-digest`.
- Pushed all commits (Tasks #1–#4) to `origin/main` on GitHub (`iammagdy/wiseresume-74945019`).
- Documentation updated: CHANGELOG, stability-improvements.md, database-table cards, replit.md.

---

## 2026-04-18 — Portfolio analytics: cut over to portfolio_id FK (Task #4)

Portfolio visit/interaction/short-link rows now track `portfolio_id` (stable uuid) alongside the legacy `username` text column so analytics survive admin username renames.

- **Migration** (`supabase/migrations/20260418195803_portfolio_id_consumers.sql`): adds `ON UPDATE CASCADE` to legacy username FKs on `portfolio_visits`, `portfolio_interactions`, `short_links`; adds `portfolio_username` FK to `short_links` if missing.
- **`supabase/functions/track-portfolio-view/index.ts`**: resolves `portfolio_id` from username before calling `record_portfolio_visit` RPC; passes both columns.
- **`supabase/functions/portfolio-interest/index.ts`**: resolves `portfolio_id`; includes it in insert, keeps legacy `portfolio_username` for FK.
- **`supabase/functions/resolve-short-link/index.ts`**: returns `portfolio_id` from the RPC response.
- **`supabase/functions/weekly-digest/index.ts`**: counts portfolio views by `portfolio_id` instead of `username`.
- **`supabase/functions/admin-portfolio-usernames/index.ts`**: rename now updates `portfolios.username` so `ON UPDATE CASCADE` keeps analytics columns in sync.
- **`server/schema.ts`**: added nullable `portfolio_id` + new BTREE indexes + `ON UPDATE CASCADE` on legacy text FKs for `portfolio_visits`, `portfolio_interactions`.
- Legacy username columns retained for this release as fallback. Follow-up migration drops them once soak completes.

---

## 2026-04-18 — Persist AI-generated cover letters and resignation letters (Task #3)

- **`supabase/functions/_shared/letterPersistence.ts`** (new): schema-tolerant INSERT helper for `cover_letters` / `resignation_letters`; handles old and new column shapes with automatic fallback.
- **`supabase/functions/generate-cover-letter/index.ts`**: calls `persistLetter` after generation; returns `{ id, content, ... }`. Persistence failure returns 500 `persist_failed` instead of silent drop.
- **`supabase/functions/generate-resignation-letter/index.ts`**: same pattern.
- **Frontend `CoverLetterNewPage`**: captures returned `id`, invalidates history query, routes Save to edit page; removed legacy client-side insert fallback.
- **Frontend `ResignationLetterNewPage`**: same.

---

## 2026-04-18 — Apply backend remediation migrations to Supabase (Task #2)

Applied three Phase-1 schema migrations to canonical Supabase project `jnsfmkzgxsviuthaqlyy`:

- `20260418195800_schema_hardening.sql`: `subscriptions_user_id_key` UNIQUE, `ai_credits_user_id_key` UNIQUE, `uniq_resumes_primary_per_user` partial index; `wisehire_candidates.tags` typed to `text[] NOT NULL DEFAULT '{}'`; `profiles.email` uniqueness dedup wrapped in column-existence guard (column is `contact_email` on Supabase, not `email` — guard no-ops cleanly).
- `20260418195801_portfolio_id_columns.sql`: adds `portfolio_id uuid` to `portfolio_visits`, `portfolio_interactions`, `short_links`; all blocks wrapped in `to_regclass` guards.
- `20260418195802_letters_persistence.sql`: `cover_letters` and `resignation_letters` tables; `ALTER TABLE ADD COLUMN IF NOT EXISTS` for each new column added since the earlier schema version; owner-only RLS policies. `current_role` quoted to avoid Postgres reserved-word clash.
- Ran `npm run db:push` to sync Neon dev mirror with new `coverLetters` / `resignationLetters` Drizzle defs.

---

## 2026-04-18 — Backend remediation: canonical DB, schema hardening, edge function cleanup (Task #1)

- **`docs/backend.md`** (new): Supabase is canonical DB; Neon is dev-mirror only. Documents reconciliation workflow, proxy boundary rules, and what each data type lives where.
- **`supabase/migrations/20260418195800_schema_hardening.sql`**: UNIQUE constraints on `subscriptions(user_id)`, `ai_credits(user_id)`; partial unique on `resumes(user_id) WHERE is_primary`; `lower(profiles.email)` unique with backfill; `wisehire_candidates.tags → text[] NOT NULL`.
- **`supabase/migrations/20260418195801_portfolio_id_columns.sql`**: additive `portfolio_id uuid` columns on three `portfolio_*` tables; back-filled from username join.
- **`supabase/migrations/20260418195802_letters_persistence.sql`**: `cover_letters` + `resignation_letters` tables with owner-only RLS.
- **`server/schema.ts`**: added `coverLetters`, `resignationLetters` Drizzle table definitions (`content jsonb`, indexes on `(user_id, updated_at DESC)`).
- **Deleted** source dirs for 3 confirmed-orphan edge functions: `wisehire-apply`, `send-feature-request`, `send-contact-inquiry`.
- **`supabase/functions/EDGE_FUNCTION_AUDIT.md`**: updated with removed functions, platform-hook documentation, ghost-function status table.
- **`BACKEND_AUDIT.md`**: §9 Closure Notes added (drift vs. reality, what was applied, what needs human action).

---

## 2026-04-18 — DevKit comprehensive hardening, phase 3: full unmount-guard sweep (Task #30)

Closes every remaining unmount-race surface identified by the validator so the admin DevKit has zero React setState-on-unmount warnings.

### `UserDetailDrawer` — 13 invoke-site conversions + complete unmount guards
- Added imports: `useIsMounted`, `unwrapAdminResponse`, `tryUnwrapAdminResponse`, `formatEdgeError`.
- All 5 data-load `useEffect` invoke sites converted (admin-audit-logs, admin-save-note list, admin-list-user-content, admin-update-profile get, admin-get-identity): `.then({ data }) →` `.then((tuple) =>` + `unwrapAdminResponse`/`tryUnwrapAdminResponse` + `cancelled` guard inside `.then`.
- All 12 mutation handlers (handleMergeIdentity, handleSaveProfile, handleSetPlan, handleGrantTrial, handleRevokeTrial, handleToggleSuspend, handleSetCredits, handleSaveNote, handleDeleteNote, handleRevokeSessions, handleDeleteUser, handleLoadResumeDetail): `const { data, error } = await …; if (error) throw; const result = data as …; if (result?.success === false) throw` replaced with `const tuple = await …; unwrapAdminResponse(tuple, fnName)`. Each handler adds `if (!isMounted()) return` after the unwrap, and guards its `finally` setter with `if (isMounted()) setter(...)`.
- `isMounted = useIsMounted()` declared once at component-function top (line ~119).

### `DeploymentPanel` — contact_requests probe
- `useEffect` querying `supabase.from('contact_requests')` now declares `let cancelled = false` and returns `() => { cancelled = true }` so `setContactTableOk` cannot fire after panel unmounts.

### `EmailManagementPanel.ComposeEmailForm` — full unmount safety
- `isMounted = useIsMounted()` added.
- Debounce cleanup `useEffect`: `return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }` prevents stale debounce timers surviving unmount.
- `handleSearch` debounced callback: `if (!isMounted()) return` as first statement inside `setTimeout`; `catch` and `finally` both gate with `isMounted()`.
- `handleSend`: `if (!isMounted()) return` added after each `unwrapAdminResponse` (wisehire-invite path and email-actions path); `finally { if (isMounted()) setSending(false) }`.

### `LiveActivityPanel.runHealthChecksForDefs`
- `if (!isMounted()) return` added after the sequential await loop, before `setFnHealth`, `setHealthRunning`, `setHealthCheckedAt`, and `setRecentErrors`.
- `isMounted` added to `useCallback` deps.

### Build / type-check
- `tsc --noEmit` clean.
- `vite build` clean (522 precache entries, no new warnings).
- Grep for `success === false` / `success !== false` / `as { success` in `src/components/dev-kit/`: 0 hits.

---

## 2026-04-18 — DevKit comprehensive hardening, phase 2: complete unwrap adoption + per-row bulk results

Closes the "deferred" list from the morning's phase-1 push so the admin DevKit has zero known bugs:

### `unwrapAdminResponse` adoption — every panel
Every `edgeFunctions.functions.invoke` call site in `AppSettingsPanel`, `AuditLogPanel`, `CouponsPanel`, `WiseHireWaitlistPanel`, `EmailManagementPanel` (6 sites incl. the diagnose-domain `useEffect`), `PortfolioUsernamesPanel` (via shared `invoke()` helper), `OnboardingFunnelPanel`, and `AdminUsersPanel` (`fetchUsers`, all 4 bulk-action variants in `handleBulkConfirm`, the `handleExportCSV` pagination loop, and the audit-log write) now flows through `unwrapAdminResponse` / `tryUnwrapAdminResponse`. Replaces the last unchecked `as { success?, error? }` casts and routes errors through `formatEdgeError` for consistent toast/error-string output.

### Unmount-guard sweep — every panel touched this pass
All of the panels above gained `useIsMounted()` and now gate every post-await `setState` (and the `finally` `setLoading(false)`) behind `isMounted()`. Eliminates "set state on unmounted component" warnings during fast tab-switching while a request is in flight. `AuditLogPanel` additionally migrated its 30 s poll to `useVisibleInterval` and cleared its search-debounce timer on unmount.

### `AdminUsersPanel` — per-row bulk-action result table
After Apply Plan / Suspend / Unsuspend / Grant Trial completes, a `<Dialog>` opens listing every targeted user with a green "OK" / red "Fail" badge plus the per-row error reason from `formatEdgeError`. Replaces the old behavior of a single aggregated toast that hid which specific users failed and why. The CSV-export audit-log write also no longer blocks the export on its own failure — it surfaces a warning toast and lets the download complete.

### Build / type-check
- `tsc --noEmit` clean.
- `vite build` clean (522 precache entries, no new warnings).

---

## 2026-04-18 — DevKit comprehensive hardening: crash-safety, unmount guards, typed errors

Phase-1 hardening of the admin DevKit (15 panels, ~12k LOC) so a single misbehaving panel can no longer take the entire admin surface down, background polling no longer leaks past unmount, and the most-cast `as any` error-parsing block is replaced with a typed helper. Production behaviour is otherwise unchanged.

### New shared utilities (`src/lib/devkit/`)
- `hooks.ts` — `useIsMounted`, `useAbortOnUnmount`, and `useVisibleInterval` (pauses polling while the document is hidden, resumes on focus, cleans up on unmount).
- `edgeResponse.ts` — `EdgeFunctionError` class plus `unwrapAdminResponse` / `tryUnwrapAdminResponse` / `formatEdgeError`. Replaces dozens of unchecked `as { success?, error? }` casts with one validator that distinguishes transport errors, `{ success: false }` payloads, and "function not deployed" 404s.

### Panel-scoped crash boundary
- New `src/components/dev-kit/DevKitPanelBoundary.tsx` wraps the panel-rendering region of `src/pages/DevToolsPage.tsx`. If any panel throws during render, the rest of the DevKit shell (sidebar, tab bar, header, lock button) stays alive and the admin sees a "Try again" card scoped to that panel. Boundary resets automatically on tab switch via `key={activeTab}`.

### Panel fixes
- **OverviewPanel** — replaced the unbounded `while (true)` pagination loop with a hard cap (`MAX_OVERVIEW_PAGES = 50`) and an `isMounted()` guard between every page; switched to `unwrapAdminResponse`; added a visibility-aware 60 s auto-refresh that pauses while the tab is hidden.
- **AnalyticsPanel** — adopted `unwrapAdminResponse` + unmount guard; clears stale data on range change so the chart never shows numbers from the wrong window during a refresh.
- **UserDetailDrawer** — replaced the three silent `.catch(() => {})` swallowing failures on `admin-audit-logs`, `admin-save-note (list)`, and `admin-get-identity` with logged + toasted errors so admins are never left wondering why a tab is empty.
- **DeploymentPanel** — `fetchSweepStatus` now uses an abort-on-unmount controller and `isMounted()` guards around every `setState`; `AbortError` is suppressed.
- **LiveActivityPanel** — converted the two 30 s polling intervals to `useVisibleInterval`, so admin-fn health pings and event/error/contact refreshes pause while the DevKit tab is in the background.
- **DevKitRunner** — eliminated all six `as any` casts in error parsing via a new `RunnerError` interface and `toRunnerError(input)` helper that handles `Error`, plain `{ error, message, status }` objects, strings, and `null`.

### Verified already-correct (no change needed)
- LiveActivityPanel **already** gates the 4 AI-burning checks behind an explicit "Run health check" button; the 30 s auto-loop only covers the lightweight admin functions. Earlier audit note about auto-burning AI credits was a misread.
- `PortfolioUsernamesPanel` — `UserSearchInput` is debounced at 250 ms.

### Build / type-check
- `tsc --noEmit` clean.
- `vite build` clean (522 precache entries, no new warnings).

## 2026-04-18 — AI Provider Panel: close out audit findings (F5 + verification)

Re-audited every finding in `Project Atlas/02-Planned/ai-provider-panel-audit-findings.md` (F1–F8 + S1–S3, P1–P6, A3) against the live code. Confirmed 14 of 15 in-scope items were already shipped in prior tasks. The audit document was updated with a status table pointing at the exact file:line evidence for each.

### Fix shipped
- **F5: invalid Tailwind opacity classes** — replaced 6 occurrences of `bg-amber-500/8` and `bg-primary/8` with `/10` in `src/components/dev-kit/AIProviderPanel.tsx`. The non-standard `/8` step is silently dropped or rendered transparent depending on the JIT build, leaving the breaker banner and active-tab chip without their intended tint.

### Verified already-done (no code changes needed)
F1 breaker countdown ticker • F2 gemini-test model validation • F3 gemini-models prefix stripping • F4 stale test-banner reset on tab switch • F6 Ollama refetch on base URL change • F7 Safari-safe abort timeout • F8 Refresh-all `Promise.allSettled` • S1 sanitised upstream errors • S2 `x-goog-api-key` header (no key in URL) • S3 fetchWithToken throws on missing token • P1 10-min upstream cache • P2 debounced search • P4 in-flight dedup • P6 OpenRouter models proxy • A3 admin audit log table.

### Still open (deferred backlog)
S4, P3, P5, U1, U2, U4, U5, A1, A2, A4 — all lower-priority polish/observability items, tracked in the same audit doc.

## 2026-04-18 — Make the marketing site discoverable to AI agents (Task #26)

Cloudflare's "Is It Agent Ready?" scan of `https://resume.thewise.cloud` previously scored 17/100 (Level 0 — Not Ready). This change publishes the standard discovery files, headers, and metadata that AI agents (Cloudflare AI, ChatGPT, Claude, etc.) look for, without altering any user-facing behavior.

### New static files (`public/`)
- `sitemap.xml` — 14 canonical public URLs (home, `/enterprises`, `/enterprise`, `/pricing`, `/examples`, `/guides`, `/whats-new`, `/waitlist`, `/wisehire/signup`, `/auth`, `/sign-in`, `/privacy-policy`, `/terms-of-service`, `/docs/api`).
- `.well-known/api-catalog` — RFC 9727 link set (`application/linkset+json`) anchoring `service-desc`, `service-doc`, and `service-meta`.
- `.well-known/openid-configuration` — OIDC discovery delegating to Kinde (`https://thewisecloud.kinde.com`).
- `.well-known/oauth-authorization-server` — OAuth 2.0 AS metadata mirroring Kinde.
- `.well-known/oauth-protected-resource` — RFC 9728 protected-resource metadata (`resource: https://resume.thewise.cloud/api`, `authorization_servers: [https://thewisecloud.kinde.com]`).
- `.well-known/mcp/server-card.json` — SEP-1649 server card with WebMCP discovery URL and OAuth metadata link.
- `.well-known/agent-skills/index.json` — Agent Skills Discovery v0.2.0 index with `$schema`, `skills[]`, and `sha256` per skill.
- `.well-known/agent-skills/start-resume.json` — descriptor for the `start-resume` skill (sha256 in `index.json` is computed from this file: `52649dab…c07ff`).
- `docs/api/index.html` — `service-doc` target listing discovery endpoints, OAuth flow, `/api/health`, `/api/db-health`, and the `/api/fn/*` proxy contract.

### `public/robots.txt`
- Added Cloudflare Content Signals: `Content-Signal: search=yes, ai-input=yes, ai-train=no` (sitemap reference already present).

### `public/_headers`
- Added `Link` headers on `/` and `/index.html` for `api-catalog` (`</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`), `service-doc` (`</docs/api>`), and `sitemap` (`</sitemap.xml>`).
- Added explicit `Content-Type` rules for `/sitemap.xml` (`application/xml`), `/robots.txt` (`text/plain`), and every extension-less file under `.well-known/` (`application/json`, or `application/linkset+json` for `api-catalog`).
- Added `Access-Control-Allow-Origin: *` to all `.well-known/*` so cross-origin agent fetches succeed.

### Cloudflare Pages middleware (`functions/_middleware.ts`)
- New file: `onRequest` performs `Accept: text/markdown` content negotiation. Browsers (`Accept: text/html…`) pass through unchanged.
- `/` and `/index.html` return a hand-authored markdown summary (product overview, key public routes, agent discovery URLs).
- All other public HTML routes fall through to a generic `htmlToMarkdown(...)` extractor that strips `<script>/<style>/<svg>`, normalizes headings, links, and lists, and returns `Content-Type: text/markdown; charset=utf-8`.
- `buildMarkdownHeaders('authored' | 'extracted')` attaches the same `Link` relations served on the HTML home page (`api-catalog`, `service-doc`, `sitemap`) to every markdown response, so agents discover the surface regardless of which `Accept` variant they use.
- Skips assets, `/.well-known/`, `/icons/`, `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/api/*`, and any non-`.html` extension.

### WebMCP integration (`src/hooks/useWebMcp.ts`, `src/pages/Index.tsx`)
- New hook `useWebMcp({ navigate, setMode })` feature-detects `navigator.modelContext.provideContext()` and registers four in-page tools: `open_pricing`, `open_examples`, `start_resume`, `switch_to_wisehire`. Hard-no-op in browsers without the API; `try/catch` around both registration and disposal guarantees a misbehaving WebMCP implementation can never break the page. Cleanup on unmount calls the returned `dispose()` if present.
- Wired into `Index.tsx` immediately after the `setLpProduct(mode)` effect.

### Notes / out of scope
- Markdown content negotiation is executed only by Cloudflare Pages in production — Vite dev does not run `functions/_middleware.ts`.
- A real OpenAPI 3.1 document for `/api/fn/*` is deliberately not published (follow-up #28). `/docs/api` is a hand-authored HTML overview that satisfies the `service-doc` Link relation.
- Per-route hand-authored markdown beyond `/` is deferred (follow-up #29) — the generic extractor covers the rest of the surface in the meantime.
- A live `isitagentready.com` re-run is captured as follow-up #27 and scheduled for after the next deploy.

---

## 2026-04-18 — Landing page audit fixes — full pass (Task #23)

Eleven landing-page audit findings (U-1/U-2/U-3 card clipping, B-1 dual Supabase clients, B-2 fonts blocking FCP, B-3 framer-motion in landing entry chunk, contrast/CTA hierarchy, GPU/log-noise) addressed in a single end-to-end pass. Three code-review iterations.

### Parallax / card geometry (`src/components/landing/FeatureSection.tsx`)
- Wrapped `.lp-stack-parallax` in an `overflow: hidden` rounded container; re-anchored the large watermark inside the bounded content container. ScrollStack geometry math is intentionally untouched (shared layout cache invariant preserved).

### Single Supabase client (`src/integrations/supabase/safeClient.ts`)
- Deleted `src/integrations/supabase/client.ts`. All WiseHire hooks/pages and dynamic imports now consume `safeClient` (`SupabaseClient<Database>` typed; TS inference preserved).

### Fonts (`index.html`, `src/main.tsx`, `vite.config.ts`)
- Removed Google Fonts `<link>` and preconnects from `index.html`.
- Added `@fontsource/*` imports in `src/main.tsx`; CSP `font-src` and `style-src` no longer reference `fonts.googleapis.com` / `fonts.gstatic.com`.

### Framer-motion ejected from landing entry chunk
- `src/pages/Index.tsx`: framer-motion removed entirely from the page module. AnimatePresence + `m.div` tree extracted into a new `src/components/landing/LandingMotionStage.tsx` (lazy via `React.lazy`).
- `framer-motion`'s `useReducedMotion` replaced by a vanilla `matchMedia` hook in `src/lib/usePrefersReducedMotion.ts`.
- `WaitlistModal` and `QuickTailorSheet` lazified (mount only on user action).
- `src/components/landing/LandingToggle.tsx` rewritten to use CSS transitions + a CSS keyframe ignition burst (no framer-motion import). Burst keyframes live in `src/pages/index-landing.css` (`@keyframes lp-toggle-burst`) — no inline `<style>` tag.
- `src/components/landing/LandingHeader.tsx`: Sign In restored to dominant filled red gradient; toggle active state toned down to subtle background tint + `inset 0 0 0 1px` brand outline.
- `src/components/landing/LandingModeTransition.tsx`: now `lazy()`-imported in `Index.tsx` and rendered only when `!prefersReducedMotion && waveKey > 0` — i.e. only after the user actually toggles between products. Reduced-motion users and users who never switch products never download the framer-motion chunk.
- Net result: framer-motion is absent from the landing entry graph; `manualChunks(id)` in `vite.config.ts` (line 122) routes it to the `framer` chunk, fetched in parallel with the entry rather than blocking it, and cached across product switches.

### Contrast & CTA hierarchy
- Footer text/link colors switched to a higher-contrast token; underlines added on links.
- Sign In returns to the dominant filled red style; toggle active states toned down (see above).

### GPU / log-noise
- Removed two landing backdrop blurs that were causing GPU stutter; fixed a Tailwind ambiguous-duration class; demoted analytics lock messages to `console.debug` gated on `import.meta.env.DEV`.

### Verification harness (`scripts/phase6-screenshots.mjs`, `docs/landing/audit-report-post-fix.md`)
- Fixed a JSDoc parse bug (`/*ungoogled-chromium*/` was prematurely closing a comment); pointed the harness at Playwright Chromium 1080 (`/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome`).
- Added a `footer` capture position so the matrix is now 16 shots (2 products × 2 themes × 4 positions: hero, mid, post, footer).
- Cold-cache headless FCPs after fixes: WiseResume light **2658 ms**, WiseResume dark **2175 ms**, WiseHire light **1907 ms**, WiseHire dark **1833 ms** (all under the 2790 ms baseline). WiseHire dark LCP improved from ~5.5 s baseline to **2.9 s**.

### Notes
- `npx tsc --noEmit` passes.
- The pre-existing `safeClient.test.ts` vitest failure reproduces on `main` and is not caused by Task #23.
- Follow-ups #24 (broader LazyMotion migration) and #25 (WebGL pause offscreen) were proposed during the task and remain pending.

---

## 2026-04-18 — Speed up the AI Provider activity log and admin tests (Task #10)

Performance & correctness consolidation following the Task #5 audit. Eight focused changes spread across the panel, the Express server, the schema, and the deployment dashboard — no API surface changes.

### Schema (`server/schema.ts`)
- **Step 1**: Added composite index `idx_admin_audit_log_at_id` on `admin_audit_log (at DESC, id DESC)`. Without it, the unfiltered `GET /api/admin/ai-provider/audit-recent` cursor scan (`ORDER BY at DESC, id DESC`) had to fall back to a heap scan as the table grew, because the existing `actor_at` / `action_at` indexes lead with a different column. Pushed via `npm run db:push`.

### Server (`server/index.ts`)
- **Step 2**: Extended `runAnalyticsSweep` with a batched `admin_audit_log` purge (cutoff = `now() - ADMIN_AUDIT_LOG_RETENTION_DAYS`, default **365 days**). Inlined as a `WITH victims AS (… FOR UPDATE SKIP LOCKED) DELETE … USING victims` rather than wired through the Supabase `sweep_analytics_retention_batch` RPC, since `admin_audit_log` lives on Replit Neon (the RPC's table allow-list lives in a Supabase migration). Reuses the shared `ANALYTICS_SWEEP_BATCH_SIZE` (10k) and `ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE` (1000) constants and the cross-instance lease with the same `renewLease()` heartbeat. `SweepResult` and `SweepStatus.config` extended with `admin_audit_log_deleted` / `admin_audit_log_cutoff` / `adminAuditLogRetentionDays`. New env var `ADMIN_AUDIT_LOG_RETENTION_DAYS` for tuning without a migration.
- **Step 3**: Every `writeAdminAudit(...)` call site (gemini-test 3x, audit-model-switch, audit-test) is now fire-and-forget (`void writeAdminAudit(...).catch(console.error)`). The 50–200ms audit insert no longer adds to the response latency seen by the panel. `writeAdminAudit` already swallows its own errors; the trailing `.catch` is a defensive guard against future refactors that re-throw.
- **Step 7**: Added an inline comment on `upstreamCache` documenting that all keys are sourced from a fixed string-literal allow-list (`'openrouter-status'`, `'openrouter-models'`, `'groq-models'`, `'gemini-models'`) — never from request input — so the map cardinality is bounded and the 5-minute sweep timer only handles TTL, not size eviction.

### Panel (`src/components/dev-kit/AIProviderPanel.tsx`)
- **Step 4**: Header "Refresh all" button is throttled to one fan-out per **3 seconds** (ref-based timestamp guard). The disabled-state interlock catches the in-progress case; this catches rapid sequential clicks just after the previous fan-out completes. Silent rejection — no toast spam.
- **Step 5**: `RecentActivitySection.fetchEntries` now creates a per-call `AbortController` (stored in `abortRef`), aborts any prior in-flight request before issuing a new one, and aborts on unmount. Switched from `fetchWithTokenDedup` to `fetchWithToken` for this section — the dedup helper coalesces successive filter URLs into a single shared `Response` that ignores per-call signals; switching back avoids that conflict. AbortError is treated as expected and not surfaced as a UI error.
- **Step 6**: Tightened `fetchWithTokenDedup` — removed the 250ms post-settle hold so legitimate user-driven re-fetches (filter changes, "Refresh", retries after failure) no longer see a stale shared `Response` for up to a quarter-second. Concurrent in-flight callers are still coalesced.

### Deployment dashboard (`src/components/dev-kit/DeploymentPanel.tsx`)
- Extended the Analytics Retention Sweep card with an "Admin audit log" row showing rows-deleted-in-last-run and the configured retention window. `SweepResult` and `SweepStatus.config` types updated to mirror the server interface (with `?` for forward-compatibility against older sweep payloads).

### Tests (`src/components/dev-kit/__tests__/AIProviderPanel.test.tsx`)
- Added two new tests: (1) "throttles back-to-back Refresh-all clicks within the 3s window" — asserts `openrouter-status` is fetched exactly once across two rapid clicks; (2) "aborts the prior audit-recent fetch when a filter changes" — asserts an `AbortError` is observed on the original audit-recent request after a filter chip click.
- Updated the prior "surfaces a toast" test: replaced its `setTimeout(300)` workaround (waiting for the old 250ms dedup hold) with a microtask flush, since the dedup window is gone.
- Hardened the existing "renders the header" and "clears the previous tab's OK banner" tests — provider names now appear twice (tab + audit-filter chip), so they use `getAllByRole` and pick the tab match by index. (These two pre-dated Task #10 but were already failing on `main`; they are now green.)

All 6 tests in the file pass.

### Atlas / replit.md
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md` — `audit-recent` row updated to mention the new `(at DESC, id DESC)` index; "AI Provider" panel row updated to mention the 3s throttle, abort-on-filter-change, fire-and-forget audits, tightened dedup, and `admin_audit_log` retention sweep. Last verified bumped.
- `replit.md` — analytics sweep entry updated with `admin_audit_log` and the new `ADMIN_AUDIT_LOG_RETENTION_DAYS` env var.

## 2026-04-18 — Filter, search & paginate the AI Provider activity log (Task #5)

Extends the **Recent activity** section in the AI Provider DevKit tab from a static "last 50 rows" view to a server-side filterable, cursor-paginated audit surface so admins can investigate "who switched X yesterday" or "only failed Gemini tests" without scanning the table client-side.

### Server (`server/index.ts`)
- `GET /api/admin/ai-provider/audit-recent` now accepts query params: `provider` (validated against `{openrouter, groq, gemini, ollama, wiseresume-sub}` — filters on `payload->>'provider'`), `action` (validated against `{model-switch, provider-test}`), `okOnly=failed` (forces `action='provider-test'` and `(payload->>'ok')::boolean IS NOT TRUE`), `actorEmail` (case-insensitive `ILIKE %…%`), `before` (`${at_iso}|${id}` cursor; uses composite `(at, id) < (…)::timestamptz/uuid` so ties on identical timestamps don't get skipped or duplicated), and `limit` (1–100, default 50).
- Switched from the neon tagged-template to `sql.query(text, params)` so the WHERE clause can be composed dynamically with `$1..$N` placeholders without losing parameterisation. All user-controlled values are pushed through `push()` and never interpolated as raw SQL.
- ORDER changed to `at DESC, id DESC` to match the cursor predicate. Returns `{ entries, nextCursor }` where `nextCursor` is non-null only when the page filled (i.e. more rows likely exist). Indexes already covered by `idx_admin_audit_log_action_at` / `idx_admin_audit_log_actor_at` (Task #3).

### Panel (`src/components/dev-kit/AIProviderPanel.tsx`)
- `RecentActivitySection` rebuilt to drive the new endpoint. Adds: provider filter chips (All / OpenRouter / Groq / Gemini / Ollama / wiseresume-sub), action chips (All / Switch / Test), a "Failed tests only" checkbox, a debounced (300ms) actor-email search input, and a "Load more" button keyed to the server's `nextCursor`. A "Clear filters" link appears whenever any filter is active.
- Filter changes reset the list and refetch from the top via `useEffect([fetchEntries])`; the "Refresh all" header button re-registers and re-runs `fetchEntries` so the filtered view reloads alongside the rest of the panel (preserves Task #1 F8/U3 behaviour).
- Empty/end states updated: shows "No entries match the current filters" when filtered to zero rows, and "End of activity log" once `nextCursor` is null. Header counter shows `(N+ · filtered)` when more pages exist or filters are active.
- Added `AuditProviderFilter` / `AuditActionFilter` types, `AUDIT_PROVIDER_OPTIONS` / `AUDIT_ACTION_OPTIONS` constants, and `AUDIT_PAGE_SIZE = 50`. Extended `AuditResponse` with `nextCursor`.

### Atlas
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md` — `/api/admin/ai-provider/audit-recent` row updated to document the new query params, response shape, and ordering.
- `Project Atlas/04-For You (Plain Language)/current-features.md` — plain-language entry added, `Last verified` bumped.

No DB migration required — uses existing `admin_audit_log` columns and indexes from Task #3.

## 2026-04-18 — Remove legacy DevKit password fallback from `ai-test` (Task #2)

Follow-up to Task #1 / S4. Now that the AI Provider Panel has been live with the unified Supabase Bearer JWT + `ADMIN_EMAILS` admin check, the temporary DevKit HMAC password fallback in `supabase/functions/ai-test/index.ts` is removed so there is exactly one way to authenticate admin engine-diagnostic calls.

### Edge function (`supabase/functions/ai-test/index.ts`)
- Deleted the `verifyDevKitSessionToken` helper and the `DEV_KIT_PASSWORD` / `adminPassword` branch from the body parser. Admin sub-provider override (`wiseresumeSubProvider`) is now gated solely on `isJwtAdmin(req)`.
- **Requires `bash scripts/deploy-functions.sh` to take effect.**

### Panel (`src/components/dev-kit/AIProviderPanel.tsx`)
- OpenRouter and Groq engine test calls no longer send `adminPassword` in the body — the Supabase Bearer JWT (already attached by `edgeFunctions.functions.invoke`) is the only credential.

### DevKit runner (`src/components/dev-kit/DevKitRunner.tsx`)
- The `Engine · OpenRouter` and `Engine · Groq` runner tests also stop sending `adminPassword`, and the now-unused `getDevKitToken()` helper / local `adminPassword` const are removed.

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
