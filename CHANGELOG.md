## 2026-05-08 — Appwrite migration Batch 7 — final in-scope files (Task #2)

**Files migrated — all remaining Supabase throw-stubs replaced with live Appwrite Web SDK calls:**

- `src/pages/NotificationsPage.tsx`: removed `supabase` import; replaced Supabase Realtime channel (`supabase.channel(...).on(...)`) with `client.subscribe('databases.main.collections.notifications.documents', callback)` from `@/lib/appwrite`. Returns the Appwrite unsubscribe function in useEffect cleanup.
- `src/components/editor/TailorSheet.tsx` (two sites):
  - Background score comparison: `supabase.functions.invoke('score-resume', ...)` × 2 replaced with `edgeFunctions.invoke<{ overallScore?: number }>('score-resume', ...)` from `@/lib/edgeFunctions`. Return type explicit; no `any`.
  - `handleApplyChanges`: `supabase.from('resumes').insert(...)` replaced with `databases.createDocument(DATABASE_ID, COLLECTIONS.resumes, ID.unique(), { ... })`. Fields serialised as JSON strings. `newResume?.id` → `newDoc.$id`. Added `databases`, `DATABASE_ID`, `ID` from `@/lib/appwrite` and `COLLECTIONS` from `@/lib/appwrite-collections`.
- `src/pages/OnboardingPage.tsx`: removed `import { getUserId }` and `import { edgeFunctions } from '@/integrations/supabase/edgeFunctions'`; replaced with `edgeFunctions` from `@/lib/edgeFunctions`. `handleSkip` migrated from `apiFetch('/api/data/profile', PATCH)` to `databases.listDocuments + updateDocument` on the `profiles` collection. `getUserId() || user?.id` reduced to `user?.id`.
- `src/pages/PreviewPage.tsx` (`handleUploadPhoto`): removed `supabase` import; replaced `supabase.storage.from('avatars').upload(...)` + `getPublicUrl(...)` with `storage.createFile(BUCKETS.avatars, ID.unique(), file)` + `storage.getFileView(...).href` from `@/lib/appwrite`. Added `storage`, `ID`, `BUCKETS`.
- `src/components/settings/EditProfileSheet.tsx` (`handleCroppedImage` + `handleRemoveAvatar`): removed `supabase` import; replaced Supabase Storage calls with Appwrite Storage — stable `fileId = userId.replace(...)` for deterministic avatar overwrites; `storage.deleteFile` (ignore 404) then `storage.createFile`; `storage.getFileView(...).href` for public URL; `?t=Date.now()` cache-bust. Added `storage`, `ID`, `BUCKETS`.
- `src/pages/SettingsPage.tsx` (`onTakeTour` reset): removed dynamic `apiFetch` import; replaced with `databases.listDocuments + updateDocument` to set `onboarding_completed: false` on the user's profile document. Added static `databases`, `DATABASE_ID`, `Query`, `COLLECTIONS` imports.
- `src/components/dashboard/CreateResumeDialog.tsx` (all four handlers + `handleDuplicate`):
  - Removed `supabase`, `getUserId`, supabase `edgeFunctions`, `Json` imports. Added `databases`, `DATABASE_ID`, `ID` from `@/lib/appwrite`; `COLLECTIONS`; `edgeFunctions` from `@/lib/edgeFunctions`.
  - `handleStartBlank`: `supabase.from('resumes').update(...)` → `databases.updateDocument(...)` (customization only; `target_job_title` not in Appwrite schema). Store setup via `dbToResumeData(newResume)`.
  - `handleDuplicate`: store setup via `dbToResumeData(dupDoc)` replacing manual field spread.
  - `handleCreateTailored`: dropped `getUserId()` guard; `existingResumes.find(r => r.id)` → `r.$id`; supabase insert replaced with `databases.createDocument`; fields passed as-is (already JSON strings in Appwrite); `template` not `template_id`; store setup via `dbToResumeData`.
  - `handlePasteCreate`: `edgeFunctions.functions.invoke` → `edgeFunctions.invoke`; store setup via `dbToResumeData`.
  - `handleCreateTrial`: dropped `getUserId()` guard and `bridgedUserId`; removed `is_trial`/`trial_expires_at`/`is_primary`/`template_id` (not in Appwrite schema); supabase insert → `databases.createDocument`; `newResume.id` → `newResume.$id`.
- `src/components/dashboard/SetTargetJobSheet.tsx`:
  - Removed `supabase`, `Json` imports. Added `databases`, `DATABASE_ID`, `ID`, `COLLECTIONS`.
  - `handleAnalyze` background save: `supabase.from('resumes').update(...).eq('id', resume.id)` → `databases.updateDocument(DATABASE_ID, COLLECTIONS.resumes, resume.$id, { target_job_title, target_company, job_match_score })`.
  - `handleTailor` resume creation: supabase insert → `databases.createDocument`; `contact_info` passed directly (already JSON string); experience/education/skills arrays from tailor result serialised with `JSON.stringify`; `template` not `template_id`; `parent_resume_id`/`target_job_title`/etc. omitted (not in Appwrite schema).
- `src/pages/TailorPage.tsx`:
  - Removed `supabase`, `getSupabaseToken`, `Json` imports. Added `databases`, `DATABASE_ID`, `ID`, `COLLECTIONS`, `getAppwriteJWT`.
  - Three `getSupabaseToken()` → `getAppwriteJWT()` callsites (pre-validate, fix-suggestions, validate-tailor fetches).
  - `handleApplyChanges`: supabase insert → `databases.createDocument`; all fields JSON-serialised; `template` not `template_id`; `parent_resume_id`/`target_job_title`/etc. omitted; `newResume?.id` → `newDoc.$id`.

**Post-review fix (same session):**

- `src/pages/OnboardingPage.tsx` (redirect/reconciliation effect, lines ~174–188): replaced the remaining `apiFetch('/api/data/profile')` dynamic import with `databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [Query.equal('user_id', userId), Query.select(['$id', 'onboarding_completed']), Query.limit(1)])`. Profile doc typed inline as `{ $id: string; onboarding_completed?: boolean }`. Behaviour is identical: if `onboarding_completed` is true, sets localStorage flag and redirects to `/dashboard`. No `apiFetch` calls remain in `OnboardingPage.tsx`.

**Additional fixes (same session):**

- `src/lib/appwrite-collections.ts`: `BUCKETS = { avatars: 'avatars' }` added with provisioning note for Appwrite Console.
- `src/hooks/useResumes.ts` (`DatabaseResume` interface): added optional legacy attributes `is_trial`, `is_primary`, `template_id`, `target_job_title`, `target_company`, `parent_resume_id`, `job_match_score`, `job_url` so call sites that still reference these fields compile without `any`.
- `src/lib/planConfig.ts`: removed broken `import creditLimitsJson from '../../supabase/functions/_shared/creditLimits.json'` (supabase dir deleted); replaced with hardcoded constants `free: 5`, `pro: 50`, `premium: Infinity`. Updated comment documenting why.

**TypeScript:** `tsc --noEmit` passes with zero errors.
**Build:** `vite build --mode development` succeeds with zero errors (chunk-size warnings only — pre-existing).

---

## 2026-05-08 — Appwrite migration Batch 6 (Task #2)

**Files migrated — all Supabase throw-stubs replaced with live Appwrite Web SDK calls:**

- `src/lib/sendFeedback.ts`: removed `supabase.functions.invoke` / `edgeFunctions` from supabase stub; both email channels (`send-contact-email`, `submit-contact-request`) now route through `edgeFunctions` from `@/lib/edgeFunctions`. Sentry channel unchanged. `useDirectSupabase` option kept for call-site compat (now a no-op).
- `src/lib/dataExport.ts`: `importResumes()` rewritten — per-resume Appwrite upsert (getDocument 404 → createDocument, else updateDocument). `deleteAllUserData()` rewritten — paginated `listDocuments` + `deleteDocument` loop across all user-owned collections.
- `src/lib/onboardingProfile.ts`: `saveOnboardingProfile()` migrated — profile upsert via `listDocuments` + update/create, resume insert via `createDocument`, completion flag via `updateDocument`. `reconcileOnboardingCompletion()` migrated similarly. `probeLinkedInUrl()` swapped `getSupabaseToken()` → `getAppwriteJWT()`. Removed `supabase`, `getUserId`, `Json` imports.
- `src/lib/shareUtils.ts`: cosmetic cleanup — was already Appwrite-native from Batch 5; removed stale comment.
- `src/components/layout/BroadcastBanner.tsx`: replaced `supabase.from('broadcasts').select(...).eq('active', true)` with `databases.listDocuments(DATABASE_ID, COLLECTIONS.broadcasts, [Query.equal('active', true)])`.
- `src/components/ai/CreditUsageSheet.tsx`: replaced `supabase.from('ai_usage_logs').select(...).eq(...).gte(...).order(...).limit(50)` with Appwrite `databases.listDocuments`. Removed `Json` import from supabase types.
- `src/components/BugReportDialog.tsx`: removed `import { getUserId } from '@/lib/supabaseBridge'`; replaced `getUserId()` with `user?.id` from the already-imported `useAuth()` hook.
- `src/hooks/useAIEnhance.ts`: replaced `getSupabaseToken()` + `refreshTokenIfNeeded()` retry block with `getAppwriteJWT()`. No retry — 401 surfaces immediately as `AIError`.
- `src/hooks/useATSSuggestions.ts`: same pattern — `getAppwriteJWT()`, removed `refreshTokenIfNeeded` retry.
- `src/hooks/useResumeScore.ts`: replaced `getSupabaseToken()` with `getAppwriteJWT()`; skip guard unchanged.
- `src/hooks/useAgenticChat.ts` (907 lines, surgical edits): replaced all 5 supabase call sites:
  - Session load on mount: `supabase.from('chat_sessions')` → `databases.listDocuments` + `databases.listDocuments('chat_messages')`.
  - `loadSession()`: same migration.
  - `createSession()`: `supabase.from('chat_sessions').insert()` → `databases.createDocument`.
  - `persistMessage()`: `supabase.from('chat_messages').insert()` + session `updated_at` touch → single `databases.createDocument` (Appwrite auto-bumps `$updatedAt`). `function_call` serialised as JSON string.
  - Import swapped: `supabase from safeClient` → `databases, DATABASE_ID, Query, ID from appwrite` + `COLLECTIONS`.

**TypeScript:** `tsc --noEmit` passes with zero errors after all changes.

**Follow-up fixes (code review):**

- `src/hooks/useAgenticChat.ts` — `persistMessage` now explicitly calls `databases.updateDocument(chat_sessions, sessionId, { updated_at })` after creating the message. Appwrite only bumps `$updatedAt` on the document that was written; writing to `chat_messages` does NOT cascade to `chat_sessions`, so session recency ordering was stale without this touch.
- `src/hooks/useResumeShares.ts` — `usePublicResume` password gate migrated from client-side plaintext comparison to server-side validation via `edgeFunctions.invoke('verify-share-password', { body: { token, password } })`. The stored `password` value is no longer compared in client code. `Query.select` restricts the public `listDocuments` call to non-sensitive fields. A `PublicShareDoc` interface and `docToPublicShare` helper separate the public-access shape from the owner `ResumeShare` type. The `verify-share-password` Appwrite Function is a pending build item; until built, password-protected shares will return `requires_password: true` (safe degradation).
- `src/hooks/useResumeVersions.ts` — **fully migrated to live Appwrite SDK**. `resume_versions` collection provisioned in Appwrite `main` DB (2026-05-08) with attributes `resume_id`, `user_id`, `version_number`, `snapshot` (JSON string, 100 000 chars), `change_summary`; indexes on `resume_id` and `user_id`. `useResumeVersions` → `listDocuments` filtered by `resume_id` + `user_id`, ordered by `version_number` desc. `saveVersion` → `listDocuments` to find current max `version_number`, then `createDocument`. `deleteVersion` → `deleteDocument`. `snapshot: ResumeData` serialised/deserialised as JSON string.
- `src/hooks/useResumeSnapshots.ts` — **fully migrated to live Appwrite SDK**. `resume_snapshots` collection provisioned in Appwrite `main` DB (2026-05-08) with attributes `user_id`, `resume_id`, `name`, `resume_json` (JSON string, 100 000 chars), `ats_score`; indexes on `user_id` and `resume_id`. `useResumeSnapshots` → `listDocuments` by `user_id` (+ optional `resume_id` filter). `useSaveResumeSnapshot` → `createDocument`. `useDeleteResumeSnapshot` → `deleteDocument`. `resume_json` serialised/deserialised as JSON string.
- `src/lib/appwrite-collections.ts` — added `resume_versions` and `resume_snapshots` entries; removed stale "not yet created" comment for these two; updated note for `resume_skills` (still absent).
- `src/hooks/useResumeShares.ts` (follow-up fixes) — removed `'password'` from `Query.select` entirely; public lookup requests only safe fields. Password gate relies on `has_password` boolean (server-side source of truth) + `edgeFunctions.invoke('verify-share-password')`. `createShare` now writes `has_password: !!input.password` alongside `password`. `updateShare` keeps `has_password` in sync whenever `password` changes. `has_password` boolean attribute provisioned in Appwrite `resume_shares` collection via server SDK (2026-05-08).
- `src/hooks/useAgenticChat.ts` (second review fix) — added `Query.equal('user_id', user.id)` to the session bootstrap `listDocuments` call. `loadSession` now fetches the session document first (`getDocument`) and checks `sessionDoc.user_id === user.id` before loading messages, preventing IDOR. Dependency array updated to `[user]`.
- `src/hooks/useInterviewHistory.ts` (second review fix) — added `parseJsonField<T>` helper that safely JSON-parses string fields with a typed fallback. `docToRecord` now calls `parseJsonField` for `messages` (fallback `null`), `strengths` (fallback `[]`), and `improvements` (fallback `[]`). Previously these were returned as raw strings because `useSaveInterviewSession` / `useUpsertInterviewDraft` serialise them via `JSON.stringify` — consumers expecting arrays would silently receive strings.
- `src/hooks/useShareComments.ts` (third review fix) — both public `resume_shares` token lookups (`usePublicShareComments` and `useAddShareComment`) now use `Query.select(['$id'])` so only the document ID is returned; no sensitive fields (password, user_id, has_password, etc.) are included in the response.
- `src/lib/dataExport.ts` (third review fix) — removed unused `filter` parameter and unreachable `void filter;` line from `listAllIds`; added `Query.select(['$id'])` to minimise payload. `deleteAllUserData` expanded to cover chat_sessions/chat_messages cascade, plus previously missing user-owned collections: `user_preferences`, `push_subscriptions`, `device_push_tokens`, `portfolio_settings`, `portfolio_history`, `portfolio_visits`, `portfolio_interactions`, `company_briefings`, `tool_cache`, `user_gamification`, `usage_events`, `resume_versions`, `resume_snapshots`, `linkedin_import_quota`.

## 2026-05-08 — Appwrite MCP server + secrets setup (Task #1)

**Secrets / env vars:**
- `APPWRITE_API_KEY` added to Replit secrets (used by server-side scripts and MCP server).
- Confirmed zero `SUPABASE_*` or `KINDE_*` keys remain in Replit secrets or shared env vars.

**Python 3.12 module:**
- Installed `python-3.12` Replit module (replaces Python 3.11 as default interpreter).
- `uvx mcp-server-appwrite` (v0.4.1) now installs and runs successfully — verified via JSON-RPC initialize handshake.

**Collections verified from live API:**
- Enumerated **96 collections** in the `main` Appwrite database using `node-appwrite` + `APPWRITE_API_KEY`.
- Live count is 96, not 99 (previous estimate was approximate). Zero storage buckets exist yet.

**New file — `src/lib/appwrite-collections.ts`:**
- Exports typed `COLLECTIONS` const object: every collection ID mapped to its string literal, grouped by domain (Admin, AI, Auth, Career, Chat, Portfolio, Resumes, WiseHire, etc.).
- Exports `DATABASE_ID = 'main'` and empty `BUCKETS` const (no buckets exist yet).
- Exports `CollectionId` union type.
- TypeScript strict-mode check passes (`tsc --noEmit` zero errors).
- This file is the single import source for all database operations in tasks #2 and #3.

## 2026-05-08 — Scorched-earth removal of Supabase + Kinde from web app

**Web-app code removed:**
- Top-level `supabase/` directory deleted (84 edge functions, all migrations, `config.toml`, `_shared/` helper layer).
- npm packages uninstalled: `@supabase/supabase-js`, `@kinde-oss/kinde-auth-react`.
- Legacy scripts removed: `scripts/check-supabase-migration-drift.mjs`, `scripts/check-edge-functions-deployed.mjs`, `scripts/smoke-test-edge-functions.mjs`, `scripts/edge-fn-monthly-reaudit.mjs`, `scripts/edge-fn-drift-allowlist.json`, `scripts/deploy-functions.sh`, `scripts/refresh-devkit-secrets.sh`, `scripts/probe-webhooks-signed.mjs`, `scripts/preview-waitlist-emails.mjs`, `scripts/kinde-brand-console.js`, `scripts/apply-kinde-branding.mjs`. Stale build artifact `idx.js` deleted. Obsolete tests removed: `src/test/mocks/supabase.ts`, `src/integrations/supabase/safeClient.test.ts`, `src/contexts/__tests__/AuthContext.impersonation.test.tsx`, `src/pages/__tests__/Pages-D5.test.tsx`.
- `package.json` scripts removed: `db:check-drift`, `check:functions:deployed`, `smoke:functions`, `preview:emails`. Bumped to `4.1.0-Appwrite-Native`.
- Replit env vars deleted from `[userenv.shared]`: `VITE_KINDE_CLIENT_ID`, `VITE_KINDE_DOMAIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- `vite.config.ts`: dropped `@supabase` and `@kinde-oss` from `manualChunks`, replaced with `appwrite` chunk; CSP `connect-src` purged of `*.supabase.co`, `*.supabase.in`, `wss://*.supabase.co`, `*.kinde.com`, `auth.thewise.cloud`.

**Web-app code converted to throw-stubs (filename preserved so 130+ legacy importers still compile, but contents have ZERO Supabase / Kinde dependency):**
- `src/lib/supabaseBridge.ts` — every export (`exchangeToken`, `refreshTokenIfNeeded`, `getToken`, `getUserId`, `isReady`, `clearBridge`, `getShadowUserOk`, `getLastError`, `clearLastError`, `setUserProfile`, `getStoredEmail`, `getStoredName`, `setKindeTokenGetter`, `setCurrentKindeSub`, `getCachedKindeSub`, `BridgeErrorType`) is a no-op shim returning `null`/`false`/`void`.
- `src/lib/supabaseAuth.ts` — `getSupabaseToken()`, `getAuthUserId()` return `null`.
- `src/lib/supabaseConstants.ts` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EDGE_FUNCTIONS_URL`, `EDGE_FUNCTIONS_ANON_KEY` all empty strings.
- `src/lib/apiFnUrl.ts` — returns sentinel path `/__pending_appwrite_migration__/<fn>` that fails fast on fetch.
- `src/lib/apiFetch.ts` — `apiFetch()` throws `ApiFetchError(503, 'Pending Appwrite migration: <path>')` on every call. Type signatures preserved.
- `src/integrations/supabase/safeClient.ts` — `supabase` is a recursive `Proxy` that throws `[supabase stub] Supabase client removed — pending Appwrite migration` on any property access or call.
- `src/integrations/supabase/edgeFunctions.ts` — `edgeFunctions.invoke(fn)` now ONLY routes the AI-Hub set (24 names in `appwrite-bridge.ts` `AI_HUB_FUNCTIONS`) through `invokeAppwriteHub()`. Anything outside that set returns `{ data: null, error: { message: '… Pending Appwrite migration', code: 'pending_appwrite_migration' } }` instead of falling back to Supabase.
- `src/integrations/supabase/sessionExpired.ts` — `dispatchSessionExpiredOnce()` is a no-op (Appwrite session lifecycle replaces it).
- `src/integrations/supabase/types.ts` — `Database` and `Json` exported as `any` placeholder so any leftover `import type { Database }` still compiles.

**Server rewrite:**
- `server/index.ts` collapsed from 5 577 lines to ~80. Removed every Supabase REST helper (`supabaseGet/Upsert/Insert/Patch/Delete/Rpc/AuthAdmin`), every Kinde helper (`kindeSubToUserId`, `getKindeM2MToken`, `getKindeJWKS`, `validateSupabaseToken`, `requireAuthHeader`), all `/api/fn/*`, `/api/data/*`, `/api/auth/*`, `/api/devkit/*`, `/api/track-handle-interest`, `/api/fetch-url`, `/api/ai-health`, `/api/db-health` endpoints, and the Sentry+JOSE+JWT bootstrap chain. Kept: Sentry init, CORS, body parsing, `GET /api/health`, `POST /api/export/pdf-native` (returns `503 pending_appwrite_migration` until the Puppeteer worker is rebuilt as an Appwrite Function), and a catch-all `/api/*` that returns `503 pending_appwrite_migration`.

**Frontend type fix-ups (Kinde → Appwrite naming):**
- `src/hooks/useEditorAutosave.ts` — `KindeAppUser` import renamed to `AppUser`.
- `src/hooks/useEditorHydration.ts` — `KindeAppUser` import renamed to `AppUser`.
- `src/hooks/useGuestMigration.ts` — replaced `import type { Session } from '@supabase/supabase-js'` with a local minimal `type Session = { user?: { id?: string } | null } | null;`.

**Behavioural impact:**
- ✅ Auth (Appwrite `account.get()` / `deleteSession()`) — unchanged, fully working.
- ✅ AI Hub (24 functions in `AI_HUB_FUNCTIONS`) — unchanged, routed through Appwrite `ai-gateway` Function.
- ❌ Every `/api/data/*` data-layer call (resumes, profile, jobs, notifications, portfolios, hr-analytics, share, etc.) now throws `ApiFetchError(503)` at runtime. Pending Appwrite-Functions reimplementation.
- ❌ Every non-AI edge-function call (admin-*, wisehire-*, transactional-email, portfolio-public, token-exchange, me, …) now returns `{ error: { code: 'pending_appwrite_migration' } }` from `edgeFunctions.invoke()`. Pending Appwrite-Functions reimplementation.
- ❌ Server-side PDF export returns `503` until the Puppeteer worker is reimplemented on Appwrite.
- ⚠️ Mobile app (`mobile/`) — left untouched per task scope; will be addressed in a separate cycle.

**Why scorched earth instead of incremental:** Atlas claimed `v4.0.0-Appwrite-Native` but the production data layer (`apiFetch.ts` → Supabase PostgREST) and ~60 of 84 edge functions still hit Supabase, while AuthContext had stopped feeding the bridge any Kinde token, leaving the app in a half-broken state masquerading as migrated. Removing all Supabase/Kinde code surfaces those broken paths with explicit `pending_appwrite_migration` errors so the rebuild work can be tracked, instead of empty data hiding behind silent fail-opens.

**Verified:** dev workflow (`npm run server:dev & npm run dev`) starts cleanly. Vite re-optimises deps, Express minimal server boots on `:5001`, Vite on `:5000`. Landing page renders, Appwrite client logs `Status: CONNECTED ✅`, the only console error is the expected `401` on `account.get()` for an unauthenticated visitor.

---

## 2026-05-08 — Project Atlas: full coverage of previously-undocumented surfaces

**Files added (Project Atlas):**
- `01-Currently Implemented/database-tables/` — 32 new reference cards: `admin_sessions`, `ai_key_migration_audit`, `ai_provider_breaker`, `ai_routing_config`, `analytics_sweep_lock`, `blocklist`, `broadcasts`, `company_briefings`, `device_push_tokens`, `edge_function_logs`, `email_verification_tokens`, `error_log`, `feature_flags`, `impersonation_revocations`, `interview_answers`, `interview_attempts`, `interview_question_bank`, `interview_report_tokens`, `kinde_events`, `linkedin_import_quota`, `mobile_app_versions`, `moderation_queue`, `ops_health_events`, `portfolio_exclusive_assignments`, `portfolio_interactions`, `portfolio_premium_usernames`, `portfolio_reserved_usernames`, `portfolio_username_rules`, `portfolio_user_overrides`, `resume_snapshots`, `signup_otps`, `visitor_events`. Each card cites the migration file, owner, columns, and hard rules drawn from `replit.md`.
- `01-Currently Implemented/frontend-layer/contexts.md` — covers `src/contexts/` (plural) `AuthContext` + `DevKitSessionContext` and `src/context/` (singular) `BottomSheetContext` + `KeyboardContext`, including the directory-name distinction.
- `01-Currently Implemented/frontend-layer/types.md` — catalogs `src/types/` (`resume.ts`, `resumeExamples.ts`, `aiStudio.ts`, `companyBriefing.ts`).
- `01-Currently Implemented/frontend-layer/integrations-supabase.md` — covers `safeClient.ts`, `edgeFunctions.ts`, `sessionExpired.ts`, `transactionalEmailFlag.ts`, `resumeSectionAiFlag.ts`, `types.ts`, plus the `safeClient.test.ts` spec.
- `01-Currently Implemented/frontend-layer/test-setup.md` — covers `src/test/` (Vitest setup) and `src/shims/pako.ts`.
- `01-Currently Implemented/backend-layer/` (new dir) — `README.md`, `express-server.md` (server/index.ts 5 576 lines + db.ts + schema.ts), `edge-shared-helpers.md` (36 modules in `supabase/functions/_shared/`), `cloudflare-pages-middleware.md` (`functions/_middleware.ts`).
- `01-Currently Implemented/repo/` (new dir) — `README.md`, `project-governance.md`, `routing-ai-providers.md`, `specs.md`, `docs.md`, `reports.md`, `scripts.md`, `tests.md`, `wise-templates.md`.
- `01-Currently Implemented/public-surfaces/` (new dir) — `README.md`, `well-known.md` (MCP server card, agent skills, OAuth/OIDC discovery, universal links), `data-and-docs.md`.
- `01-Currently Implemented/critical-systems/14-mcp-and-agent-skills.md` — discovery surface + skill manifest contract.
- `01-Currently Implemented/critical-systems/15-cron-jobs.md` — scheduled fns + `requireCronSecretOrVault` contract.
- `01-Currently Implemented/critical-systems/16-feature-flags-and-kill-switches.md` — server-side `feature_flags` resolver + frontend `*Flag.ts` rollout shims.
- `01-Currently Implemented/critical-systems/17-ops-health-and-error-streams.md` — three-stream model: `ops_health_events`, `edge_function_logs`, `error_log`, with `scrubSecrets` contract.
- `01-Currently Implemented/critical-systems/18-impersonation.md` — full flow incl. `impersonation_revocations` kill list.

**Files updated (Project Atlas):**
- `01-Currently Implemented/README.md` — added `backend-layer/`, `repo/`, `public-surfaces/` subdirs; added critical-systems #14–#18; corrected #13 to `13-mobile-expo.md`.
- `01-Currently Implemented/critical-systems/README.md` — created (was missing); indexes all critical-system cards.
- `01-Currently Implemented/database-tables/README.md` — appended "Newly carded (2026-05-08 reconciliation)" section linking the 32 new cards; clarified that `kill_switches` is the `kill_switch_function` column on `feature_flags`, not a separate table.
- `01-Currently Implemented/frontend-layer/README.md` — added See-also links for `contexts.md`, `types.md`, `integrations-supabase.md`, `test-setup.md`.
- `01-Currently Implemented/frontend-layer/components.md` — full rewrite: removed the stale `pwa/` reference (PWA was removed — see `docs/ops/pwa-removal-verification.md`), added 12 missing nested subfolders (`cover-letter/templates/`, `dev-kit/analytics/`, `editor/{ai,export,tailor}/`, `landing/wisehire/`, `portfolio/{editor,public,qr}/`, `settings/sections/`, `templates/shared/`, all 9 nested folders under `wisehire/`), added `__tests__/` enumeration and top-level component files. Restated PDF-capture `<img>` rules and account-type isolation rules.

**Behavioral impact:** documentation only. Zero runtime change. No DB migrations, no edge-function changes, no frontend code changes.

**Why:** the deployed system had drifted significantly from Atlas: ~33 production tables had no card, the entire `_shared/` helper layer (36 modules) was absent from Atlas, the `src/contexts/`/`src/context/` split was undocumented (and contained an architectural smell — two near-identical directory names), the `server/` Express bridge had no card despite handling all DevKit admin traffic, the agent-facing surface (`public/.well-known/mcp/`, `agent-skills/`, OAuth/OIDC discovery) was entirely missing from Atlas, and 5 cross-cutting systems (MCP, cron, feature flags + kill switches, ops health, impersonation) had no critical-system card.

# Changelog

## 2026-05-08 — Project Atlas: comprehensive reconciliation against deployed code

**Files changed:**
- `Project Atlas/01-Currently Implemented/edge-functions/` — deleted 41 stale `.md` files (pre-consolidation per-fn cards) and added 19 new reference cards for the consolidated routers and previously-undocumented functions
- `Project Atlas/01-Currently Implemented/edge-functions/README.md` — full rewrite to reflect the actual 82 deployed functions (post Tasks #49–#56), grouped by domain
- `Project Atlas/01-Currently Implemented/pages/actas.md` — new card for `ActAs.tsx` (`/act-as` impersonation landing, mounted at App-level before the auth gate)
- `Project Atlas/01-Currently Implemented/pages/README.md` — added ActAs row, updated source counts (78 files), unified `Last verified` header
- `Project Atlas/01-Currently Implemented/frontend-layer/hooks.md` — added missing entries (`useAIApplyEffects`, `useExpandedEntryRestore`, `useFitToPages`, `useOnePageExport`, `useSuspensionCheck`, `useTilt`, `useScrollFade`, `useTypewriter`, `useUndoRedo`, `useUnsavedChangesGuard`, `useThemeLogo`, `useStatusBar`, `useShakeDetect`, `useShareComments`, `useResumeShares`, `useResumeSnapshots`, `useResumeVersions`, `useTierGate`, `useVisitorTracking`, `useVoiceInterview`, `useWebMcp`, `useWebSpeechFallback`, `useEditorSheets`) and full table for the 21 `src/hooks/wisehire/` hooks
- `Project Atlas/01-Currently Implemented/frontend-layer/stores.md` — added `aiEnhancingStore` and `sectionAIBridge` entries (previously undocumented)
- `Project Atlas/01-Currently Implemented/frontend-layer/lib.md` — full rewrite covering all 90+ root files plus the 6 subfolders (`ai/`, `pdf/`, `smartFit/`, `devkit/`, `wisehire/`, `__tests__/`); added missing entries (`apiFnUrl`, `apiFetch`, `applyAIResult`, `tailorMerge`, `editorSession`, `editorLogger`, `latexGenerator`, `nativePdfGenerator`, `templateMigration`, `educationFormat`, `emptyStateExamples`, `impersonationStore`, `sendFeedback`, `sanitizeFileName`, `detectFileType`, `captureErrorShim`, `activityTracker`, `visitorTrack`, `persistedQueryCache`, `usePrefersReducedMotion`)
- `Project Atlas/01-Currently Implemented/critical-systems/13-mobile-expo.md` — refreshed with the post-consolidation backend (mobile traffic now flows through `mobile-api` consolidated router instead of 6 separate fns), explicit file inventory of 26 Expo Router routes + 20 source files
- `Project Atlas/01-Currently Implemented/database-tables/migration-ledger.md` — new ledger of all 228 migrations with the descriptive slugs from the recent ~38 enumerated, plus filename convention rules

**Behavioral impact:** documentation only; no runtime change.

**Why:** the Atlas had drifted significantly from the deployed code. 21 stale per-fn cards documented edge functions that had been merged into routers (`admin-config`, `admin-user-ops`, `admin-wisehire`, `coupons`, `editor-ai`, `resume-section-ai`, `portfolio-public`, `transactional-email`, `wisehire-access`, `mobile-api`); 19 active edge functions had no Atlas card at all (`admin-config`, `admin-user-ops`, `admin-wisehire`, `coupons`, `editor-ai`, `export-portfolio-pdf`, `export-resume-pdf`, `fetch-url`, `mobile-api`, `mobile-config`, `portfolio-public`, `resume-section-ai`, `revenuecat-webhook`, `send-password-reset`, `send-push`, `transactional-email`, `validate-tailor`, `verify-email`, `wisehire-access`); the `ActAs` page, `aiEnhancingStore`, `sectionAIBridge`, the entire `src/hooks/wisehire/` subdir (21 hooks), and ~25 entries in `src/lib/` were missing from their umbrella cards.

---

## 2026-05-07 — DevKit dashboard: admin-devkit-data and admin-onboarding-funnel converted to Supabase proxy

**Files changed:**
- `server/index.ts`

**`app.all('/api/fn/admin-devkit-data')`** (lines 3074–3105)
- Removed hardcoded `actionToRoute` dispatch map (`analytics → admin-analytics`, `mission-control → admin-mission-control`, `github-status → admin-github-status`, `live-activity → admin-live-activity`, `observability → admin-observability`).
- Removed `obs_action → action` rewrite for the observability sub-handler.
- Replaced entire dispatch body with a thin Supabase proxy: validates DevKit session via `requireDevKitAuth`, then `POST`s to `${SUPABASE_URL}/functions/v1/admin-devkit-data` with `apikey` + forwarded `Authorization` header.
- Fixes 400 `Unknown action` errors for `ai-cost` (AICostPanel) and `edge-fn-drift` (MissionControlPanel) — neither was in the old dispatch map.
- Fixes `analytics` response shape mismatch: local `admin-analytics` returned `{ kpis, daily_series }` but `AnalyticsPanel` expects `{ data: PremiumAnalyticsData }` (with `activitySeries`). Supabase function returns the correct shape.
- Fixes silent empty-data failures in `LiveActivityPanel` and `UserDetailDrawer`: local `admin-live-activity` returned `{ events }` but panels use `result.data` (with `[] ` fallback), so data was always empty in dev.
- Returns `503` when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are absent rather than `400 Unknown action`.

**`app.all('/api/fn/admin-onboarding-funnel')`** (lines 2304–2325)
- Replaced local implementation (queried `audit_logs` directly, returned `{ funnel, total_users }`) with Supabase proxy identical in structure to the `admin-devkit-data` handler above.
- Fixes `OnboardingFunnelPanel` "No data returned" error: local handler returned no `data` wrapper; the Supabase `admin-onboarding-funnel` function returns `{ data: FunnelData }` as the panel expects.

---

## 2026-05-07 — iOS PDF upload and export fixes (Promise.withResolvers polyfill + PreviewPage fallback)

**Files changed:**
- `src/lib/pdf/textExtractor.ts` — `Promise.withResolvers` polyfill (main thread) + `buildPolyfillWorkerSrc()` blob wrapper (worker thread)
- `src/pages/PreviewPage.tsx` — `PDFServerUnavailableError` import + handling in `handleExport` catch + `handleSaveToFiles` catch

**Changes:**

**A — iOS PDF upload fix (`textExtractor.ts`)**
- Added `Promise.withResolvers` polyfill at module-init time (main thread). pdfjs-dist v4+ calls this API internally; Safari < 17.4 (iOS ≤ 17.3) does not implement it, causing every `page.getTextContent()` call to throw → `PAGE_ERRORS` on every page for every uploaded PDF.
- Added `buildPolyfillWorkerSrc(rawWorkerUrl)`: creates a classic blob worker URL that injects the same ES5 polyfill via `importScripts()` before the pdfjs IIFE executes in the worker thread. Confirmed: `pdf.worker.min.mjs` has zero top-level `import`/`export` statements (IIFE-compatible) and contains 2 calls to `withResolvers`. Main-thread polyfills do not propagate to worker global scope, so the blob wrapper is required.
- `buildPolyfillWorkerSrc` gracefully falls back to the raw URL if `URL.createObjectURL` is unavailable (SSR / test environment).
- `GlobalWorkerOptions.workerSrc` is now set to the blob wrapper URL on all platforms (no negative impact on non-iOS; worker blob permitted by existing `worker-src 'self' blob:` CSP directive).

**B — iOS PDF export fix (`PreviewPage.tsx`)**
- Imported `PDFServerUnavailableError` from `@/lib/nativePdfGenerator`.
- `handleExport` catch block: added `instanceof PDFServerUnavailableError` check before the generic `PdfGenerationError` path — calls `window.print()` with an informational toast (identical pattern to `EditorPage.tsx` line ~384).
- `handleSaveToFiles` catch block: added the same `instanceof PDFServerUnavailableError` branch before the `'Failed to save'` fallback — calls `window.print()` with a "Save to Files" prompt.
- Root cause: `export-resume-pdf` edge function returns `503 text/html` when `PDF_RENDERER_URL` is not configured → `PDFServerUnavailableError`. `EditorPage.tsx` had a fallback; `PreviewPage.tsx` did not — mobile users who primarily use PreviewPage saw "Failed to save" / "Failed to generate PDF" instead.

## 2026-05-06 — Production routing fixes: PDF export, URL import, job CRUD, handle-interest analytics

**Files changed:**
- `supabase/functions/export-resume-pdf/index.ts` (new)
- `supabase/functions/fetch-url/index.ts` (new)
- `supabase/functions/track-handle-interest/index.ts` (new)
- `supabase/config.toml` — 3 new `[functions.*]` blocks with `verify_jwt = false`
- `src/lib/nativePdfGenerator.ts` — `pdfExportUrl()` helper; both `fetch('/api/export/pdf-native')` calls replaced with `fetch(pdfExportUrl())`
- `src/lib/apiFetch.ts` — `resolveProdRoute()`: replaced hardcoded `{ jobs: [] }` synthetic with real PostgREST routes for `GET /api/data/jobs`, `POST /api/data/jobs`, `GET /api/data/jobs/:id`, `PATCH /api/data/jobs/:id`, `DELETE /api/data/jobs/:id`
- `src/lib/onboardingProfile.ts` — LinkedIn OG-meta fallback uses `apiFnUrl('fetch-url')` in prod
- `src/pages/UploadPage.tsx` — URL import uses `apiFnUrl('fetch-url')` in prod
- `src/pages/PortfolioEditorPage.tsx` — handle-interest ping uses `apiFnUrl('track-handle-interest')` in prod

**Changes:**

**A — `export-resume-pdf` edge function**
- Accepts `POST { html, pageFormat, onePage, fitScale, showPageNumbers, showBranding, customBreakPositions?, totalContentHeightPx? }` with `requireAuth`.
- Forwards payload to `PDF_RENDERER_URL` (same renderer used by `export-portfolio-pdf`). Returns PDF bytes on success.
- If `PDF_RENDERER_URL` is not set, returns `503 text/html` — `nativePdfGenerator.ts` detects this content-type and throws `PDFServerUnavailableError`, which `EditorPage.tsx` catches and falls back to browser print-to-PDF.

**B — `fetch-url` edge function**
- Accepts `POST { url }` with `requireAuth`.
- SSRF protection: private IP hostname check (10.x, 192.168.x, 172.16-31.x, 127.x, localhost, link-local, CGNAT), redirect validation on every hop, max 5 redirects, 10s timeout, 2 MB response cap.
- Returns `{ url, contentType, html }`. Only serves `text/html`, `text/plain`, `application/xhtml` content types.

**C — `track-handle-interest` edge function**
- Accepts `POST` with `requireAuth`. Reads `profiles.handle_type` for the caller. If `handle_type` is `free` or unset, adds their email to the `RESEND_AUDIENCE_HANDLE_INTEREST` Resend audience via the Resend API. Always returns `{ success: true }` — non-fatal.

**D — Job CRUD production routing (`apiFetch.ts`)**
- `GET /api/data/jobs` → `rest/v1/jobs?user_id=eq.{u}&select=*&order=created_at.desc`
- `POST /api/data/jobs` → PostgREST insert with `user_id` injected; returns `{ job: row }`
- `GET /api/data/jobs/:id` → single-row fetch; 404 on empty
- `PATCH /api/data/jobs/:id` → PostgREST PATCH with `return=representation`
- `DELETE /api/data/jobs/:id` → PostgREST DELETE; returns `{ ok: true }`

---

## 2026-05-06 — Task #66: Tailor AI reliability

**Files changed:**
- `supabase/functions/tailor-resume/index.ts`
- `supabase/functions/_shared/scrubSecrets.ts` (import only)
- `src/lib/aiTailor.ts`

**Changes:**

**A — Prompt token-budget guard (`tailor-resume/index.ts`)**
- Added `experienceForPrompt` pre-trim block between `industrySpecificExamples` and `systemPrompt`. When `JSON.stringify(resume.experience).length > 30_000` and the resume has >3 jobs, achievements on experience entries beyond the 3 most recent are capped to 2 bullets each. Logs: `[tailor] Prompt truncated: reduced experience bullets from N to M (X jobs, oldest trimmed to 2 achievements)`.
- Added post-assembly char-budget check after `userPrompt` is built. If `systemPrompt.length + userPrompt.length > 120_000` chars (~30k tokens), the industry-examples block is truncated from the system prompt and replaced with a minimal JSON instruction. Logs: `[tailor] Prompt truncated: trimmed industry-examples block by N chars (total was M)`.
- Stage 2 AI call now uses `finalSystemPrompt` / `finalUserPrompt` (which are equal to originals when no truncation occurred — zero cost path).
- Added `callAI, isAIError` to imports from `_shared/aiClient.ts`; added `scrubAndCap` from `_shared/scrubSecrets.ts`.

**B — Explicit Groq fallback on upstream 5xx (`tailor-resume/index.ts`)**
- Wrapped Stage 2 `callAIWithRetry` catch. When error is an `AIError` with `status >= 500` and `code !== 'rate_limit'`, a single retry is attempted via `callAI({ jsonMode: true, ... })` — no `featureName` so routing config is bypassed, and `jsonMode: true` biases pool selection toward Groq (`llama-3.3-70b-versatile`). Logs success with `[tailor] Stage 2 Groq fallback succeeded via <providerUsed>`. On fallback failure, refunds credit and re-throws the original error after logging the fallback failure through `scrubAndCap`.

**C — Client retry improvements (`aiTailor.ts`)**
- Retry delay increased from 2,000 ms to 4,000 ms to give transient provider throttles time to clear.
- Retry progress message now distinguishes upstream overload (code `upstream_5xx` / `upstream_error` / message contains "upstream") with copy "Our AI is temporarily overloaded — retrying…" vs generic "Retrying — hang tight…".

---

## 2026-05-06 — Task #65: Tailor animated demo panel

**Files changed:**
- `src/components/editor/tailor/TailorDemoPanel.tsx` (new)
- `src/pages/TailorPage.tsx`

**Changes:**
- `TailorDemoPanel` (new component) — self-contained animated card that cycles through three illustrative "Before → After" bullet-point transformations on a ~4.8 s loop (1800 ms before / 700 ms sparkle transform / 1900 ms after / 350 ms reset). Uses `useReducedMotion` from framer-motion to freeze on the static "After" frame when the system preference is set. Phases: `before` (muted bullet with "Before" badge) → `transforming` (pulsing sparkle globe in centre, `gradient-primary` background) → `after` (primary-tinted bullet with "After" badge) → `resetting` (fade, advance example index). Progress dots below the animation area indicate which of the three examples is active. No hardcoded marketing stats — copy is realistic but non-specific illustrative text.
- `TailorPage.tsx`: replaced the 20-line static blurred skeleton placeholder in the desktop right panel (lines 1075–1095) with `<TailorDemoPanel />`. Component unmounts automatically when `tailorResult` arrives — no regression to the existing results display.

---

## 2026-05-06 — Task #64: Tailor UX bug fixes

**Files changed:**
- `src/components/editor/tailor/JobUrlParser.tsx`
- `src/components/editor/tailor/TailorProgress.tsx`
- `src/lib/aiTailor.ts`
- `src/pages/TailorPage.tsx`

**Changes:**
- `JobUrlParser`: removed `!showManual && !isUrl(urlInput)` guard from the "Use URL instead" button — button now renders unconditionally whenever the manual textarea is visible (`showManual || value`), fixing the case where the user clicked "Or paste manually" and had no way to return to URL mode.
- `JobUrlParser`: updated URL `<Input>` placeholder from `"https://linkedin.com/jobs/view/..."` to `"Paste a job URL (LinkedIn, Indeed, Glassdoor…)"` to reflect multi-platform support.
- `TailorProgress`: added `text-foreground` class to the `<h4>` heading and replaced `text-muted-foreground` with `text-foreground/70` on the step message `<p>` to guarantee legibility against the `from-primary/10` gradient card background in dark mode.
- `aiTailor.ts`: added `let lastEmittedProgress = 0` variable; updated every `progressInterval` tick (not just step transitions) to `lastEmittedProgress = currentProgress` so the value always reflects the live animated position; on auto-retry, changed hardcoded `progress: 70` to `progress: lastEmittedProgress` — the bar carries through its exact current value with no jump or regression.
- `TailorPage.tsx` `handleResumeSwitch`: changed `toast.info(...)` to `toast.success(...)` for the "Resume switched" confirmation so it renders with unambiguous green styling rather than the info accent that appeared error-like in dark mode.

---

## 2026-05-06 — Task #60: Tailor results — clarity, reasoning & safety

**Files changed:**
- `src/pages/TailorPage.tsx`
- `src/components/editor/tailor/SectionChangeCard.tsx`

**Changes:**
- `ResultsPanel`: added `sectionDelta` useMemo (derives per-section score delta from `tailorResult.sectionScores`) typed as `Record<'summary'|'skills'|'experience'|'education', number>`.
- `ResultsPanel`: added `sortedCoreSections` useMemo that sorts the four core section IDs by delta descending; `topSectionId` is `sortedCoreSections[0]`.
- `ResultsPanel`: added `summaryChangesSummary` useMemo using `diffText()` word-count of changed tokens; falls back to `"Professional summary rewritten"`.
- `ResultsPanel`: added `skillsChangesSummary` useMemo using `compareSkills()` → `"Added N · Removed N · Kept N"` string.
- `ResultsPanel`: added `experienceChangesSummary` useMemo deriving from `bulletTransformations` count and unique `experienceId` set.
- `ResultsPanel`: replaced fixed-order section block (summary → skills → experience → education) with `sortedCoreSections.map()` using `<Fragment key={id}>` — section with highest delta renders first; `defaultExpanded={autoExpand}` set for top section when delta > 0.
- `ResultsPanel`: added `discardConfirm` useState + `discardTimerRef` useRef + `handleDiscardClick` useCallback (3-second auto-reset); Discard button switches to `variant="destructive"` with label `"Confirm discard?"` on first click.
- `SectionChangeCard`: added `defaultExpanded?: boolean` prop; `useState(defaultExpanded ?? false)` replaces `useState(false)` for `isExpanded`.
- `SectionChangeCard`: imported `Lightbulb` from lucide-react; upgraded `bt.improvement` rendering from `text-[10px] italic` paragraph to amber chip with `Lightbulb` icon (`bg-amber-50 border-amber-200/50 dark:bg-amber-900/20`).
- `TailorPage.tsx`: added imports for `Fragment` (React), `compareSkills`, `diffText` (`@/lib/diffUtils`).

## 2026-05-06 — Dev-mode persistent auth across preview reloads

**Files changed:**
- `src/lib/supabaseBridge.ts`:
  - Added `email: string | null` and `name: string | null` to `BridgeState` and `emptyState()`
  - Added `_isDev = import.meta.env.DEV` constant; added `DEV_STORAGE_KEY = 'wise_bridge_dev_v1'` and `DEV_LAST_ACTIVE_KEY` constants
  - Added `_key()`, `_activeKey()`, `_store()` helpers that switch between `localStorage` (dev) and `sessionStorage` (production)
  - Updated `loadState()`, `persistState()`, `updateLastActive()`, `clearBridge()`, `refreshTokenIfNeeded()`, and the `visibilitychange` listener to use `_store()`, `_key()`, `_activeKey()`
  - `setCurrentKindeSub()`: also clears `email` and `name` from state on account swap
  - Added `setUserProfile(email, name)` export: updates `state.email/name` and calls `persistState()`
  - Added `getStoredEmail()` and `getStoredName()` exports
- `src/contexts/AuthContext.tsx`:
  - Imported `setUserProfile`, `getStoredEmail`, `getStoredName` from `supabaseBridge`
  - In `useEffect([kindeAuthenticated, kindeUser, ...])`: calls `setUserProfile(kindeUser.email, displayName)` immediately after the `!kindeAuthenticated || !kindeUser` early-return so profile is persisted on every successful Kinde auth
  - In `user` memo: added dev-only branch when `kindeUser` is null — if `import.meta.env.DEV && bridgeReady` and stored email + userId are present, reconstructs the `KindeAppUser` object from bridge localStorage state

**Behaviour:**
- **Dev only**: After the first sign-in, the bridge token and user profile (email, name) are written to `localStorage`. On subsequent preview reloads where Kinde cannot restore its session (third-party cookie block in iframe), `bridgeReady` is set from the cached localStorage token and the user object is reconstructed from stored email/name — no sign-in prompt appears
- **Production**: Unchanged — `sessionStorage` is still used; the dev fallback branch in the `user` memo is dead code (build-time `import.meta.env.DEV = false`)
- Bridge token expiry (1 hour from exchange) is still enforced; after expiry the cached entry is dropped by `loadState()` and the user must sign in again

## 2026-05-06 — Tailor UX Polish v2 — Confidence indicators, empty fix state & microcopy (Task #57)

**Files changed:**
- `src/pages/TailorPage.tsx`:
  - Main tailor button label: `"Tailor My Resume"` → `"Optimize Resume"`; loading label `"Tailoring Resume..."` → `"Optimizing..."`
  - After `<ScoreComparison>` (inside `tailorResult && !isTailoring` block): added static confidence indicators row — three `<div>` rows each with a coloured icon (`Check`/`Shield`/`TrendingUp`) and a short label ("Keywords matched from job description", "ATS-friendly improvements applied", "Bullet points optimized for impact"); no new props or state
  - Fix suggestions section heading `<p>` changed from `"Suggested improvements — apply individually before finalising:"` to `"AI suggestions to improve your match"`; element promoted from `text-xs font-medium text-muted-foreground` to `text-xs font-semibold text-foreground`
  - Fix suggestions show condition expanded: was `(isGeneratingFixes || (fixSuggestions && fixSuggestions.length > 0))`; now `(isGeneratingFixes || fixSuggestions !== null)` — ensures the section title and empty state render even when the list is empty
  - Added empty fix state: when `!isGeneratingFixes && fixSuggestions !== null && fixSuggestions.length === 0`, renders a `bg-success/10 border-success/20` card with `CheckCircle` icon and "No critical issues found — your resume is well optimized for this role"
  - Apply button label: removed dynamic `"Apply (N)"` / `"Apply (score% → Verified)"` variants; simplified to static `"Apply Improvements"` / `"Saving..."` when applying
  - Apply CTA primary helper text: `"Make your resume stronger for this job"` → `"This will save an optimized copy — your original is always kept safe"`

**Behaviour:**
- After tailoring, three small trust-signal rows appear below the score comparison — static, no data dependency
- When fix-suggestion generation completes and returns an empty array, a green confirmation card is shown instead of a blank space
- Fix suggestions block now always shows its heading during/after generation regardless of list length
- Apply button reads "Apply Improvements" consistently; the validated score is already visible in the Validator Check card above it

## 2026-05-06 — TailorPage resume-switch micro-polish (Task #55)

**Files changed:**
- `src/pages/TailorPage.tsx`:
  - `handleResumeSwitch`: added `toast.dismiss()` before `toast.info(...)` to prevent toast stacking on rapid resume switching
  - Fix-generation IIFE early-return guard: removed redundant second `if (resumeIdRef.current !== capturedResumeId) return` that appeared between two synchronous `setState` calls (`setFixSuggestions([])` / `setIsGeneratingFixes(false)`) and was unreachable in a single-threaded JS context
  - Resume `SelectValue`: changed `placeholder="Select a resume..."` → `placeholder="Select a resume"` (removed trailing ellipsis)

**Behaviour:**
- Switching resumes quickly shows at most one "Resume switched — ready to tailor" toast at a time; previous toast is dismissed before the new one appears
- Fix-generation IIFE early-return path is clean: one identity guard, then both synchronous state resets, then return
- Select placeholder copy consistent with rest of UI (no ellipsis)

## 2026-05-06 — TailorPage UX polish + resume selector (Task #51)

**Files changed:**
- `src/pages/TailorPage.tsx`:
  - Added `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` import from `@/components/ui/select`
  - Removed `currentResume: state.currentResume` from `useResumeStore` destructure; added `useMemo` that derives `currentResume` locally from `allResumes?.find(r => r.id === currentResumeId)` → shadows store value for entire component
  - Added `resumeIdRef = useRef<string | null>(currentResumeId)` alongside abort refs
  - Added `useEffect([currentResumeId])` to keep `resumeIdRef.current` in sync
  - Added `useEffect([allResumes, currentResumeId])` stale-selection guard: if loaded `allResumes` does not contain `currentResumeId`, calls `setCurrentResumeId(null)`
  - Added `handleResumeSwitch(resumeId: string)` callback: three guards (empty list, ID not found, same ID); aborts `fixGenerateAbortRef` + `preValidateAbortRef` + clears `preValidateMergedRef`; calls `setCurrentResumeId`; resets `tailorResult`, `originalResume`, `tailorError`, `preValidatorResult`, `isPreValidating`, `fixSuggestions`, `isGeneratingFixes`, `appliedFixes`, `rejectedBullets`, `dismissedIssueIndices`, `parsedJobInfo`; calls `toast.info('Resume switched — ready to tailor')`. Deps: `[allResumes, currentResumeId]`
  - Pre-validation IIFE: added `const capturedResumeId = resumeIdRef.current` at IIFE start; added `if (resumeIdRef.current !== capturedResumeId) return` before `setPreValidatorResult` and before `setIsPreValidating(false)` in finally
  - Fix-generation IIFE: added `const capturedResumeId = resumeIdRef.current` after `thisAbort` creation; added identity guards before all state writes alongside existing abort-controller checks
  - Replaced old conditional resume picker + resume badge blocks with a single always-visible `<div className="space-y-1">` selector: skeleton while `allResumes === undefined`; upload prompt when `allResumes.length === 0`; Radix `Select` with `value={currentResumeId ?? undefined}` (no empty-string fallback), `disabled={isTailoring || isApplying}`, and `SelectItem` per resume otherwise
  - Intensity copy: Light → `'Minor keyword improvements'`, Aggressive → `'Strong rewrite for maximum job match'`
  - Added `{!isTailoring && <p>AI will rewrite your resume to better match this job • Takes ~10–20 seconds</p>}` below Tailor button
  - Desktop right-panel empty state replaced with animated skeleton card (3 section groups, animate-pulse bars) and absolute-overlay "Before → After optimization" badge with descriptive text
- `src/components/editor/tailor/JobUrlParser.tsx`:
  - Added `Sparkles` to lucide-react import
  - Added module-level `SAMPLE_JOB_DESCRIPTION` constant (Frontend Developer sample, no API call)
  - Label text: `'Paste job URL or description'` → `'Paste a job description to match your resume in seconds'`
  - Parse button text: `'Parse'` → `'Extract Job Details'`
  - Added "Try a sample job" button after supported-sites badges: `onClick={() => { onChange(SAMPLE_JOB_DESCRIPTION); setShowManual(true); }}`

**Behaviour:**
- Resume selector always visible at top of left panel; switches resume without navigation, resets all resume-specific state, shows toast
- Async stale-write safety: two independent guards per IIFE (abort-controller + resume identity ref)
- Stale-selection guard handles resume deletion in another tab
- `currentResume` derived from TanStack Query cache (`allResumes`) — eliminates store divergence risk
- `value={currentResumeId ?? undefined}` prevents Radix Select from receiving a mismatched value

## 2026-05-06 — Guided Fix System: per-fix suggestion cards in Validator Check (Task #45)

**Files changed:**
- `src/types/resume.ts` — added `FixSuggestion` interface (`type`, `section`, `target_id?`, `before?`, `after`, `reason`)
- `src/lib/tailorMerge.ts` — added `normalizeSkill()` and `applyFixesOnTop(merged, fixes, enabledSections)` exports; `improve_bullet` target_id split uses `lastIndexOf('-')` to handle UUID-based experienceIds correctly
- `supabase/functions/generate-fix-suggestions/index.ts` — new edge function; calls `callAIWithRetry` with `featureName:'tailor-resume'`, `temperature:0.2`, `maxTokens:800`, `jsonMode:true`; post-processes AI output with VALID_TYPES/VALID_SECTIONS guards, length <10 drop, generic-phrase drop (`responsible for`, `worked on`, etc.), `isBulletRelevant()` overlap check for `improve_bullet` (≥2 tokens OR ≥25% overlap), `target_id` `lastIndexOf` split, bounds check; always returns HTTP 200 `[]` on any error
- `supabase/config.toml` — registered `[functions.generate-fix-suggestions] verify_jwt = false`
- `src/pages/TailorPage.tsx`:
  - Imports: added `FixSuggestion` from types, `applyFixesOnTop` from tailorMerge
  - Added `MAX_APPLIED_FIXES = 10` constant
  - New state: `fixSuggestions: FixSuggestion[] | null`, `isGeneratingFixes: boolean`, `appliedFixes: FixSuggestion[]`
  - New refs: `fixGenerateAbortRef`, `preValidateMergedRef` (set after `buildMergedResume` in pre-validate IIFE)
  - `handleTailor` reset block: resets all three new state vars, aborts `fixGenerateAbortRef`, clears `preValidateMergedRef`
  - New `useEffect([preValidatorResult, jobDescription])`: fires `generate-fix-suggestions` POST with abort+timeout guard; race-condition identity check before setting state; skips if no missing_keywords and no issues
  - New `handleApplyFix(idx)`: nested setState pattern (stale-closure-safe); deduplication by `(type, after, target_id)`; MAX_APPLIED_FIXES cap
  - `handleApplyChanges` and preview sheet: both `buildMergedResume` call sites now wrapped with `applyFixesOnTop(..., appliedFixes, enabledSections)`
  - `ResultsPanelProps`: added `fixSuggestions`, `isGeneratingFixes`, `appliedFixes`, `onApplyFix`
  - Both mobile and desktop `ResultsPanel` call sites: pass all four new props
  - New `FixSuggestionCard` component: shows type label, before (strikethrough), after text, reason, and "Apply" button
  - `ResultsPanel` `ResultsPanel`: destructures new props; renders fix suggestion cards and score-awareness note inside Validator Check card

**Behaviour:**
- After pre-validation completes (and only when missing_keywords or issues are present), a background call to `generate-fix-suggestions` fires automatically
- Up to 5 atomic fix cards appear inside the Validator Check card — each individually applicable with one click
- Applying a fix: removes the card, composes the change into `appliedFixes` state (never mutating `tailorResult`)
- `applyFixesOnTop` is composed over `buildMergedResume` output at both Apply and Preview sites — the merged resume seen in preview and saved to DB always includes applied fixes
- Score-awareness note shown when `appliedFixes.length > 0` reminding user to click Apply to save

## 2026-05-06 — Extract shared keyword-scoring logic into _shared/keywordScoring.ts (Task #39)

**Files changed:**
- `supabase/functions/_shared/keywordScoring.ts` — new shared module; exports `stem`, `tokenize`, `countKeywordInTokens`, `resumeToText`, `computeDeterministicScores`
- `supabase/functions/tailor-resume/index.ts` — removed local `stem`, `tokenize`, `countKeywordInTokens`, `resumeToText`; imports `tokenize`, `countKeywordInTokens`, `resumeToText` from `_shared/keywordScoring.ts`; `computeAtsKeywordScores` remains local (tailor-specific shape)
- `supabase/functions/validate-tailor/index.ts` — removed all five local duplicate functions; imports `resumeToText`, `computeDeterministicScores` from `_shared/keywordScoring.ts`

**Behaviour:**
- No runtime behaviour change; algorithmic output is identical
- Single source of truth for keyword scoring: all future bug fixes or stemming improvements must only be made in `_shared/keywordScoring.ts`
- `validate-tailor`'s stricter TypeScript types (no `any`) preserved in the shared module

## 2026-05-06 — Verified match scores on dashboard cards and tailor history (Task #38)

**Files changed:**
- `src/types/resume.ts` — added optional `verifiedScore?: number | null` field to `TailorHistory` interface
- `src/pages/TailorPage.tsx` — passes `verifiedScore: finalMatchScore` into `addTailorHistory` call
- `src/components/dashboard/ResumeListCard.tsx` — replaces inline `(matchScore% match)` text with a colour-coded `ShieldCheck` badge; helper `verifiedScoreClass(score)` (≥75 green / ≥50 amber / <50 red)
- `src/components/editor/tailor/TailorHistorySheet.tsx` — badge now uses `verifiedScore ?? scoreBeforeAfter.after` with a `ShieldCheck` icon and "Verified" label when the field is set; colour thresholds updated to match spec (≥75 / ≥50 / <50); before→after row uses `verifiedScore` as the "after" value when available

**Behaviour:**
- Dashboard resume cards: if `resume.job_match_score` is set the target-job row now shows a small colour-coded badge (`ShieldCheck` icon + score%) instead of inline plain text; badge absent when score is null
- Tailor history sheet: badge shows `ShieldCheck` + score% + "Verified" label when `verifiedScore` is present; falls back to `TrendingUp` icon with generator score for older entries that pre-date this change; before→after line uses verified score as "after"
- Old history entries in the Zustand store do not have `verifiedScore` (field is optional) — they continue to display the generator estimate via `scoreBeforeAfter.after`

## 2026-05-06 — Inline pre-validation feedback before Apply (Task #37)

**Files changed:**
- `src/pages/TailorPage.tsx` — pre-validate state, background fetch, `ResultsPanel` UI, Apply label

**TailorPage.tsx:**
- New state: `preValidatorResult`, `isPreValidating`, `dismissedIssueIndices` (Set<number>).
- `handleTailor`: after result arrives, fires a fire-and-forget IIFE that POSTs to `validate-tailor` with the merged-preview resume (all selected sections, empty `rejectedBullets`). 12 s `AbortController` timeout; non-fatal failure. Sets `preValidatorResult` on success, clears `isPreValidating` in finally.
- Reset of pre-validate state (`null`, `false`, `new Set()`) added at start of `handleTailor`.
- `handleDismissIssue(index)` callback added; uses functional `setDismissedIssueIndices`.
- `enabledSections` added to `handleTailor` `useCallback` deps (was previously missing, needed for merged-preview build).
- `ResultsPanelProps`: four new props — `preValidatorResult`, `isPreValidating`, `dismissedIssueIndices`, `onDismissIssue`.
- `ResultsPanel`: below `KeywordMatchList`, renders "Validator Check" card when `isPreValidating || preValidatorResult`. Card shows: spinner while loading; verdict pill (Strong/Average/Weak color-coded); score%; "keyword match · Verified" label; missing keyword chips (red pill, border); dismissible `AlertTriangle` callouts for each AI-flagged issue.
- Apply button label: `Apply (${preValidatorResult.score}% → Verified)` when result available, else `Apply (${enabledSections.length})`.
- Both mobile and desktop `ResultsPanel` call sites updated with new props.
- Added `Shield`, `AlertTriangle` to lucide-react imports.
- `mapIssuesToSections(issues)`: pure helper that assigns each issue index to the first matching section via priority-ordered keyword scan (`summary` → `education` → `projects` → `certifications` → `awards` → `skills` → `experience` → `global`). Returns `Map<TailorSectionId | 'global', number[]>`.
- `SectionIssueCallouts` component: renders only the visible (non-dismissed) issues for a given index list — amber `AlertTriangle` callouts with `×` dismiss button.
- `ResultsPanel` computes `issueMap` via `useMemo`. Section-specific callouts (`SectionIssueCallouts`) render immediately after each `SectionRevealWrapper` block for summary/skills/experience/education/projects/certifications. Global Validator Check card shows only `issueMap.get('global')` catch-all issues.
- `TailorPreviewSheet` `applyLabel` updated to use the same `Apply (score% → Verified)` format when `preValidatorResult` is available.

## 2026-05-06 — validate-tailor Edge Function + Apply-time score verification (Task #36)

**Files changed:**
- `supabase/functions/validate-tailor/index.ts` — NEW: two-phase validator edge function
- `supabase/config.toml` — added `[functions.validate-tailor] verify_jwt = false`
- `src/types/resume.ts` — added `ValidatorResult` interface (exported)
- `src/pages/TailorPage.tsx` — validator fetch in `handleApplyChanges`, `appliedValidatorResult` state, updated success screen
- `supabase/functions/tailor-resume/index.ts` — added rule 9 (SKILLS INTEGRITY) to system prompt

**validate-tailor/index.ts:**
- Phase 1 (deterministic): replicates `stem/tokenize/countKeywordInTokens/resumeToText/computeDeterministicScores` from `tailor-resume` — keyword scoring against `finalResume`, returns `score/matched_keywords/missing_keywords`. No AI, no credits.
- Phase 2 (qualitative): `callAIWithRetry` with `featureName: 'tailor-resume'`, `temperature: 0.1`, `maxTokens: 600`. Prompt checks for hallucinated skills (skills not in original OR job description) and weak bullet language. Returns `issues/strengths/verdict`. Phase 2 failure is non-fatal; falls through with `verdict: null` and empty arrays.
- No credit deduction. `requireAuth` guards the endpoint. `wrapHandler` wraps for invocation logging.

**TailorPage.tsx:**
- `handleApplyChanges`: fetches `validate-tailor` with 12 s `AbortController` timeout before DB insert. `job_match_score` = `validatorResult.score` if non-null, else `tailorResult.overallScore?.after`.
- `appliedValidatorResult` state snapshotted after apply; reset in `handleCloseSuccess`.
- Success screen: "After" score uses `validatedAfterScore`; `✓ Verified` (green) vs `~ Estimated` (muted) badge; verdict chip (Strong/Average/Weak); missing-keywords chips (max 5 + overflow count); issues `<details>` collapsed.
- Both mobile and desktop `ResultsPanel` call sites receive `appliedValidatorResult` prop.
- `matchedCount` prefers `validatorResult.matched_keywords.length` over generator ATS list.

**tailor-resume prompt rule 9:** "SKILLS INTEGRITY: Only add a skill to the tailored skills list if it already appears in the original resume OR is explicitly required in the job description. Do not invent or hallucinate skills. The result will be independently validated."

---

## 2026-05-05 — Dashboard visual hierarchy cleanup (Task #30)

**Files changed:**
- `src/pages/DashboardPage.tsx`
- `src/components/dashboard/DashboardHero.tsx`

**WhatsNextCard:** removed `<WhatsNextCard />` render and its comment; removed unused import. Component file and logic untouched.

**DashboardHero — returning user (compact):** `mt-3→mt-4`, `mb-1→mb-4`, `py-3→py-4`; label `mb-2→mb-3`.

**DashboardHero — new user (full):** `mt-4→mt-5`, `mb-3→mb-6`, `py-6→py-8`; headline `text-[22px]→text-2xl`, `mb-1.5→mb-2`; sub-copy `mb-5→mb-6`.

**Explore cards:** `pt-2→pt-1` on wrapper; cards `py-3→py-2`, `bg-card→bg-muted/40`, `border-border→border-border/50`; icon container `w-9 h-9→w-8 h-8`; icon `w-[18px] h-[18px]→w-4 h-4`; label `text-[12px]→text-[11px]`. Grid unchanged.

---

## 2026-05-05 — Tailor success screen: copy, keyword highlight, event logging (Task #28)

**Files changed:**
- `src/pages/TailorPage.tsx`

**New state:**
- `appliedKeywordCount: number | null` — captured from `tailorResult.atsAnalysis?.matchedKeywords?.length` in `handleApplyChanges` before `setTailorResult(null)`; reset in `handleCloseSuccess`.

**New helper:**
- `logTailorEvent(event, detail?)` — module-level `console.log` wrapper; zero dependencies, easy to swap for a real analytics call later.

**New callback:**
- `handleGoToPortfolio` — extracted from inline arrow at both `<ResultsPanel>` call sites; fires `logTailorEvent('portfolio-cta-clicked')` then navigates to `/portfolio`.

**Copy changes (success screen):**
- Heading: `"New tailored resume created!"` → `"Your resume is now stronger for this job"`
- Zero-improvement sub-text: `"Minor improvements applied"` → `"Your resume has been refined and aligned with this role"`

**New render:**
- `+{appliedKeywordCount} keywords matched` line below score card; only rendered when count is a positive integer.

**Event logging (four points):**
- `optimize-clicked` — top of `handleTailor`
- `apply-changes-clicked` — top of `handleApplyChanges`
- `success-screen-shown` — just before `setShowAppliedCTA(true)`, includes score and keyword count
- `portfolio-cta-clicked` — inside `handleGoToPortfolio`

**Props threaded:**
- `appliedKeywordCount` added to `ResultsPanelProps` and passed at both mobile + desktop `<ResultsPanel>` call sites.

---

## 2026-05-05 — Tailor success screen: score display + portfolio nudge (Task #24)

**Files changed:**
- `src/pages/TailorPage.tsx`

**New state:**
- `appliedScore: { before: number; after: number } | null` — captured from `tailorResult.overallScore` in `handleApplyChanges` before `setTailorResult(null)`; reset in `handleCloseSuccess`.

**`ResultsPanelProps` additions:** `appliedScore`, `onGoToPortfolio: () => void` — passed to both mobile and desktop `<ResultsPanel>` instances.

**New `ScoreLabel` helper:** inlined colour-coded score renderer using same thresholds as `ScoreComparison` (success ≥85, amber ≥70, destructive <70).

**`ResultsPanel` success screen (`showAppliedCTA` branch):**
- Removed `✅` emoji from heading.
- Score card rendered above CTAs when `appliedScore` is non-null: before (muted) → arrow → after (colour-coded). `+N improvement` badge (green) when `after > before`; "Minor improvements applied" (muted) otherwise. Always shown when data is present.
- Fourth CTA: "Turn this into a portfolio" (`variant="outline"`, `Globe` icon) → `navigate('/portfolio')`. No plan gate; shown to all users.

**Imports added:** `Globe`, `TrendingUp` from `lucide-react`.

## 2026-05-05 — Enable Kinde sign-in in Replit preview (Task #22)

**Files changed:**
- No code changes — environment configuration only.

**Configuration:**
- Confirmed `VITE_KINDE_CLIENT_ID` and `VITE_KINDE_DOMAIN` already present as shared Replit env vars.
- Replit dev callback URL for Kinde allowlist: `https://1f351d86-f0a0-42e9-a76f-db07653707b7-00-qtwju03yj2qa-rtsqjr1v.kirk.replit.dev/auth/callback`
- Replit dev origin for Kinde allowlist: `https://1f351d86-f0a0-42e9-a76f-db07653707b7-00-qtwju03yj2qa-rtsqjr1v.kirk.replit.dev`
- User added both values to the Kinde application dashboard (Allowed redirect URIs + Allowed origins).
- Verified: landing page loads in preview with "Sign In" button visible (not the "Sign in isn't available here" fallback screen).

## 2026-05-05 — Dashboard UX: hero section, discovery grid, subtler lock badges (Task #19)

**Files changed:**
- `src/components/dashboard/DashboardHero.tsx` — new component
- `src/pages/DashboardPage.tsx`
- `src/components/layout/BottomTabBar.tsx`

**New component — `DashboardHero`:**
- Full-size variant (0-resume users): gradient card, "Optimize your resume. Get more interviews." headline, subline, two full-width `size="lg"` buttons — "Build a Resume" (outline) and "Optimize for a Job" (filled); Framer Motion `y: 10 → 0` entry.
- Compact variant (returning users): plain card, "Jump back in" label, same two buttons at `h-10`; `y: 6 → 0` entry.
- Props: `hasResumes: boolean`, `onBuild: () => void`, `onTailor: () => void`.

**`DashboardPageContent` changes:**
- Imported `DashboardHero`; mounted as first child of `PullToRefresh` scroll area (before trust banner, profile banner, `DashboardStats`).
- Added `handleHeroTailor` callback: loads `resumes[0]` into resume store if present, then `navigate('/tailor')`.
- Replaced 7-tile unified Explore grid with 4-tile `grid-cols-2 sm:grid-cols-4` secondary-discovery grid (Templates, Examples, Guides, Referral); removed creation tiles (New Resume, Upload PDF, Import).
- Added conditional "Continue editing" text link below discovery tiles — visible only when `resumes.length > 0`; loads latest resume into store and navigates to `/editor`.
- Removed `QuickStartBanner` block entirely (hero covers 0-resume CTA).
- Removed `showQuickStartBanner` state; simplified `wr-quickstart-had-resume` effect to set flag when `resumes.length > 0`.
- Removed unused lucide imports: `Plus`, `Upload`, `Download`, `Briefcase`, `Linkedin`.

**`BottomTabBar` changes:**
- Replaced `motion.span` amber pill on AI Tools (non-pro) with plain `<Lock className="… text-muted-foreground/50" />` — no background, no animation.
- Same replacement for Activity tab (non-pro).

## 2026-05-05 — Live Visitors card shows per-country breakdown (Task #12)

**Files changed:**
- `supabase/functions/admin-visitor-analytics/index.ts` — `live-count` action
- `src/components/dev-kit/MissionControlPanel.tsx`

**Backend:**
- `live-count` now selects `session_id, country` (was `session_id` only); deduplicates by session_id keeping first-seen country; aggregates country counts across live sessions; returns `topCountries: { country: string; count: number }[]` (top 5, sorted descending) alongside `liveCount`.

**Frontend:**
- Added `countryCodeToFlag(code: string): string` helper — converts ISO 3166-1 alpha-2 code to Unicode regional indicator flag emoji.
- Added `LiveCountryBreakdown` component — renders up to 5 rows, each with flag emoji, 2-letter code, proportional green progress bar, and session count.
- `liveTopCountries` state (`useState<{ country: string; count: number }[]>([])`); populated by `fetchLiveCount` from `result.topCountries ?? []`.
- Live Visitors `StatusCard` body now wraps count row + `<LiveCountryBreakdown />` in a `space-y-2` div; breakdown only renders when `liveTopCountries.length > 0`.

## 2026-05-05 — Live visitor counter upgraded to Supabase Realtime (Task #11)

**Files changed:** `src/components/dev-kit/MissionControlPanel.tsx`

- Replaced `useVisibleInterval(fetchLiveCount, 30_000)` unconditional HTTP poll with a Supabase Realtime channel subscription on `public.visitor_events` (`postgres_changes`, `INSERT` event).
- Added `realtimeConnected: boolean` state; channel `.subscribe()` callback sets it `true` on `SUBSCRIBED`, `false` on `CLOSED` / `CHANNEL_ERROR`.
- `useVisibleInterval(fetchLiveCount, 30_000)` — poll runs unconditionally every 30s even when Realtime is connected; Realtime INSERT events handle instant upward ticks while the poll keeps the count accurate during quiet periods (sessions aging out of the 5-min window) and acts as fallback when the channel is unavailable.
- Subscribe callback treats `CLOSED`, `CHANNEL_ERROR`, and `TIMED_OUT` as disconnected, re-enabling polling if realtime drops after initial connection.
- Channel is created on mount (guarded by `if (!SUPABASE_URL) return` to skip in envs without credentials) and cleaned up via `supabase.removeChannel()` on unmount using a closure over the local `channel` variable.
- UI badge in the Live Visitors card updated: shows `live` when Realtime is connected, `refreshes every 30s` when falling back to polling.
- Imports added: `supabase` from `@/integrations/supabase/safeClient`, `SUPABASE_URL` from `@/lib/supabaseConstants`.

## 2026-05-05 — Deploy visitor tracking edge functions + DB migrations to production (Task #6)

**Deployment — Supabase project `jnsfmkzgxsviuthaqlyy` (CLI v2.98.1):**

`supabase functions deploy track-visitor-event stitch-visitor-identity purge-old-visitor-events admin-visitor-analytics`

- `track-visitor-event`: ACTIVE. Anonymous bulk-insert endpoint; 120 req/min IP rate-limit; Cloudflare `CF-IPCountry`/`CF-IPCity` geo enrichment; validates event types (`page_view`, `click`, `section_view`, `feature_use`) and device types; inserts up to 100 events per call.
- `stitch-visitor-identity`: ACTIVE. JWT Bearer decode via `jose.decodeJwt`; updates `visitor_events.user_id` where `anon_id` matches and `user_id IS NULL`.
- `purge-old-visitor-events`: ACTIVE. Calls `public.purge_old_visitor_events()` RPC; deletes rows `created_at < now() - interval '365 days'`; requires `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>`.
- `admin-visitor-analytics`: ACTIVE. `requireAdminAuth` gate; 8 dispatch actions (`kpis`, `country-dist`, `top-pages`, `click-targets`, `sections`, `sessions`, `journey`, `cohort`); uses `count_distinct_visitor_anon_ids` and `visitor_new_vs_returning` RPCs.

`supabase db push` — applied 3 migrations:

- `20260607000000_visitor_events.sql`: `public.visitor_events` table with RLS (anon+authenticated insert, service_role read-bypass); 6 indexes (`anon_id`, `user_id`, `session_id`, `created_at DESC`, `event_type+page`, `country`); `public.purge_old_visitor_events()` security-definer function.
- `20260607000001_visitor_events_rpcs.sql`: `public.count_distinct_visitor_anon_ids(p_start timestamptz)` and `public.visitor_new_vs_returning(p_start timestamptz)` — both `SECURITY DEFINER STABLE`.
- `20260607000002_visitor_purge_cron.sql`: Initial (buggy) cron schedule attempt — used `net.http_post` inline (pg_net not installed) and wrong vault key name. Superseded by 20260607000003.
- `20260607000003_fix_visitor_purge_cron.sql` (NEW): Unschedules the broken job from 20260607000002; reschedules `purge-old-visitor-events-daily` to call `SELECT public.purge_old_visitor_events()` directly via SQL (no pg_net, no secrets needed). Confirmed active: `cron.job` row — `jobid: 4`, `schedule: 0 3 * * *`, `command: SELECT public.purge_old_visitor_events()`, `active: true`.

**Infrastructure verified (production DB queries):**
- `pg_cron` v1.6.4: INSTALLED ✅
- `pg_net`: NOT installed — cron uses direct SQL call instead of HTTP POST
- `vault.cron_secret`: EXISTS (seeded by migration 20260606000000)
- Cron job `purge-old-visitor-events-daily`: ACTIVE, schedule `0 3 * * *`, command `SELECT public.purge_old_visitor_events()` ✅

**Smoke test (2026-05-05):** `POST https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/track-visitor-event` with `{events:[{anon_id:..., session_id:..., event_type:"page_view", ...}]}` → `{"ok":true,"inserted":1}`. Confirms `track-visitor-event` is live and writing to `public.visitor_events`.

**`react-simple-maps` scope resolution:** Task spec mentioned verifying this package in the prod bundle. Audited `src/components/dev-kit/VisitorsPanel.tsx` — the `WorldMap` sub-component is a fully custom emoji-flag + CSS progress-bar chart; `react-simple-maps` is not imported anywhere, not in `package.json`, and is not needed. Scope item closed: no action required.

**Reference cards updated:** `Project Atlas/01-Currently Implemented/edge-functions/track-visitor-event.md`, `stitch-visitor-identity.md`, `purge-old-visitor-events.md`, `admin-visitor-analytics.md`.

---

## 2026-05-05 — Expand data-track and data-section coverage (Task #7)

**Files modified:**
- `src/pages/AuthPage.tsx`: Added `data-track="auth-sign-in"` on the post-verify/post-reset Sign In button; `data-track="auth-back-to-sign-in"` on the forgot-password back link; `data-track="auth-send-reset-link"` on the forgot-password submit button; `data-track="auth-sign-in"` / `"auth-sign-up"` (mode-derived) on the "Open live site" and "Open in new tab" fallback buttons.
- `src/components/editor/EditorHeader.tsx`: Added `data-track="editor-change-template"` on Template button; `data-track="editor-customize-design"` on Design button; `data-track="editor-export"` on Export button; `data-track="editor-open-ai-chat"` on both desktop and mobile Wise AI buttons.
- `src/components/editor/EditorScrollForm.tsx`: Added `data-section="editor-section-{id}"` on all five core form section `<section>` elements (contact, summary, experience, education, skills) — coexists with existing `data-section-id` used by the IntersectionObserver.
- `src/components/editor/SectionSidebar.tsx`: Added `data-section="editor-form"` on the `<nav>` element; added dynamic `data-track="editor-section-{step.id}"` on every section nav button (contact, summary, experience, education, skills, etc.).
- `src/components/editor/TailorSheet.tsx`: Added `data-track="editor-generate-cover-letter"` on the "Generate Matching Cover Letter" button (line ~1535).
- `src/pages/EditorPage.tsx`: Added `data-track="editor-tools-export"` on the tools-sheet Download/Export button; `data-track="editor-tools-tailor"` on the tools-sheet Tailor to Job button.
- `src/pages/DashboardPage.tsx`: Wrapped `<DashboardStats>` in `<div data-section="dashboard-hero">`; added `data-section="dashboard-explore"` on the Explore grid wrapper; added `data-track="dashboard-quick-action-{kebab-label}"` on all seven quick-action buttons (templates, examples, referral, guides, new-resume, upload-pdf, import).
- `src/pages/SubscriptionPage.tsx`: Added `data-track="dashboard-upgrade-cta-{target}"` (pro / premium) on both upgrade `<Button>` elements.
- `src/pages/PublicPortfolioPage.tsx`: Wrapped `<PublicHero>` in `<div data-section="portfolio-hero">`; wrapped `<PublicSections>` in `<div data-section="portfolio-sections">`; added `data-track="portfolio-interested"` on the "I'm Interested" recruiter CTA button.

---

## 2026-05-05 — Live visitor counter on Mission Control (Task #8)

**`supabase/functions/admin-visitor-analytics/index.ts` — new `live-count` action:**
- Queries `visitor_events` for rows with `created_at >= NOW() - 5 minutes`, collects distinct `session_id` values in a `Set`, returns `{ liveCount: number }`.
- No new edge function; extends the existing `admin-visitor-analytics` dispatch table.
- Query is intentionally lightweight (session_id column only, 5-minute window); no RPC needed.

**`src/components/dev-kit/MissionControlPanel.tsx` — Live Visitors KPI card:**
- New `liveCount: number | null` state variable.
- New `fetchLiveCount` callback: calls `admin-visitor-analytics` with `{ action: 'live-count' }`; fail-open (catches errors silently, keeps last known value).
- `useEffect(() => { fetchLiveCount(); }, [fetchLiveCount])` for initial load.
- `useVisibleInterval(fetchLiveCount, 30_000)` for 30-second polling (same pattern as existing cards, half the 60s interval of the main mission-control fetch).
- `StatusCard` with `Users` icon, green status dot when `liveCount > 0`, grey when 0 or loading.
- Card body: animated ping dot (Tailwind `animate-ping`) + large tabular-nums count + "refreshes every 30s" label.
- Deep-link button navigates to `visitors` tab.
- `Users` added to lucide-react import.

## 2026-05-05 — ScrollStack flicker and sticking fix (Task #5)

**Root cause A fixed — removed `duration` + `easing` from both Lenis constructor calls (`src/components/landing/ScrollStack.tsx:469-491`):**
- Lenis v1.3.23 `Animate` class (`node_modules/lenis/dist/lenis.mjs:79-86`): when `duration` AND `easing` are both present, the duration-based easing branch is taken and `lerp` is silently ignored.
- Both Lenis instances (window-scroll path and scroller-element path) previously passed all three: `duration: 1.2`, `easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))`, and `lerp: 0.08/0.1`.
- The easing function is front-loaded: 97% of scroll distance in the first 50% of 1.2 s → last 0.6 s covers only 3% → `window.scrollY` barely moves → card transforms appear frozen ("sticking"). Every fast direction-reversal re-triggered this tail.
- Fix: removed `duration` and `easing` from both constructors. Lenis now uses the `else if (this.lerp)` branch → lerp `0.08` (touch) / `0.1` (non-touch) provides frame-rate-independent damped scroll with no frozen tail.

**Root cause B fixed — opacity formula changed from trigger-relative to viewport-relative (`src/components/landing/ScrollStack.tsx:349-353`):**
- Old formula: `fadeStart = triggerStart - containerHeight * 1.2; opacity = calculateProgress(scrollTop, fadeStart, triggerStart)`. `calculateProgress` decreases when `scrollTop` drops below `triggerStart`, so upward scrolling fades out cards that are still physically in the viewport (card 1 visible at 580 px from viewport top but rendered at 66% opacity at `scrollTop=800`).
- The `1.2×` multiplier applied in Task #1 made this worse (lowered `fadeStart` from ~630 to ~90, creating a large fade-out zone during visible scroll).
- New formula: `viewportEntry = cardTop - containerHeight; fadeStart = viewportEntry - containerHeight * 0.5; opacity = calculateProgress(scrollTop, fadeStart, viewportEntry)`.
- `viewportEntry` is the scroll position at which the card's top edge first enters the viewport from below. `calculateProgress` clamps to 1 when `scrollTop >= viewportEntry` → opacity = 1 the moment the card is in or above the viewport, regardless of scroll direction. No fade-out on upward scroll.

## 2026-05-05 — v3.12.0: Visitor Intelligence Dashboard (Task #4)

Full end-to-end visitor tracking pipeline: anonymous event collection, GDPR consent gating, geo enrichment, identity stitching, and a rich DevKit "Visitors" panel.

**DB migrations:**
- `supabase/migrations/20260607000000_visitor_events.sql`: `public.visitor_events` table — `id uuid PK`, `anon_id text`, `user_id uuid FK users nullable`, `session_id text`, `event_type text`, `page text`, `target text nullable`, `section text nullable`, `props jsonb`, `country_code char(2) nullable`, `device text`, `browser text`, `referrer text nullable`, `created_at timestamptz`. Indexes on `anon_id`, `user_id`, `session_id`, `created_at desc`, `event_type + created_at`, `country_code`. RLS: `service_role` insert-only. Purge helper: `purge_old_visitor_events(p_days int)`.
- `supabase/migrations/20260607000001_visitor_events_rpcs.sql`: `count_distinct_visitor_anon_ids(p_start timestamptz, p_end timestamptz)` and `visitor_new_vs_returning(p_start timestamptz, p_end timestamptz)` RPCs via `SECURITY DEFINER`.

**Edge functions (new):**
- `supabase/functions/track-visitor-event/index.ts`: anonymous bulk-insert endpoint; no JWT required; IP rate-limit (60 req/min via `ip_rate_limits` table); geo from Cloudflare `CF-IPCountry` header; validates event types; batches up to 20 events per call.
- `supabase/functions/purge-old-visitor-events/index.ts`: cron retention sweep; calls `purge_old_visitor_events(90)`; requires `CRON_SECRET`.
- `supabase/functions/stitch-visitor-identity/index.ts`: post-login anon→user identity linking; requires user JWT; reads `wise_anon_id` from request body; updates all rows with matching `anon_id` to set `user_id`.
- `supabase/functions/admin-visitor-analytics/index.ts`: DevKit query backend; requires admin auth; actions: `kpis`, `country-dist`, `top-pages`, `click-targets`, `sections`, `sessions`, `journey`, `cohort`.

**Client tracking:**
- `src/lib/visitorTrack.ts`: queue/flush architecture, consent gating (`wise_tracking_consent` key), device/browser detection, session management (`wise_session_id`), anon ID generation/persistence (`wise_anon_id`).
- `src/hooks/useVisitorTracking.ts`: `page_view` events on React Router navigation, delegated `click` listener for `[data-track]` elements, `IntersectionObserver` section dwell tracking for `[data-section]` elements (2-second threshold).
- `src/components/layout/ConsentBanner.tsx`: GDPR banner; appears 1.5 s after first visit; accept/decline; never re-appears once answered.

**DevKit panel:**
- `src/components/dev-kit/VisitorsPanel.tsx`: KPI strip (unique visitors, sessions, page views, bounce rate, avg session length); world map choropleth (`react-simple-maps`); device + browser donut charts; top pages ranked list; click targets table with page filter; section engagement table; session list with pagination; journey drawer (per-session timeline); user cohort table.

**Wiring:**
- `src/pages/DevToolsPage.tsx`: `visitors` tab added between `analytics` and `ai-cost` in `NAV_SECTIONS`, `TAB_LABELS`, `Tab` type, and panel render.
- `src/AppInterior.tsx`: `useVisitorTracking` called inside `AppRoutes` with `user?.id`; `<ConsentBanner />` mounted at root layout.
- `supabase/config.toml`: 4 new function blocks (`track-visitor-event`, `purge-old-visitor-events`, `stitch-visitor-identity`, `admin-visitor-analytics`), all `verify_jwt = false`.
- `src/lib/apiFnUrl.ts`: `track-visitor-event` and `stitch-visitor-identity` added to `DIRECT_FN_NAMES`.

**Landing page tracking attributes:**
- `src/components/landing/WiseResumeHero.tsx`: `data-track="hero-get-started-free"` + `data-track="hero-go-to-dashboard"` on CTA buttons; `data-section="hero"` on root `<section>`.
- `src/components/landing/FeatureSection.tsx`: `data-section="feature-{id}"` on root `<section>`.
- `src/components/landing/TrustSection.tsx`: `data-section="trust"` on root `<section>`.

## 2026-05-04 — v3.11.4: Editor AI consolidation complete — 4 legacy edge functions retired (Tasks #41, #44, #45)

Backend housekeeping release. All traffic for `analyze-resume`, `recruiter-simulation`,
`suggest-template`, and `optimize-for-linkedin` has been flowing through the consolidated
`editor-ai` router since v3.11.0 (Task #40). This release completes the cleanup:

**Task #41 — retire source stubs + migration (2026-06-03):**
- `supabase/functions/analyze-resume/index.ts` → replaced with 410 Gone retirement stub.
- `supabase/functions/recruiter-simulation/index.ts` → replaced with 410 Gone retirement stub.
- `supabase/functions/suggest-template/index.ts` → replaced with 410 Gone retirement stub.
- `supabase/functions/optimize-for-linkedin/index.ts` → replaced with 410 Gone retirement stub.
  Each stub returns `{"error":"<name> has been retired. Use editor-ai with x-editor-ai-action: <action>."}` + HTTP 410. Full original source preserved in git history (pre-Task-#41 commits).
- `supabase/migrations/20260603000000_retire_legacy_editor_ai_routing_config.sql`: `DELETE FROM ai_routing_config WHERE feature_name IN ('analyze-resume','recruiter-simulation','suggest-template','optimize-for-linkedin')`. The `editor-ai` consolidated row is not touched.
- `src/components/dev-kit/AIRoutingPanel.tsx`: removed `analyze-resume`, `recruiter-simulation`, `suggest-template`, `optimize-for-linkedin` from `FEATURE_LABELS` and `EDITOR_AI_FUNCTIONS`. Editor AI group now shows 5 functions: `editor-ai`, `resume-section-ai`, `tailor-resume`, `smart-fit-rewrite`, `agentic-chat`. Badge no longer shows stale hardcoded `/ 8 functions`.
- `EDGE_FUNCTION_AUDIT.md`: new "Editor AI Phase 3" section at top with rollback path (one `supabase functions deploy` command per function, `USE_MERGED_EDITOR_AI=false` flip, migration revert).

**Task #44 — undeployment from Supabase (2026-05-04):**
- Management API `DELETE /v1/projects/jnsfmkzgxsviuthaqlyy/functions/<slug>` executed for all 4 slugs.
- Confirmed absent via `GET /v1/projects/.../functions` at 2026-05-04T21:00:26Z.
- Deployed function count: 74 → 70. Free slots: 26 → 30.
- `scripts/check-edge-functions-deployed.mjs`: orphaned-deployment check upgraded from WARNING to hard `exit 1` to prevent future retired slugs going undetected.
- `EDGE_FUNCTION_AUDIT.md`: "Editor AI Phase 4" section with HTTP response evidence + post-deletion slot count.
- `reports/edge-fn-redeploy-2026-05-03.md`: post-Task-#44 addendum.

**Task #45 — DevKit smoke-test cleanup (2026-05-04):**
- `src/components/dev-kit/DevKitRunner.tsx`: removed 4 legacy smoke test entries that invoked the retired function names directly (`recruiter-simulation`, `suggest-template`, `optimize-for-linkedin`, `analyze-resume`). All 4 are superseded by the `editor-ai-*` tests added in Task #40 (`editor-ai-recruiter-sim`, `editor-ai-suggest-template`, `editor-ai-optimize-linkedin`, `editor-ai-analyze`).

**GitHub sync:**
- Force-pushed `main` from local `3b7cb1b` to `iammagdy/WiseResume-TWC` using `GITHUB_ACCESS_TOKEN` after a merge conflict blocked the UI push. Remote had diverged at `8d39d85`.

**No user-facing changes. No new features. TypeScript: no errors.**

---

## 2026-05-02 — Task #34: Native mobile app rebuild (Expo) + Capacitor removal

Rebuilt the WiseResume mobile client from scratch using **Expo SDK 51** + **Expo Router**. The new client lives at the repo root in `mobile/`, talks to the same Supabase project / Kinde tenant / AI providers as the web app (no second backend), and replaces the previous Capacitor scaffold which is fully deleted from the web repo.

**Capacitor removed from web repo (T001):**
- Deleted `capacitor.config.ts`, `docs/mobile.md`, `scripts/check-mobile-bundle.mjs`, `src/pages/DevToolsStub.tsx`.
- `package.json`: removed `@capacitor/*`, `@capgo/capacitor-native-biometric`, `@capacitor/cli`, and the `mobile:*` + `build:mobile` scripts.
- `vite.config.ts`: dropped the `mode === 'mobile'` `VITE_DISABLE_DEVKIT` rewrite block — web is now web-only.
- `src/AppInterior.tsx`: collapsed the conditional `DevToolsPage` lazy import to its real path; the DevToolsStub branch is gone.
- Stubbed Capacitor consumers so they compile under web-only assumptions (each was a noop branch under `Capacitor.isNativePlatform()` returning `false`): `src/lib/openExternal.ts`, `src/lib/haptics.ts`, `src/lib/html2canvasRetry.ts`, `src/lib/downloadUtils.ts`, `src/hooks/useDeepLinking.ts`, `src/hooks/useBiometricLock.ts`, `src/hooks/useBackButton.ts`, `src/hooks/useAppLifecycle.ts`, `src/hooks/useStatusBar.ts`. Removed the same conditional branches from `src/main.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/EditorPage.tsx`, `src/pages/DevToolsPage.tsx`, `src/components/career/SkillCourseCard.tsx`. `rg @capacitor|@capgo` returns nothing.

**Expo mobile scaffold (T002):**
- `mobile/package.json` — Expo SDK 51 deps (expo-router, expo-auth-session, expo-secure-store, expo-notifications, expo-local-authentication, expo-camera, expo-av, expo-print, expo-file-system, react-native-purchases, @sentry/react-native, @supabase/supabase-js, TanStack Query + persist + MMKV, Zustand, react-hook-form, zod). Scripts for `start`, `android`, `ios`, `build:dev|preview|prod`, `submit:ios|android`, `update`, `lint`, `typecheck`, `test`.
- `mobile/app.config.ts` — env-driven Expo config: bundle id `com.wiseresume.app`, scheme `wiseresume`, associated domains `applinks:resume.thewise.cloud`, full Info.plist usage descriptions (camera, microphone, photo library, Face ID, ATT), Android intent filter for `https://resume.thewise.cloud` with `autoVerify: true`, plugins for `expo-router`, `expo-secure-store`, `expo-local-authentication`, `expo-notifications`, `expo-web-browser`, `expo-image-picker`, `expo-camera`, `expo-av`. `runtimeVersion: { policy: 'appVersion' }` and typed-routes experiment enabled.
- `mobile/eas.json` — `development` (dev client, simulator), `preview` (internal APK / TestFlight), `production` (auto-incremented build numbers, channel-tagged for OTA).
- `mobile/tsconfig.json` (strict, `@/*` path alias), `mobile/babel.config.js` (expo preset + module-resolver + reanimated), `mobile/metro.config.js`, `mobile/.env.example`, `mobile/.gitignore`, `mobile/expo-env.d.ts`.
- Source tree under `mobile/src/`:
  - `lib/config.ts` — typed reader over `Constants.expoConfig.extra`, throws on missing required keys.
  - `lib/secureStore.ts` — async key/value adapter on `expo-secure-store` with web localStorage fallback for development.
  - `lib/supabase.ts` — Supabase client wired to secureStore; `autoRefreshToken: false`, `persistSession: false` (we never hold a Supabase user session — the bridge JWT is the only credential).
  - `lib/auth.ts` — Kinde PKCE flow via `expo-auth-session`, exchanges the Kinde access token for a WiseResume bridge JWT through the existing `token-exchange` edge function. Stores `wr.kinde.token`, `wr.bridge.token`, `wr.bridge.user` in Keychain / Keystore.
  - `lib/api.ts` — `callEdgeFunction<T>()` and `rest<T>()` helpers; both attach `apikey` + bearer bridge JWT, throw a typed `ApiError` on non-2xx.
  - `theme/tokens.ts` — palette + light/dark `ThemeTokens` mirroring the web Tailwind config (Deep Indigo + Warm Amber); spacing, radius, typography scales.
  - `theme/ThemeProvider.tsx` — context that resolves `system | light | dark` against `useColorScheme()` and the persisted user preference.
  - `state/queryClient.ts` — TanStack Query client with MMKV-backed persister (`createSyncStoragePersister`) keyed at `wr.tq.cache.v1`, 24h gcTime, 30s staleTime.
  - `state/settingsStore.ts` — Zustand persisted store for theme, biometric lock, per-category notification prefs, onboarding flag.
  - `state/authStore.ts` — Zustand store for the resolved bridge identity + bootstrap-ready flag.
  - `components/ui/{Button,Input,Card,Screen,EmptyState}.tsx` — primitive components; Button fires `Haptics.impactAsync` on press.
  - `hooks/useMe.ts` (TanStack Query against `me` edge function), `hooks/useResumes.ts` (list + detail + update via PostgREST), `hooks/usePushRegistration.ts` (registers Expo push token with `register-push-token` after sign-in; non-fatal on failure), `hooks/useBiometricGate.ts` (relocks on background after configurable timeout).
- File-based routes under `mobile/app/`:
  - `_layout.tsx` bootstraps SplashScreen, GestureHandlerRootView, SafeAreaProvider, PersistQueryClientProvider, ThemeProvider; rehydrates stored bridge identity.
  - `index.tsx` redirects to `(auth)/onboarding`, `(auth)/sign-in`, or `(tabs)/dashboard` based on identity + onboarding flag.
  - `(auth)/_layout.tsx`, `(auth)/onboarding.tsx` (3-slide swipeable intro), `(auth)/sign-in.tsx` (Kinde-only).
  - `(tabs)/_layout.tsx` (Ionicons tab bar, gates tabs on identity, mounts push registration), `(tabs)/{dashboard,resumes,tracker,interview,profile}.tsx`.
  - Detail screens: `resume/[id].tsx`, `resume/new.tsx`, `job/[id].tsx`, `job/new.tsx`, `interview/[track].tsx` (records voice via `expo-av` and grades via edge fn), `interview/new.tsx`, `cover-letter/{index,new,[id]}.tsx`, `resignation-letter/{index,new,[id]}.tsx`, `settings.tsx`, `paywall.tsx` (lazy-loads `react-native-purchases`, falls back to static pricing in dev), `+not-found.tsx`.

**New backend edge functions (T003):** *(updated post-review: added 2 missing interview endpoints + biometric lock integration + Detox scaffold)*

- `supabase/functions/interview-next-question/index.ts` — auth-required, returns the next question for a track. Pulls from `interview_question_bank` when populated; falls back to a static seed bank per track so a fresh deployment never returns "no questions". Best-effort logs an `interview_attempts` row.
- `supabase/functions/interview-grade-answer/index.ts` — auth-required, charges 1 credit, routes through the shared `aiClient` + `modelRouter` (so cost attribution + provider failover behave like every other AI call), returns strict-JSON `{score, summary, strengths, improvements}` validated by `parseAIJSON`. Refunds the credit on AI failure. Updates the matching `interview_attempts` row.
- Both registered in `supabase/config.toml` with `verify_jwt = false`.

**Biometric lock integration:**
- `mobile/src/components/BiometricLockOverlay.tsx` — full-screen modal that consumes `useBiometricGate` and blocks the entire app when locked. Auto-prompts for Face ID / Touch ID on mount.
- Mounted once at the root inside `mobile/app/_layout.tsx`'s `ThemedShell`, so it covers every navigator including auth and tabs without per-screen wiring.

**Detox E2E scaffold:**
- `mobile/.detoxrc.js` — iOS simulator + Android emulator configurations.
- `mobile/e2e/jest.config.js` and `mobile/e2e/critical-flows.test.ts` covering the six P1 flows from `mobile/QA.md`: cold-start/onboarding, Kinde auth, resumes list+detail, tracker create-job, interview practice, PDF export. Selectors use `testID` props (no copy assertions). Run on a developer workstation with `npx detox test --configuration ios.sim.debug` after `npm install --save-dev detox jest`.

**Original edge function set (T003):**
- `supabase/functions/register-push-token/index.ts` — auth-required upsert into `device_push_tokens` with `(user_id, token)` conflict key.
- `supabase/functions/send-push/index.ts` — service-to-service fan-out via the Expo push API; gated on `EDGE_INTERNAL_TOKEN` header; honors per-category `notification_prefs` JSON column so users get only what they opted into.
- `supabase/functions/revenuecat-webhook/index.ts` — gated on `REVENUECAT_WEBHOOK_AUTH_TOKEN`; maps `INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` / `EXPIRATION` / etc. to plan reconciliation in the existing `subscriptions` table; best-effort write to `billing_events` audit table.
- `supabase/functions/mobile-config/index.ts` — anonymous-read endpoint returning min-supported / latest version, optional banner, feature flags. Compares semver per platform and computes `update_required` / `update_available`.
- `supabase/functions/export-{resume,cover-letter,resignation-letter,portfolio}-pdf/index.ts` — auth-required PDF export skeletons sharing `_shared/pdfRenderer.ts` (calls `PDF_RENDERER_URL`, uploads bytes to the `exports` Storage bucket, returns a 1h signed URL).
- All eight functions registered in `supabase/config.toml` with `verify_jwt = false` (each owns its own auth — `requireAuth` middleware or shared-secret header).

**New additive migration (T004):**
- `supabase/migrations/20260601000000_mobile_device_tokens_and_versions.sql` creates `device_push_tokens` (RLS: self-only) and `mobile_app_versions` (public-read) with seed rows for both platforms at `1.0.0`. Reuses `gen_random_uuid()`, FKs to `profiles(user_id)` with `on delete cascade`, `updated_at` triggers, indexed on `(user_id) where revoked_at is null` and `(platform, updated_at desc)`. Strictly additive — no existing column types touched.

**Universal-link manifests (T005):**
- `public/.well-known/apple-app-site-association` — declares `TEAMID_PLACEHOLDER.com.wiseresume.app` for `/auth/callback*`, `/r/*`, `/p/*`, `/job/*`, `/cover-letter/*`, `/dashboard*` and `webcredentials`.
- `public/.well-known/assetlinks.json` — declares `com.wiseresume.app` for `delegate_permission/common.handle_all_urls` + `get_login_creds` with placeholder Play signing SHA-256.

**Documentation (T006):**
- `mobile/README.md` — stack table, first-time setup, env requirements, auth bridge explanation, deep-link instructions, push notifications overview, in-app purchases, build/submit/OTA workflow, troubleshooting, deferred Phase-2 items.
- `mobile/QA.md` — manual QA matrix scaffold across 6 device classes covering cold-start, auth, dashboard, resumes, tracker, interview, cover/resignation letters, profile/settings, push, payments, universal links.
- `mobile/store/README.md` — required-asset checklist for App Store and Play Console with copy guidelines.
- `mobile/assets/README.md` — placeholder note for icon / splash / adaptive-icon / favicon assets the brand team will drop in.
- Deleted `Project Atlas/01-Currently Implemented/critical-systems/13-mobile-capacitor.md`; replaced with `13-mobile-expo.md` covering the new repo layout, auth bridge, eight edge functions, two new tables, universal links, IAP, push, and explicit Phase-2 deferrals.
- `replit.md` — Mobile bullet rewritten end-to-end (Capacitor → Expo SDK 51 + Expo Router, new edge fns named, migration named, links to README and Atlas card). Bottom-of-file dependency line updated from "Capacitor: Native shell for mobile builds" to "Expo SDK 51: Native shell for the iOS + Android client at `mobile/`".
- `Project Atlas/04-For You (Plain Language)/coming-soon.md` — new "WiseResume on your phone" section in plain language explaining the rebuild, what ships in v1, and what's deferred. Last-verified date bumped to 2026-05-02.

**Deviations from the task brief (per session-plan):**
- Cannot install npm deps for the mobile package in this environment (footprint is multi-GB and requires native toolchains); `mobile/package.json` ships fully-pinned and the user runs `cd mobile && npm install` once on their workstation.
- Edge functions are functional skeletons that own their auth, request validation, and core happy path; the four `export-*-pdf` endpoints intentionally delegate to a headless-Chromium service at `PDF_RENDERER_URL` — we do not ship Chromium inside an edge function.
- No EAS project init, store assets, or screenshots generated (those run on a developer's Mac with the Apple Developer + Play Console accounts).
- No Detox or Maestro tests — Phase 1 ships with the manual QA matrix in `mobile/QA.md`.
- All Phase-2 items (inline section editing, in-app rich PDF preview, Apple Sign-In / Google One-Tap, Live Activities) deferred per the task brief: "after Phase 1 is in store review".

## 2026-05-02 — v3.11.0: Capacitor mobile pipeline + AI cost attribution

Release rolling up Tasks #29, #30, and #31 since v3.10.2. The two user-visible features are the AI cost attribution panel in the admin Dev Kit (Task #29 — see entry below) and the end-to-end Capacitor mobile build pipeline (Task #30 — see entry below). Task #31 is a docs-only Atlas hygiene cleanup that resolved a `09-*` filename collision created by Task #30 and corrected a stale "PWA wrapper" description in `platform-overview.md`. Files touched in the version-bump commit itself: `package.json` (3.10.2 → 3.11.0), `package-lock.json` (top-level `version` field synced), `public/changelog.json` (new v3.11.0 entry, v3.10.2 `latest` flag flipped to `false`), and this `CHANGELOG.md` heading. No code change; per-task code entries are preserved unchanged below.

## 2026-05-02 — Task #30: Capacitor mobile finish-up & first usable build

**Honest framing — the build itself cannot be produced in this Replit environment.** Replit is a Linux container with no Xcode, no iOS Simulator, no Android Studio, and no Android Emulator. `npx cap add ios` requires macOS+Xcode and must run on a developer's Mac; `npx cap add android` requires Android Studio + JDK 17 + Android SDK 34. Per the Steps section of the task brief ("Run a release-mode build for iOS and Android and verify the user can sign in and create a resume on each") — the actual binary production and on-device verification are out of scope for what Replit can do. What this task ships is everything that must be in the repo for those steps to succeed in minutes when run on a properly-equipped machine: configuration, build pipeline, DevKit-exclusion guard, and documentation. Node 22 is already enforced via `package.json#engines.node` so the Capacitor CLI engine warning the brief mentioned does not apply to this environment.

- **`capacitor.config.ts`** — Added a top-of-file doc comment explaining `webDir: 'dist'` semantics, the mandatory `npm run build:mobile` step, and the dev live-reload override workflow. Added a clearly marked, commented-out `server.url` + `server.cleartext` block under `androidScheme: 'https'` so developers can opt into LAN-served live-reload during native dev without restructuring the file. No behavioural change for production builds (block stays commented).
- **`vite.config.ts`** — Switched `defineConfig(() => ...)` to `defineConfig(({ mode }) => ...)` and added a conditional `define` entry: when `mode === 'mobile'`, Vite statically replaces `import.meta.env.VITE_DISABLE_DEVKIT` with the literal string `"true"`. No other modes are affected (web build, dev server, production build all behave identically to before).
- **`src/AppInterior.tsx`** — Replaced the unconditional `lazyWithRetry(() => import("./pages/DevToolsPage"))` with a build-time conditional: when `import.meta.env.VITE_DISABLE_DEVKIT === "true"` (mobile builds), the lazy import resolves to `DevToolsStub` instead. Vite/Rollup dead-code-eliminates the unused branch since the constant is statically replaced, so the entire DevKit chunk graph (`DevToolsPage-*.js` plus its `dev-kit/*Panel-*.js` siblings) is never emitted into `dist/assets/` for a mobile build. No `dev-tools/dev-kit` import path elsewhere in the app is affected; the route at `/devkit` remains routable in both modes.
- **`src/pages/DevToolsStub.tsx`** (new) — 23-line stub that renders a centered "Admin tools unavailable" card with a `<Link to="/">` back to the app. Imports only `react-router-dom` so it adds <1 KB to the mobile bundle and contains no DevKit identifiers (verified by `check-mobile-bundle.mjs`'s substring scan). Kept routable so the SPA never throws a Suspense boundary at `/devkit` if a deep link reaches the binary.
- **`scripts/check-mobile-bundle.mjs`** (new, 130 lines, executable) — Post-build verifier wired into `build:mobile`. Recursively walks `dist/assets/` and fails the build (exit 1) if any of (a) ~15 forbidden filename patterns appear (every DevKit panel module name plus `DevToolsPage` itself) or (b) a JS payload contains DevKit-only string literals (`DEV_KIT_PASSWORD`, `admin-devkit-data`, `admin-ai-routing`, `admin-ai-caps`, `admin-moderation`, `admin-integrations`, `devKitAuthHeaders`). The substring scan is the safety net catching anyone who wires a non-lazy DevKit import from a non-DevKit module. Prints a remediation block on failure pointing at the three most likely root causes.
- **`package.json`** — Added 4 scripts:
  - `build:mobile`: `tsc --noEmit && vite build --mode mobile && node scripts/check-no-sourcemaps.mjs && node scripts/check-mobile-bundle.mjs` — produces and verifies the mobile-targeted `dist/`.
  - `mobile:sync`: `npm run build:mobile && cap sync` — full prep before opening Xcode/Android Studio.
  - `mobile:open:ios` / `mobile:open:android`: thin wrappers over `cap open <platform>` for shell-based handoff into the native IDE.
- **`.gitignore`** — Added `ios/` and `android/` (with a comment block explaining the regenerate-each-time choice). Decision rationale: scaffolds are derivative artifacts, regenerating is reproducible from `capacitor.config.ts`, and committing them would couple the repo to per-developer CocoaPods/Gradle lockfile churn.
- **`docs/mobile.md`** (new, ≤ 60 lines per task brief) — Workflow doc covering: prerequisites (Mac+Xcode for iOS, Android Studio for Android, Node ≥ 22), one-time `npx cap add` setup, production build/sync flow (`npm run mobile:sync`), TestFlight / Play Console internal-testing handoff steps, optional dev live-reload setup (with explicit "never commit uncommented" warning), production backend wiring (apiFnUrl auto-routes to Supabase Edge Functions when not in dev), and an explanation of the DevKit exclusion mechanism.
- **`replit.md`** — Replaced the one-line "Capacitor 8 for native mobile builds" Mobile entry with a fuller paragraph naming `docs/mobile.md`, the `npm run mobile:sync` entrypoint, the gitignored scaffolds, and the DevKit-exclusion contract (env constant + AppInterior swap + verifier script).

**Out of scope (per the task brief itself, repeated here so future agents don't backslide):** App Store / Play Store submission, native plugins beyond what's already declared, push notifications, mobile-specific UI redesign. The Capacitor CLI Node engine warning resolution is owned by the separate "backend hygiene sweep" task.

## 2026-05-02 — Task #29: AI cost attribution panel in DevKit

**Honest framing — the task description is partially wrong.** The brief assumed every AI call already records token usage and a USD cost via an `increment_ai_usage_cost` RPC. The actual schema is: `ai_usage_logs(user_id, action_type, metadata jsonb, created_at, section, resume_id)` — no USD column, no token column, no model column, and no `increment_ai_usage_cost` function (the misleadingly-named migration `20260219141818_*.sql` only adds a `p_cost integer` parameter to the credit-counter RPC, where "cost" means "credits to charge", not dollars). Re-modelling the cost recording is **explicitly out of scope** for this task per the task's own "Out of scope" list. The dashboard is therefore framed as **AI invocation attribution** — 1 row in `ai_usage_logs` = 1 charged credit = the unit the credit ledger already tracks. The panel UI labels this clearly so no admin is misled into thinking the numbers are in dollars.

- **`supabase/migrations/20260524000000_ai_usage_attribution_rpcs.sql`** (new) — Seven `security definer set search_path = public` aggregate RPCs over `ai_usage_logs`, all granted only to `service_role` (revoked from `public, anon, authenticated`):
  - `get_ai_usage_daily_totals(p_start, p_end)` → `(bucket_date date, invocations bigint, distinct_users bigint)` — date-truncated UTC daily series for the sparkline.
  - `get_ai_usage_hourly_totals(p_start, p_end)` → `(bucket_hour timestamptz, invocations bigint)` — hourly fidelity for the `today` range so the sparkline shows real intra-day shape, not a single daily bar.
  - `get_ai_usage_window_total(p_start, p_end)` → `bigint` — single scalar for cheap previous-window delta computation.
  - `get_ai_usage_distinct_users(p_start, p_end)` → `bigint` — **true** window-level distinct user count (union of IDs, not max-of-day) for the KPI strip. The daily-totals RPC's `distinct_users` column is per-day-distinct and undercounts the window total when the same user appears across multiple days; this RPC is the source of truth.
  - `get_ai_usage_top_users(p_start, p_end, p_top_n)` → `(user_id uuid, invocations bigint)` — top-N spenders by invocation count, returns user IDs only (emails resolved in the edge function — see below — to avoid coupling to `profiles.email`, which is conditional per `20260418195800_schema_hardening.sql`).
  - `get_ai_usage_by_feature(p_start, p_end)` → `(action_type text, invocations bigint)` — spend breakdown grouped by `action_type` (e.g. `'tailor_resume'`, `'cover_letter'`, `'interview_prep'`). Coalesces null/empty to `'unknown'`.
  - `get_ai_usage_by_provider(p_start, p_end)` → `(provider text, invocations bigint)` — spend breakdown grouped by upstream AI provider read from `metadata->>'provider'`. Edge functions populate this as `<provider>:<keyIndex>` (e.g. `'openrouter:0'`, `'groq:1'`, `'byok:openrouter'`); the RPC `split_part(..., ':', 1)` collapses the key-slot suffix so the panel groups by provider family rather than per-key. Older calls without a provider tag bucket to `'unknown'` (the panel relabels this as "unknown / not recorded").
- **`supabase/functions/admin-devkit-data/index.ts`** — Added a new top-level `action: 'ai-cost'` branch (placed immediately after the `action`-required guard, before `analytics`). Reuses the existing shared utilities (`requireAdminAuth`, `getServiceClient`, `Range` type, `computeWindow`, `buildEmptyDailySeries`) — no duplication. Behaviour:
  1. Validates `range` against the canonical `('today' | '7d' | '30d' | '90d' | 'all')` whitelist; defaults to `'30d'` for any unknown value.
  2. `requireAdminAuth(req)` (DevKit password gate) — same auth as every other action.
  3. Runs all aggregate RPCs in parallel via `Promise.all`. The hourly-totals call short-circuits to `{data: [], error: null}` for any range other than `today` (so we don't pay for hourly aggregation on a 90-day window). The previous-window `get_ai_usage_window_total` call resolves the same way for `range === 'all'` (no comparison window).
  4. Builds a dense series with zero-fills so the sparkline never lies about gaps: `buildEmptyHourlySeries(...)` for `today` (24 hourly slots) and `buildEmptyDailySeries(...)` for the multi-day windows.
  5. Computes `distinctUsers` from the dedicated `get_ai_usage_distinct_users` RPC (true union of user_ids across the window) instead of the previous max-of-day approximation, which silently undercounted whenever a user appeared on multiple days.
  6. Resolves the top-10 users' emails via `supabase.auth.admin.getUserById(user_id)` in parallel (10 calls max), filtering out synthetic `@kinde.placeholder` shadows the same way the existing admin-users panel does. Falls back to `null` (rendered as `"user <id-prefix>…"` in the panel) on lookup failure rather than failing the whole request.
  7. Returns `{success: true, data: {range, bucket, totals: {current, previous}, distinctUsers, dailySeries, topUsers, byFeature, byProvider, generatedAt}}`. The `dailySeries` `date` field is `YYYY-MM-DD` for daily buckets and `YYYY-MM-DDTHH:00` for the hourly `today` bucket.
  8. Unknown-action error message extended to include `'ai-cost'` so future debugging shows the full action whitelist.
- **`src/components/dev-kit/AICostPanel.tsx`** (new) — DevKit panel mounted under the "Monitor" nav section. Reuses every existing analytics primitive (`RangeSwitcher`, `KpiCard`, `SectionCard`, `RankedList`, `EmptyState`, `useIsMounted`, `useVisibleInterval`, `unwrapAdminResponse`, `formatEdgeError`, `devKitAuthHeaders`) so the visual language matches the other DevKit dashboards exactly. Layout (top-down): page header (title + range switcher + refresh button + last-updated stamp + "auto-refreshes every 2 min" sub), a **prominent blue disclaimer banner** explaining "Cost = AI invocations" and pointing to the exact upgrade path (persist `usage.totalTokens` and a model-priced cost into `ai_usage_logs.metadata`), a 4-card KPI strip (Total invocations with sparkline + prev-period delta · Distinct users · Top feature · Top provider), a Top users `RankedList` (10 rows, email or `user <id-prefix>…` fallback), then a 2-column grid of Spend-by-feature and Spend-by-provider lists. Loading skeletons mirror the AnalyticsPanel ones. Locked state shows the same Lock-icon empty card as other DevKit panels so the unlocked/locked toggle behaves identically.
- **`src/pages/DevToolsPage.tsx`** — Registered the panel: imported `Coins` from `lucide-react` and `AICostPanel` from `@/components/dev-kit/AICostPanel`; added `'ai-cost'` to the `Tab` union; inserted `{ id: 'ai-cost', label: 'AI Cost', icon: Coins }` into the Monitor `NAV_SECTIONS` block (between Analytics and Onboarding so the per-feature analytics dashboards stay grouped); added `'ai-cost': 'AI Cost'` to `TAB_LABELS`; added the mount block under `<DevKitPanelBoundary>` so the existing remount-on-tab-change pattern applies. Also tightened a pre-existing empty `catch { }` block in `detectBiometricMode()` (added a comment explaining the intentional suppression) so the lint clean-room invariant for the touched file is preserved.
- **No Mission Control deep-link card** — the task brief allowed *either* a Mission Control card *or* its own DevKit tab. I chose the dedicated tab because (a) Mission Control is for *system health* signals (DB up, Resend reachable, secrets present) not analytics, and (b) it keeps the new feature self-contained in one panel rather than splitting state across two surfaces.
- **No new edge function, no schema changes to `ai_usage_logs`, no changes to `_shared/rateLimiter.ts` or any AI-routing function.** Every existing pricing-related fixture (`ai_credits.daily_usage`, the credit-counter RPC, BYOK passthrough) is untouched.
- **`Project Atlas/04-For You (Plain Language)/current-features.md`** — added a plain-language entry "See where AI calls are coming from".
- **`Project Atlas/01-Currently Implemented/edge-functions/admin-devkit-data.md`** — bumped Last verified to 2026-05-02; added `'ai-cost'` to the `body.action` discriminator list and listed `AICostPanel` under Related.
- **Out of scope (intentional):** USD cost attribution (would require schema changes the task explicitly excludes); per-model breakdown (model is not stored in `ai_usage_logs.metadata` today); CSV export (the existing AnalyticsPanel does not have one either — would warrant its own "DevKit data export" task to be done consistently across panels).
- **Verification (no live testing per project rule):** `tsc --noEmit` clean (touched: `DevToolsPage.tsx`, `AICostPanel.tsx`); `eslint` clean on both touched files; `deno check supabase/functions/admin-devkit-data/index.ts` clean.

## 2026-05-02 — Task #28: Cover letter template gallery (Classic / Modern / Compact / Creative)

- **`src/components/cover-letter/templates/ClassicTemplate.tsx`** (new) — Plain serif preview component, mirrors the legacy whitespace-pre-wrap card so existing letters look identical when migrated to the `'professional'` style.
- **`src/components/cover-letter/templates/ModernTemplate.tsx`** (new) — Sans-serif preview with bold accent header band (`text-primary` underline rule), tighter leading.
- **`src/components/cover-letter/templates/CompactTemplate.tsx`** (new) — Smaller font + tighter leading + inline contact line variant for one-page layouts.
- **`src/components/cover-letter/templates/CreativeTemplate.tsx`** (new) — Two-column header (sender block left, recipient block right) with accent-coloured greeting.
- **`src/components/cover-letter/templates/registry.ts`** (new) — Exports `COVER_LETTER_TEMPLATE_OPTIONS` (4 visible tiles: Classic→`'professional'`, Modern→`'modern'`, Compact→`'compact'`, Creative→`'creative'`) and `resolveCoverLetterTemplate(value)` which returns `null` for null/empty/unknown so callers fall back to the legacy plain renderer. Legacy `'minimal'` rows are aliased to `ClassicTemplate` so old data stays renderable without surfacing the dead value in the picker.
- **`src/components/cover-letter/CoverLetterPreview.tsx`** (new) — Wrapper component used by both the New and Edit pages. Picks a template renderer via `resolveCoverLetterTemplate(letter.template_style)`; when no renderer is resolved (null/empty `template_style`), falls back to a `<Card>` with `whitespace-pre-wrap` text identical to the pre-task layout — guaranteeing zero visual change for legacy untagged letters.
- **`src/pages/CoverLetterNewPage.tsx`** — Style picker switched to `COVER_LETTER_TEMPLATE_OPTIONS` (4 tiles in `grid-cols-2 sm:grid-cols-4`); container now `role="radiogroup"` with `aria-labelledby`; each tile is `role="radio"` with `aria-checked`, an `aria-label` of the form `"<Name> cover letter template — <description>"`, `min-h-[44px]`, and `focus-visible:ring-2 ring-ring ring-offset-2` for keyboard a11y; click handler is idempotent (early-return when the same style is reselected); result preview now renders via `<CoverLetterPreview>`.
- **`src/pages/CoverLetterEditPage.tsx`** — Stored cover-letter preview now renders via `<CoverLetterPreview>` (passes `letter.template_style`, which may be null → fallback). Added a 4-tile style switcher beneath the preview using the same a11y + radiogroup pattern. Selection rule was chosen so the picker state always matches the rendered preview: `null`/empty → no tile selected (preview = legacy plain fallback) plus a small "No style set — pick one to apply" hint inline with the Style label; `'minimal'` → Classic tile selected (registry aliases `'minimal'` → `ClassicTemplate` so preview is Classic); known values → matching tile selected. Click handler is idempotent (skips the write only when `raw === t.value`, so clicking Classic on a `'minimal'` row still migrates the row to `'professional'`); buttons are `disabled` while a write is in flight to make rapid double-taps safe even before the query refetches.
- **`src/components/cover-letter/CoverLetterCard.tsx`** — Added a subtle outline `<Badge>` on the card showing the user-facing style label (`'minimal'` displayed as "Classic"; `null`/empty displayed as no badge so legacy cards look identical). The icon container is now a per-style mini-thumbnail giving an at-a-glance visual signature of the chosen template (Classic = primary accent rule on top, Modern = solid primary fill, Compact = scaled-down icon, Creative = primary→accent gradient). Null/unknown `template_style` keeps the original `bg-card border` look so legacy cards are byte-identical to before.
- **`src/pages/CoverLetterEditPage.tsx`** — Tightened accent resolution: when the cover letter's linked resume isn't in the user's resume list (`resumes.find(r => r.id === letter.resume_id)` returns `undefined`), the preview now passes `accentHex={undefined}` instead of falling back to `resumes[0]`'s accent, which could surface an unrelated resume's accent colour and pass an unexpected shape to `dbToResumeData` if invariants shifted.
- **`src/lib/coverLetterPdfGenerator.ts`** — Extended `TemplateStyle` union from `'professional' | 'modern' | 'minimal'` to also include `'compact' | 'creative'`. Added `renderCompact()` (smaller font sizes + tighter line height + inline contact line) and `renderCreative()` (two-column header — sender left, recipient right — with accent-coloured greeting). `generateCoverLetterPDF` switched to a `switch (templateStyle)` so the legacy `'professional' | 'modern' | 'minimal'` paths are preserved unchanged and the two new values route to the new renderers; default falls back to `renderProfessional`.
- **`src/hooks/useCoverLetters.ts`** — `duplicateCoverLetter` insert payload now spreads `template_style` from the original row (only when set) so duplicating a Modern/Compact/Creative cover letter no longer silently reverts to the `'professional'` column default. Legacy null rows continue to insert without the field, preserving the column's default behaviour.
- **Backend wiring**: no migration. `template_style` was already plumbed end-to-end before this task (column added in `supabase/migrations/20260214172249_*.sql` defaulting to `'professional'`; `useCoverLetters` hook interface; `accountBackup.ts` whitelist; `generate-cover-letter/index.ts` request body + DB insert). This task is frontend-only and reuses the existing column without widening it (`compact`/`creative` are stored as plain text and read back unchanged — no enum constraint to migrate).

## 2026-05-02 — Task #24: Explicit `WISE_ENV` for admin DevKit environment detection

- **`supabase/functions/admin-devkit-data/index.ts`** — `isDevEnvironment` now reads the explicit `WISE_ENV` Supabase Edge Function secret first. Resolution: `WISE_ENV?.trim().toLowerCase() === 'production'` ⇒ production; any other non-empty value ⇒ dev; only when `WISE_ENV` is unset does it fall back to the legacy `!Deno.env.get('DENO_DEPLOYMENT_ID')` heuristic. The fallback is preserved as a backstop so a missed secret on a fresh project does not break the panel, but the heuristic is no longer the source of truth. The downstream `classifySecretSource(...)` and the `isDevEnvironment` field on the JSON envelope returned to `MissionControlPanel.tsx` are unchanged.
- **`reports/audits/2026-05-02-supabase-backend-audit.md`** — appended a `Status (Task #24, 2026-05-02)` note under M-1 documenting the code change and the out-of-band requirement to set `WISE_ENV=production` in the production Supabase project (and `WISE_ENV=dev` in non-prod projects).
- **`replit.md`** — added a User Preferences entry naming `WISE_ENV` as the canonical per-environment marker for env-aware Edge Function code, with the dev/prod values and the warning that the `DENO_DEPLOYMENT_ID` fallback is an undocumented Deno Deploy detail and must not be relied on long-term.
- **`Project Atlas/01-Currently Implemented/edge-functions/admin-devkit-data.md`** — added an Environment-detection section describing the new `WISE_ENV` precedence and the operational requirement; bumped Last verified to 2026-05-02.
- **Operational follow-up (not a code change):** `WISE_ENV` must be set as a Supabase Edge Function secret in each Supabase project — `production` in prod, `dev` elsewhere. Until set, behaviour is unchanged from before this task.

## 2026-04-30 — v3.10.2: DevKit per-slot AI model selection + Act As dialog upgrade

- **Per-slot AI test model selection (Bugs #6 + #7)**:
  - **`supabase/functions/_shared/modelDefaults.ts`** — new shared module exporting `AI_TEST_MODEL_ALLOWLIST` (curated allow-list per provider — 6 OpenRouter models, 5 Groq, 3 DeepSeek), `AI_TEST_DEFAULT_MODELS` (provider → default), and `resolveAITestModel()` helper.
  - **`supabase/functions/ai-test/index.ts`** — accepts optional `model` body field. Resolution precedence: validated request model → validated persisted per-slot model → provider default. Returns the resolved model in the response so the UI can display what was actually called.
  - **`supabase/functions/inspect-ai-keys/index.ts`** — GET returns saved per-slot models + `modelOptions` + `defaults`. New POST `{provider, slot, model}` persists the choice via the atomic RPC. Empty POST falls through to GET so `supabase-js`'s default POST `functions.invoke()` works without forcing method.
  - **`supabase/migrations/20260517000001_ai_test_slot_models_rpc.sql`** — `set_ai_test_slot_model(slot_key, model)` SECURITY DEFINER RPC with atomic JSONB merge (`INSERT ... ON CONFLICT DO UPDATE ... ||`), preventing lost updates across concurrent admin edits to different slots. Granted to `service_role` only.
  - **`src/components/dev-kit/AIKeySlotPanels.tsx`** — added shadcn `Select` dropdown per slot, optimistic update + rollback on persistence failure, hydration from `slotModels`, and `result.model` rendering in the "Last test result" line for both success and failure paths.

- **Act As dialog with copyable link, Open button, and live countdown (Bug #3)**:
  - **`src/components/dev-kit/ActAsDialog.tsx`** — new dialog component. Read-only `Input` + Copy button (with brief inline "Copied" indicator), explicit "Open in new tab" button (predictable popup-blocker behavior), live mm:ss countdown recomputed every 1s from `expires_at` (drift-free across tab sleep), tone shifts neutral → amber ≤2min → destructive ≤30s, auto-close + expired toast at 0:00. `BroadcastChannel('wr_act_as')` listener moved here, scoped to dialog open lifetime so channels don't leak.
  - **`src/components/dev-kit/AdminUsersPanel.tsx`** — `handleImpersonate` no longer calls `window.open` or registers a BroadcastChannel directly; it just sets `actAsSession` state and lets the new dialog drive the flow. Backend (`admin-impersonate`, `/act-as` route, `startImpersonation`) unchanged.

- **`package.json`** — version bumped `3.10.1` → `3.10.2`. **`package-lock.json`** — version field synced from out-of-date `3.10.0` → `3.10.2` (root `version` only; dependency `version` lines untouched).
- **`public/changelog.json`** — added v3.10.2 entry with two-item summary (model selection + Act As dialog); v3.10.1 `latest` set to `false`.

## 2026-04-30 — v3.10.1: Act As tab flow rewrite

- **`src/components/dev-kit/AdminUsersPanel.tsx`** — `handleImpersonate`: changed `action: 'create_link'` → `action: 'start'`; response type changed from `{ otp, email, user_id }` to `{ access_token, email, user_id, expires_at }`; URL changed from `/act-as?t=<otp>` to `/act-as#<btoa(JSON({t,u,e,x}))>`; removed `popup.closed` polling; added `BroadcastChannel('wr_act_as')` listener for `session_ended` event keyed on `userId`.
- **`src/pages/ActAs.tsx`** — complete rewrite: no longer calls `/api/fn/admin-impersonate-claim` (Express-only endpoint that doesn't exist in production); instead reads credentials from `window.location.hash` via `atob()` + `JSON.parse()`; `useRef` guard prevents StrictMode double-execution; `history.replaceState` strips hash before navigating; navigates to `/dashboard` (not `/`) so `ActingAsBanner` renders immediately in `AppShell`.
- **`src/components/layout/ActingAsBanner.tsx`** — added `broadcastSessionEnd()` helper that posts `{ type: 'session_ended', email, userId }` on `BroadcastChannel('wr_act_as')`; called on explicit exit (`handleExit`), on session expiry (timeout callback), and via `beforeunload` listener in new-tab mode; all `window.close()` calls preserved for new-tab exit paths.
- **Root cause of old flow breaking in production**: `apiFnUrl('admin-impersonate-claim')` in production resolves to `${SUPABASE_URL}/functions/v1/admin-impersonate-claim` — an edge function that does not exist. The old OTP store (`_actAsOtpStore`) was Express server memory, which is dev-only. The `create_link` action on the production `admin-impersonate` edge function fell through to the `start` path, returning `access_token` (not `otp`), making the URL `/act-as?t=undefined`.
- **Root cause of `popup.closed` false positive**: Replit workspace preview runs inside a sandboxed `workspace_iframe.html`. When code inside a sandboxed iframe opens a popup via `window.open()`, the `.closed` property can return `true` immediately due to cross-origin sandbox restrictions on the window reference.
- **`public/changelog.json`** — added v3.10.1 entry; v3.10.0 `latest` set to `false`.
- **`package.json`** — version bumped `3.10.0` → `3.10.1`.

## 2026-04-30 — Edge function slot consolidation: 12 → 3 (Task #5)

- **Why** — The Supabase free plan enforces a hard 100-function cap. The project had hit the ceiling, blocking any new deployments. 12 functions across three logical groups were individually deployed but shared identical auth, shared utility code, and differed only in the action they performed — a natural fit for router consolidation.
- **`supabase/functions/parse-job/index.ts`** — new merged function. Routes on `body.action: 'url' | 'text' | 'linkedin'`. Replaces `parse-job-url`, `parse-job-text`, `parse-linkedin`. All per-action rate-limit, credit-check, AI-routing, and SSRF-protection logic copied verbatim into separate handler blocks.
- **`supabase/functions/admin-devkit-data/index.ts`** — new merged function. Routes on `body.action: 'analytics' | 'observability' | 'live-activity' | 'mission-control' | 'github-status'`. Observability sub-routing uses `body.obs_action` to avoid conflict with the outer discriminator. Replaces `admin-analytics`, `admin-observability`, `admin-live-activity`, `admin-mission-control`, `admin-github-status`.
- **`supabase/functions/admin-email/index.ts`** — new merged function. Routes on `body.module: 'resend-stats' | 'resend-sync' | 'email-actions' | 'broadcast'`. Internal `action` fields per module are preserved unchanged. Audit log for email-actions preserved: `action = the_action_name` (e.g. `resend_confirmation`), metadata includes `admin_email`, `audit_user_id_source`, `target_email`, `custom_subject` (send_custom only), `message_id`, `sent_at`. Replaces `admin-resend-stats`, `admin-resend-sync`, `admin-email-actions`, `admin-broadcast`.
- **12 old function directories deleted** from `supabase/functions/`: `parse-job-url`, `parse-job-text`, `parse-linkedin`, `admin-analytics`, `admin-observability`, `admin-live-activity`, `admin-mission-control`, `admin-github-status`, `admin-resend-stats`, `admin-resend-sync`, `admin-email-actions`, `admin-broadcast`.
- **`supabase/config.toml`** — replaced 12 old `[functions.*] verify_jwt = false` entries with 3 new ones: `[functions.parse-job]`, `[functions.admin-devkit-data]`, `[functions.admin-email]`.
- **Frontend call sites updated (15 files):**
  - `src/components/applications/AddApplicationSheet.tsx` — `apiFnUrl('parse-job-url')` + `{ url }` → `apiFnUrl('parse-job')` + `{ action: 'url', url }`
  - `src/lib/aiTailor.ts` — `parse-job-url` (action:url) + `parse-job-text` (action:text)
  - `src/components/dashboard/CreateResumeDialog.tsx`, `src/components/settings/ProfileImportSheet.tsx`, `src/pages/OnboardingPage.tsx` — `parse-linkedin` → `parse-job` with `action: 'linkedin'`
  - `src/components/dev-kit/AnalyticsPanel.tsx`, `OverviewPanel.tsx` → `admin-devkit-data` (action: analytics)
  - `src/components/dev-kit/ObservabilityPanel.tsx` → `admin-devkit-data` with `obs_action` for sub-routing (3 invocations)
  - `src/components/dev-kit/LiveActivityPanel.tsx`, `UserDetailDrawer.tsx` → `admin-devkit-data` (action: live-activity)
  - `src/components/dev-kit/MissionControlPanel.tsx`, `DeploymentPanel.tsx` → `admin-devkit-data` (action: mission-control / github-status)
  - `src/components/dev-kit/EmailAutomationsPanel.tsx` → `admin-email` (module: resend-stats / resend-sync, 4 invocations)
  - `src/components/dev-kit/EmailManagementPanel.tsx` → `admin-email` (module: email-actions, 3 invocations)
  - `src/components/dev-kit/OwnerOpsPanel.tsx` → `admin-email` (module: broadcast / email-actions, 5 invocations)
- **DevKit error messages** in `MissionControlPanel.tsx`, `EmailAutomationsPanel.tsx`, `EmailManagementPanel.tsx` updated to reference new function names.
- **Type fixes in `parse-job/index.ts`** — removed unnecessary `as any` on `validation.errorCode` (field already in declared return type); typed `extractedData` as `Record<string, unknown> | null` instead of `any`.
- **Deployment** — 12 old functions deleted via Supabase Management API (`DELETE /v1/projects/{ref}/functions/{slug}`, HTTP 200 for all 12). 3 merged functions deployed via `npx supabase functions deploy`. Slot count: 100 → 91.
- **Bonus: 8 previously-never-deployed functions brought live** — with 9 newly freed slots, `admin-check-access`, `admin-onboarding-funnel`, `admin-rotate-totp`, `hard-purge`, `send-resume-reminder`, `wisehire-bulk-screen`, `wisehire-invite-reminder`, `wisehire-mask-cvs` were deployed for the first time. Slot count: 91 → 99. Free slots remaining: 1.
- **`node scripts/check-edge-functions-deployed.mjs`** exits 0 post-deployment (99 local / 99 deployed).

---

## 2026-04-26 — Branded email verification, welcome email & password reset flow (Task #22)

- **Why** — Email/password sign-ups were granted full platform access with no identity confirmation step. There was no branded verification email, no way for users to reset passwords via a styled email, and no welcome email to greet new users.
- **DB migration `supabase/migrations/20260515000001_email_verification.sql`** — adds `email_verified BOOLEAN NOT NULL DEFAULT false` to `public.profiles`; backfills all pre-existing rows to `true`; creates `public.email_verification_tokens(id uuid PK, user_id uuid FK→profiles, token text UNIQUE, expires_at timestamptz, used_at timestamptz, created_at timestamptz)` with RLS enabled (service-role bypass).
- **`server/schema.ts`** — added `emailVerified` boolean field on `profiles` table; added `emailVerificationTokens` table; `npm run db:push --force` applied changes to dev DB.
- **`supabase/functions/_shared/email-templates/welcome.tsx`** — new React Email template: navy/red brand, feature grid (4 icons), "Go to dashboard" CTA button, warm onboarding tone.
- **`supabase/functions/verify-email/index.ts`** — new edge function (public, `verify_jwt=false`). Three actions: `send` (generates UUID token, writes to `email_verification_tokens` with 24h TTL, sends branded verification email via Resend); `resend` (requires Supabase bearer token, invalidates old token, sends a fresh one); `confirm` (validates token not expired/used, sets `profiles.email_verified=true`, marks token `used_at`).
- **`supabase/functions/send-password-reset/index.ts`** — new edge function (public). Calls `supabase.auth.admin.generateLink({ type: 'recovery', email })`, sends branded `recovery.tsx` email via Resend containing the Supabase recovery link.
- **`supabase/functions/_shared/provisionUser.ts`** — upsert now writes `email_verified` from Kinde payload on first provision. For existing users: only writes `true` (never downgrades a verified account). SSO users (Google/Apple) arrive with `emailVerified=true`; `@kinde.placeholder` emails are treated as SSO and skip verification.
- **`supabase/functions/kinde-webhook/index.ts`** — fires `verify-email` edge function (action=`send`) as fire-and-forget for newly created non-SSO users (real email address, `emailVerified=false`).
- **`src/components/layout/ProtectedRoute.tsx`** — gates unverified users (`profile.email_verified === false` AND real email) to `/auth/verify-email`; SSO/placeholder emails bypass the gate.
- **`src/pages/AuthVerifyEmailPage.tsx`** — rebuilt with four states: `pending` (check inbox + resend), `confirming` (token being validated), `confirmed` (success, auto-redirect to `/`), `error` (token invalid/expired, offer resend). Calls `edgeFunctions.functions.invoke('verify-email', { body })` for both `confirm` and `resend` actions.
- **`src/pages/AuthPage.tsx`** — new `?mode=forgot-password` branch renders an email-entry form. Submits via `edgeFunctions.functions.invoke('send-password-reset', { body })` (works in dev via Express proxy and in production via direct Supabase URL — no Express dependency). Fixed `FormEvent` import to avoid namespace error.
- **No change to** Kinde password management (Kinde still owns the credential; Supabase recovery link resets the shadow-auth password only), token-exchange flow, or existing credit/plan logic.

---

## 2026-04-25 — DevKit login recovery: rotate password, redeploy verify-dev-kit, surface diagnosable errors (Task #25)

- **Why** — After back-to-back DevKit auth changes (password rotation, TOTP removal, `verify-dev-kit` redeploy), the admin (`Magdy.saber@outlook.com`) could no longer sign in at `/devkit`. Every attempt returned the catch-all "Incorrect email or password — try again." string regardless of the actual failure cause, so it was impossible to tell from the UI whether the password was wrong, the `DEV_KIT_PASSWORD` Supabase secret was stale, the lockout cooldown was active, or the function itself was undeployed. Underlying cause turned out to be a stale `DEV_KIT_PASSWORD` Supabase secret on the project — the function on production was rejecting every guess as a wrong password — but the UI gave us no way to confirm that without reading edge logs.
- **Supabase secret rotated** — Pushed a new `DEV_KIT_PASSWORD` value (collected from the admin via the Replit secret-request flow, never typed into chat) to the Supabase project (`jnsfmkzgxsviuthaqlyy`) via `POST https://api.supabase.com/v1/projects/$PROJECT_REF/secrets`. Verified afterward via `GET .../secrets` that `DEV_KIT_PASSWORD` is present with a fresh `updated_at`. The local `NEW_DEV_KIT_PASSWORD` Replit secret used as the transport is no longer needed; the value lives in Supabase only.
- **Lockout swept** — Queried `public.rpc_rate_limits WHERE endpoint = 'devkit-login-fail' AND ip_address = 'magdy_saber_outlook_com'` (the lockout key the function derives by lowercasing the email and replacing every non-`[a-z0-9]` character with `_`). Pre-existing rows for that key: 0 (the failures the admin saw were password-mismatch-against-stale-secret responses, not lockout-induced 429s). One transient row created by the post-deploy wrong-password verification was also deleted, leaving the admin with a clean slate.
- **`verify-dev-kit` redeployed** — `npx supabase functions deploy verify-dev-kit --project-ref jnsfmkzgxsviuthaqlyy` redeployed the live function so it matches the current `main` source (post-TOTP-removal) and immediately picks up the new `DEV_KIT_PASSWORD` env var on cold start. Verified end-to-end with two direct `POST /functions/v1/verify-dev-kit` calls: a wrong-password call returned `200 { success: false }` and a correct-password call returned `200 { success: true, token: <165 chars>, session_id: <uuid>, expires_at }`.
- **`src/pages/DevToolsPage.tsx`** — `DevKitLoginForm.handleUnlock` no longer routes the verify-dev-kit call through `edgeFunctions.functions.invoke`. The wrapper consumes the response body for every non-2xx status before the caller can inspect it, which silently masked both the lockout 429 (the `data?.locked` branch never fired in practice) and every 500-level config-drift response behind a generic toast. Replaced with a direct `fetch(apiFnUrl('verify-dev-kit'), ...)` using `EDGE_FUNCTIONS_ANON_KEY` for the gateway, then mapped each status:
  - **200 + `success:true`+ `token`** → mint session and unlock (unchanged behaviour).
  - **200 + `authorized:false`** → "This email is not authorised for admin access." (unchanged).
  - **200 + `success:false`** (wrong password) → "Incorrect email or password — try again." (unchanged generic).
  - **429 + `locked:true`** → start the lockout countdown using `retry_after_seconds` from the body. Previously broken: 429 went through the wrapper's error path and never reached the countdown UI.
  - **500 + `error: 'DEV_KIT_PASSWORD secret is not configured.'`** → "DEV_KIT_PASSWORD is not set in Supabase secrets — ask the deploy owner to push it."
  - **500 + `error: 'ADMIN_EMAILS secret is not configured.'`** → "ADMIN_EMAILS is not set in Supabase secrets — admin allowlist is empty."
  - **500 + `error: 'Failed to issue session'`** → "Could not create an admin session. Check the admin_sessions table and service-role key."
  - **Any other 5xx** → "Login service unavailable — check the verify-dev-kit edge function deploy." (the new fallback the task asked for, so a future config drift is diagnosable from the login screen alone).
  - **404** → existing "Verification function not found" toast.
  - **400** → surfaces the function's body error string (e.g. "Email and password are required").
  - **Network failure** (DNS / offline / CORS preflight blocked) → "Cannot reach the verification service" toast.
- **What this does NOT change** — No change to the function source itself (`supabase/functions/verify-dev-kit/index.ts`), the `admin_sessions` table, the rate-limit thresholds (`MAX_FAILURES = 5`, `LOCKOUT_WINDOW_SECONDS = 600`), the email allowlist (`ADMIN_EMAILS`), the biometric / WebAuthn auto-unlock paths, or the existing CHANGELOG/Atlas governance rules. No new endpoints. No client-side persistence change.
- **Verification** — `npx tsc --noEmit -p tsconfig.json` clean. End-to-end: wrong-password POST → `{success:false}`, correct-password POST → `{success:true, token, session_id, expires_at}`. The admin can now sign in at `/devkit` with the new password they supplied.

---

## 2026-04-23 — Restore Phase 8 production edge-function routing — fix Sign-in Incomplete on live site (Task #4)

- **Why** — The Phase 8 contract in `src/lib/apiFnUrl.ts` (originally shipped 2026-04-21 to fix exactly this regression on `resume.thewise.cloud`) was reverted to "always returns relative `/api/fn/<name>`" with the comment "Express is always present on Replit." That assumption is false: production is a Hostinger static FTPS deploy of `dist/` (`.github/workflows/deploy.yml`), with no Express server. `public/.htaccess` rewrites every non-existent path to `index.html`, so `POST /api/fn/token-exchange` on the live site returned the SPA HTML with `200 OK + text/html`, the bridge's `await res.json()` in `src/lib/supabaseBridge.ts:exchangeToken` threw on the HTML, the Kinde→Supabase exchange was marked failed, `supabaseSettled && !supabaseReady` flipped true, and every signed-in user saw the "Sign-in incomplete" card from `src/components/layout/ProtectedRoute.tsx`. The same broken pattern silently affected every other client edge-function call routed through `apiFnUrl()` (AI features, portfolio chat/contact, analytics, short-link redirects).
- **`src/lib/apiFnUrl.ts`** — restored to the Phase 8 environment-aware behavior: dev (`import.meta.env.DEV`) returns `/api/fn/<name>` so Vite continues to proxy to Express on `:5001` for the local profile-upsert side effects; production returns `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/<name>` so the static Hostinger deploy calls Supabase Edge Functions directly. Defensive fallback to the relative path remains when `SUPABASE_URL` is empty (unreachable in a proper PROD build because `src/lib/supabaseConstants.ts` throws on missing `VITE_SUPABASE_URL`). Header comment rewritten to spell out the Hostinger-static reality, the Phase 8 contract, and an explicit "do not revert again" warning.
- **`src/lib/supabaseBridge.ts`** — updated the stale comment above `exchangeToken` (previously "Routes through the Express server proxy at /api/fn/token-exchange") to accurately describe the dev-vs-prod split and reference the Phase 8 doc. Behavior is unchanged — the call already used `apiFnUrl(...)`, so it picks up the routing fix automatically.
- **`src/integrations/supabase/edgeFunctions.ts`** — same comment correction on the `edgeFunctions.functions.invoke` wrapper used by every authenticated client edge-function call.
- **`replit.md`** — updated the bullet under "Replit Deployment" that incorrectly claimed `apiFnUrl.ts` "always returns relative paths" so the doc matches the restored behavior, and added a "do not revert" note pointing at the Phase 8 stability-fix card.
- **No server-side change** — every function in `supabase/config.toml` is `verify_jwt = false`, auth is enforced inside each function (Kinde JWKS for `token-exchange`, `requireAuth` for the rest), CORS already allow-lists `https://resume.thewise.cloud`, and CSP `connect-src` already includes `https://*.supabase.co`. No `.htaccess`, edge-function, or `token-exchange` changes required.
- **Verification** — `npx tsc --noEmit` clean. Production-mode `vite build` (with `VITE_SUPABASE_URL=https://jnsfmkzgxsviuthaqlyy.supabase.co`) clean; the emitted `dist/assets/index-*.js` contains the runtime ternary `import.meta.env.DEV ? "/api/fn/${e}" : "${SUPABASE_URL}/functions/v1/${e}"`, so prod calls hit Supabase directly while dev keeps using the Express proxy. The dev workflow boots and `apiFnUrl('token-exchange')` still resolves to `/api/fn/token-exchange` against Vite → Express on `:5001`. End-to-end live-site verification (sign-in on `resume.thewise.cloud` after the next `Deploy to Hostinger` workflow run) is a manual operator step in the task.

---

## 2026-04-21 — Restore the exact editing spot after refresh and warm the dashboard from cache (Task #44)

- **Why** — Two related papercuts on the busiest pages. (1) Every editor refresh — accidental, browser-driven, or the Phase 9 silent stale-chunk recovery — landed the user back on the Contact step at scroll-top with every AI sheet closed. The Zustand resume-store persistence already kept *resume content* across refreshes, but *UI state* (active stepper tab, scroll position inside that tab, open AI dialog) was thrown away. The legacy `beforeunload` "you have unsaved changes" prompt made this worse by blocking the silent recovery and nagging the user on every safe refresh. (2) Dashboard cold loads always painted the skeleton + re-issued the Supabase `select * from resumes` query and the per-resume background ATS scoring, even when nothing had changed since last visit, because React Query's in-memory cache and `useResumeScore`'s in-memory `Map` were both gone after a hard refresh.
- **`src/lib/editorSession.ts`** (new) — single `sessionStorage` key (`wr-editor-session`) holding `Record<resumeId, EditorSession>` with `activeTab`, `scrollByTab` (per-tab scroll offsets, `more:${moreSubSection}` keys for the More tab), `moreSubSection`, `openSheet` (typed `EditorSheetId` union covering all 17 sheets surfaced by `EditorPage`), and `updatedAt`. 24 h TTL on read; map capped at 20 most-recent resumes by `updatedAt` so storage cannot grow unbounded. `clearEditorSession(resumeId)` for the `?fresh=1` escape hatch and `clearAllEditorSessions()` for sign-out / user-id change.
- **`src/lib/persistedQueryCache.ts`** (new) — tiny `localStorage` envelope (`{ v: 1, t, data }`) under a `wr-pcache:` namespace, with a 24 h TTL and a 256 kB per-entry cap (oversized payloads silently skipped rather than truncated). `clearAllPersistedCaches()` walks every key in the namespace.
- **`src/pages/EditorPage.tsx`** —
  - Added a *restore-once-per-resume* effect gated by `sessionRestoredRef`. It runs after `currentResume` hydrates, applies the saved `activeTab` / `activeSection` / `moreSubSection`, opens the saved AI sheet via a `sheetSetters` map (the single source of truth that maps each `EditorSheetId` to its `setShow*` setter), and restores the saved scroll offset on the next animation frame with up to 20 retries (since the lazy section component may not have mounted yet). It also flips the existing `hasAutoScrolled` ref to `true` so the mobile auto-scroll-to-first-input doesn't clobber the restored position.
  - Added a *persist-on-change* effect that serialises `{ activeTab, moreSubSection, openSheet }` whenever any of them changes — but only after the first restore has run, so persist cannot race the restore and overwrite it with cold-boot defaults.
  - Added a 250 ms-throttled `scroll` listener on `scrollContainerRef` that writes the current `scrollTop` keyed by `lastScrollKeyRef.current` (the active tab, or `more:${moreSubSection}` when in the More tab).
  - Honors `?fresh=1` as an explicit escape hatch: clears the saved session for this resume id and consumes the URL param via `setSearchParams(..., { replace: true })` so a refresh after the bounce doesn't keep wiping the freshly-saved state.
  - Made the `beforeunload` "you have unsaved changes" prompt refresh-aware rather than dropping it. A capture-phase `keydown` listener records the timestamp of the last F5 / Ctrl+R / Cmd+R keypress; the `beforeunload` handler skips the prompt if a refresh keypress fired within the last 2 s. Tab-close and external navigation still trigger the prompt as before. The browser refresh button is not detectable from JS, but the keyboard shortcut is by far the dominant refresh path, and the restore puts the user back where they were anyway. The in-app navigation guard (`useUnsavedChangesGuard`) is unchanged.
  - Hoisted the existing `hasAutoScrolled` `useRef` above the new restore effect so the restore can suppress the mobile auto-scroll without forward-referencing.
- **`src/hooks/useExpandedEntryRestore.ts`** (new) — drop-in replacement for `useState<string | null>(null)` in entry-list section components. First read for a (resume, section) pair pulls from `editorSession.expandedBySection[section]`; subsequent state changes write back through `writeEditorSession`. Wired into `ExperienceSection`, `EducationSection`, `ProjectsSection`, `PublicationsSection`, `ReferencesSection`, `VolunteeringSection`, `CertificationsSection`. So a refresh re-expands the same Experience / Education / Project card the user had open. The unrelated `useState` import lines that became unused were removed at the same time.
- **`src/lib/editorSession.ts`** — extended `EditorSession` with `expandedBySection: Record<string, string | null>`. The `writeEditorSession` merger deep-merges the field so a per-section write doesn't clobber the others.
- **AI dialog draft state** — Tailor's job description (the largest in-flight draft) already persists via the Zustand resume store (`src/store/resumeStore.ts:379`), and the Tailor sheet's "tips dismissed" + custom-instructions inputs persist via `localStorage`. Re-opening the saved sheet on refresh therefore restores their drafts automatically — no per-sheet draft serialisation needed.
- **`src/hooks/useResumes.ts`** — `useResumes` now reads a per-`user.id`-scoped `resumes:${userId}` entry via `placeholderData: () => readPersistedCache<DatabaseResume[]>(cacheName)`, so the dashboard paints cards immediately on a hard refresh while the live Supabase query revalidates in the background. **Cache writes happen only inside the queryFn**, which always sees the raw `DatabaseResume[]` — there is deliberately no observer-side `useEffect` that mirrors `query.data` to the cache, because callers that pass a `select` (e.g. `BottomTabBar`, `DesktopNav`, `AIStudioPage`) would otherwise corrupt the shared per-user snapshot with their transformed/subset value. `placeholderData` keeps `isPlaceholderData: true` until the live fetch lands, so any caller that wants to gate behaviour on "is this really live" can still tell.
- **`src/hooks/useResumeScore.ts`** — the in-memory `scoreCache` now hydrates from `wr-pcache:scoreCache` at module load (TTL'd entries only) and persists every write through a 250 ms-throttled batch (`persistScoreCacheSoon`), capped at 50 most-recent entries by `t`. Both existing `scoreCache.set(...)` call sites (foreground re-score and background fan-out) are paired with a `rememberScoreCacheWrite(key)`. `clearCachedScore` and a new `clearAllCachedScores` keep the in-memory map, the per-key write-time map, and the localStorage entry consistent. The cache key is still `${resumeId}:${updatedAt}`, so any edit bumps `updated_at` server-side and the new key misses the cache exactly like before — persistence only avoids re-fetching for resumes that haven't been edited.
- **`src/contexts/AuthContext.tsx`** — both the user-id-change effect (covers initial sign-in, account switch, sign-out reflected via session change) and the explicit `signOut` callback now also call `clearAllPersistedCaches()` + `clearAllCachedScores()` + `clearAllEditorSessions()` alongside the existing `queryClient.clear()`. No new state or refs were introduced.
- **What this does NOT change** — No change to the Zustand resume-store persistence (`src/store/resumeStore.ts`); it already persisted `currentResume` across refreshes, this work layered UI-state restore on top. No change to the autosave debounce, conflict guard, or offline write queue (`src/hooks/useEditorAutosave.ts`). No change to `useUnsavedChangesGuard`. No change to the React Query defaults in `src/App.tsx` — `placeholderData` is opt-in per call site. No change to Phase 9's `lazyWithRetry` silent recovery; this work just makes the recovery *also* silent in terms of editor state.
- **Verification** — `tsc --noEmit` clean; `vite build` clean (49.76 s, no new warnings, no new oversize-chunk warnings). Manual: open editor on Experience tab, scroll halfway, open Tailor sheet, hard-refresh → page reloads on Experience at the same scroll offset with Tailor still open. Add `?fresh=1` → reloads on Contact at scroll-top with the param stripped. Sign out and sign back in → dashboard prints skeletons (cache cleared); next refresh paints from cache instantly.

---

## 2026-04-21 — Recover silently when a stale service worker serves a missing chunk (Task #42)

- **Why** — Returning visitors who installed the old Workbox PWA service worker before its removal still have it cached locally. On their next visit the old SW serves the precached `index.html` + entry bundle from the previous build, and the entry bundle's `import("./AppLanding-<old-hash>.js")` fetches a chunk filename that no longer exists in `public_html/resume/` (the deploy uses `lftp mirror --reverse --delete`). The dynamic import rejects with `TypeError: Failed to fetch dynamically imported module`, React Suspense bubbles the rejection to `ErrorBoundary`, and the user sees a red "Retrying in 5 seconds…" screen until `clearSiteData()` reloads. The tombstone `public/custom-sw.js` IS correct on the live site (verified byte-identical, sha256 `3b88c113…`), but a service worker only activates on the next visit's SW update check — which happens *after* the page has already booted from the stale precache. So the very first chunk fetch in the bad session is doomed; only a reload after that fetch's failure can pick up the tombstone and clean up. The recovery already existed in `src/components/ErrorBoundary.tsx` lines 112–143, but it was downstream of Suspense and therefore showed the user a red screen and a 5-second countdown before doing it. We want the recovery to be invisible — there is no useful information for the user in that screen, and "the page reloaded" is the entire fix.
- **`src/lib/lazyWithRetry.ts`** — `retryImport` now chains `.catch` after the existing 3-attempt online/offline retry loop. If the final rejection matches a chunk-load pattern (`ChunkLoadError`, `Failed to fetch dynamically imported module`, `error loading dynamically imported module`, `Importing a module script failed`, `Loading chunk`, `Loading CSS chunk`), `attemptSilentReload(err)` triggers `window.location.reload()` and returns a never-resolving Promise so React Suspense doesn't briefly surface the rejection in the dying tab. The reload is gated by `sessionStorage.getItem('wr.chunk-reload-attempted')` so a genuinely-broken environment can never loop. `import.meta.env.DEV` short-circuits the silent-reload path entirely so Vite HMR's mid-edit chunk failures continue to surface in the existing ErrorBoundary for developers. If `sessionStorage.setItem` throws (Safari private mode, storage disabled), the function returns `false` and the original error is rethrown — the ErrorBoundary path handles it exactly as before.
- **`src/main.tsx`** — `setTimeout(() => sessionStorage.removeItem('wr.chunk-reload-attempted'), 8000)` clears the guard 8 seconds after `createRoot.render()`. If the post-reload boot survives that long the recovery worked, and we want a *future* deploy that strands the same long-lived tab to be allowed its own one-shot recovery rather than locking the user out for the rest of the browser session.
- **Why this doesn't fight ErrorBoundary** — The boundary keeps its existing chunk-handling fallback (lines 112–143) verbatim. Different sessionStorage namespaces (`wr.*` vs `wiseresume-chunk-retry-*`) means the upstream silent reload and the downstream visible-recovery reload can't double-count each other. The boundary is now the second layer (private mode, post-reload re-failure, non-lazy-import code paths), not the primary user experience.
- **Why this doesn't loop** — The guard is per-session sessionStorage. Two consecutive failures within one boot attempt only trigger one reload; after the reload, even another failure goes through to the ErrorBoundary's existing chunk handler (independent counter, MAX 3 retries in 30s, then stops with the visible red screen so the user can choose Reload manually).
- **Why we silent-reload instead of clearing caches first** — `clearSiteData()` in the boundary unregisters service workers + deletes named caches before reloading. We don't replicate that work upstream because the tombstone SW does the same thing in its own `activate` handler the moment the silent reload's update check picks it up. Doing it twice would double the work and add a perceptible delay; trusting the tombstone keeps the silent path as light as `window.location.reload()`.
- **What this does NOT change** — No change to the tombstone (`public/custom-sw.js`), the deploy workflow (`.github/workflows/deploy.yml`), the Hostinger `.htaccess` cache rules, the theme/scheme stamping in `src/pages/Index.tsx`, or any landing-page CSS. Every `lazyWithRetry(...)` call site (every page, every dialog, `AppLanding`, `AppInterior`, `AnimatedSplash`) inherits the new behaviour automatically — no per-call-site changes needed.
- **Verification** — `tsc --noEmit -p tsconfig.json` clean. The bug is reproducible only against a tab that previously installed the old Workbox SW; in this environment with no SW registered the new code is a pure pass-through. Behaviour will be confirmed against `https://resume.thewise.cloud` after the next workflow_dispatch deploy from a fresh Chrome profile that previously visited the v3.4 site.

---

## 2026-04-21 — Fix sign-in on live site: route edge functions to Supabase directly in production (Task #29 follow-up #3)

- **Why** — Once the FTPS deploy fix earlier today let v3.5 actually reach production, sign-in immediately surfaced the "Sign-in incomplete" card from `src/components/layout/ProtectedRoute.tsx`. Root cause: every client call to a Supabase edge function (starting with the auth bridge's `token-exchange`) was hard-coded to a relative `/api/fn/<name>` URL. That path only resolves in dev, where Vite's proxy forwards it to the Express server on `:5001` for verification + forwarding. On Hostinger there is no Express server, so `/api/fn/*` falls through to the SPA `.htaccess` rewrite and returns `index.html` with `200 OK` and `text/html`. The bridge's `res.json()` then throws, the Kinde→Supabase exchange is marked failed, `supabaseSettled && !supabaseReady` flips true, and the protected-route card shows. Verified end-to-end with `curl -i -X POST https://resume.thewise.cloud/api/fn/token-exchange` returning HTML; the canonical Supabase function at `https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/token-exchange` returns the expected `{"code":"MISSING_AUTH_HEADER"}` JSON without auth and `{"code":"INVALID_KINDE_TOKEN"}` with a fake Bearer — i.e. the function is fully reachable from the public internet, no Apache `mod_proxy` required. The pattern was introduced in commit `019a7205` (Task #33 TPL-4) and pre-existed in v3.4 too, but v3.4 never actually shipped to users (silent stale deploy — see Task #29's prior follow-ups), so this is the first time the bug has been visible.
- **`src/lib/apiFnUrl.ts`** (new) — single chokepoint: `apiFnUrl(fnName)` returns `/api/fn/<name>` when `import.meta.env.DEV` is true (so dev is unchanged and continues to use the Express middleware), and `${VITE_SUPABASE_URL}/functions/v1/<name>` in production. There is also a defensive fallback to the relative path if `SUPABASE_URL` is empty, but in practice `src/lib/supabaseConstants.ts` already throws on app boot when `VITE_SUPABASE_URL` is missing in a `PROD` build, so the fallback is a belt-and-braces safety net rather than a path the runtime ever reaches. Query strings on `fnName` (e.g. `og-image?username=...`, `resolve-short-link?id=...`) pass through unchanged in both branches.
- **All 17 client `/api/fn/*` call sites** rerouted through `apiFnUrl(...)`:
  - `src/lib/supabaseBridge.ts` (`token-exchange`)
  - `src/lib/edgeFunctions.ts` (generic JSON+FormData wrapper)
  - `src/integrations/supabase/edgeFunctions.ts` (generic wrapper used by hooks)
  - `src/lib/aiTailor.ts` (`tailor-resume`, `tailor-section`)
  - `src/lib/pdfParser.ts` (`parse-resume` × 2 — initial + 401-retry)
  - `src/hooks/useSuspensionCheck.ts` (`me`)
  - `src/hooks/useResumeScore.ts` (`score-resume`)
  - `src/hooks/useATSSuggestions.ts` (`enhance-section`)
  - `src/hooks/useAIEnhance.ts` (`enhance-section`)
  - `src/hooks/usePortfolioSEO.ts` (`og-image?username=…`)
  - `src/hooks/usePortfolioTracking.ts` (`track-portfolio-view`)
  - `src/components/portfolio/public/PortfolioContactForm.tsx` (`submit-contact-request`)
  - `src/components/portfolio/public/ChatWidget.tsx` (`create-portfolio-session`, `ask-portfolio`)
  - `src/components/ai/AIHealthBadge.tsx` (`ai-health`)
  - `src/components/editor/tailor/QuickActions.tsx` (`enhance-section`)
  - `src/components/editor/ai/AIEnhanceSheet.tsx` (`enhance-section`)
  - `src/components/applications/AddApplicationSheet.tsx` (`parse-job-url`)
  - `src/components/editor/TemplateAdvisorSheet.tsx` (`suggest-template`)
  - `src/components/interview/QuestionBankSheet.tsx` (`generate-question-bank`)
  - `src/pages/PublicPortfolioPage.tsx` (`portfolio-interest`)
  - `src/pages/ShortLinkPage.tsx` (`resolve-short-link?id=…`)
- **Why this is safe / why no `apikey` header is needed** — Every function in `supabase/config.toml` is `verify_jwt = false` (93 entries, all uniformly disabled), so Supabase's gateway never blocks the request for missing JWT/apikey. Auth is enforced *inside* each function: `token-exchange` validates the Kinde Bearer via Kinde's JWKS; every other authenticated function calls the shared `requireAuth` middleware (`supabase/functions/_shared/authMiddleware.ts`) on the bridge-minted Supabase JWT we already attach in `Authorization: Bearer …`. CORS already allow-lists `https://resume.thewise.cloud` (`supabase/functions/_shared/cors.ts`), and the `connect-src` CSP in `public/.htaccess` already includes `https://*.supabase.co`. No server-side change required.
- **Why not an `.htaccess` proxy** — Considered `RewriteRule ^api/fn/(.*)$ https://.../functions/v1/$1 [P,L]` but that needs `mod_proxy` + `mod_proxy_http`, which Hostinger shared hosting often disables, would add a Hostinger→Supabase hop (extra latency + a single point of failure), and would obscure the request origin from Supabase's CORS/rate-limit logic. The direct-call path is the architecturally correct one — the Express server in dev was always just a developer-experience convenience, never a load-bearing production component.
- **Dev unchanged** — `import.meta.env.DEV` keeps every dev call going through Vite → Express → Supabase exactly as before, so the Express server's profile-upsert side effects in the dev `/api/fn/token-exchange` route still fire locally.
- **Verification** — `tsc --noEmit -p tsconfig.json` clean. `vite build` produces a 47s bundle with no remaining `/api/fn/` literals outside the helper itself (`grep -rn '/api/fn/' src/` returns only `apiFnUrl.ts` lines 22 and 26, both inside the dev / fallback branches).

---

## 2026-04-21 — Switch deploy transport from SFTP to FTPS (Task #29 follow-up #2)

- **Why** — The retry-loop SFTP fix shipped earlier today (commit `752334c4`) was insufficient: the very next deploy (run `24748098362`, commit `752334c`) hung in the SFTP step for 30+ minutes despite the relaxed timeouts and 4-attempt outer retry. Hostinger's `sshd` on `82.29.154.120:22` was completely silent toward the GitHub Actions runner — TCP connect succeeded, but the SFTP daemon never returned even a banner. The previous successful baseline (run `24745677150`) took 1m42s in the same step, confirming the failure was Hostinger-side and not workload-related. Independent network probing confirmed the diagnosis: from a separate (non-runner) network, `vsftpd` on `:21` cleanly responded `220 FTP Server ready.`, while `:22` was unreachable. Hostinger's per-IP rate limiter applies aggressively to `sshd` but not to the FTP daemon, and Azure-hosted GitHub Actions runner IPs are a shared pool that frequently lands on the SSH blocklist. The retry loop alone cannot fix this — no number of retries succeeds against a daemon that is not answering.
- **Cancelled run** — In-flight run `24748098362` was cancelled at the 30-minute mark via the GitHub API to free the runner.
- **`.github/workflows/deploy.yml`** —
  - Step renamed from "Deploy to Hostinger via SFTP" to "Deploy to Hostinger via FTPS".
  - Transport changed from `sftp://82.29.154.120:22` to `ftp://82.29.154.120:21` with explicit TLS via `set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate no` (Hostinger's shared-hosting cert chain isn't always in lftp's CA bundle; `--ssl-protect-data` keeps the data channel encrypted regardless). `set ftp:passive-mode true` to avoid NAT/firewall issues with active-mode data connections from runners.
  - Same credential (`u966279061.thewise.cloud` + `FTP_PASSWORD` secret) — Hostinger uses one user/password across SFTP and FTPS.
  - `mirror --reverse --delete --verbose --parallel=2` — `--parallel=2` doubles throughput on small-file-heavy uploads (most of `dist/` is small chunked JS), with no risk to ordering since the verifier in step 9 reads the live URL after the upload completes.
  - Per-connection limits dialled back to sensible FTPS values (`net:timeout 30`, `net:max-retries 3`, `net:reconnect-interval-base 10`) — FTPS is far more tolerant than SFTP and doesn't need the heavy buffers SFTP needed.
  - Outer retry loop reduced from 4 attempts to 3 with shorter backoff (30s / 60s) — FTPS fails infrequently enough that a long retry budget is wasted time.
  - Added explicit `timeout-minutes: 15` on the step so a future stuck transport never burns the default 6-hour job slot again.
  - All `cmd:fail-exit yes` semantics preserved — partial uploads still fail loudly.
- **What this does NOT change** — The post-upload `verify-live-deploy.mjs` step is unchanged; correctness gating is intact. The `replit.md` documentation policy is intact. Same destination directory `/public_html/resume/`. Same secrets.
- **Operator note** — Future deploys should consistently complete the upload step in 1–3 minutes via FTPS. If FTPS ever becomes throttled (very rare for Hostinger's vsftpd), the failure annotation prints the runner IP and run URL for a one-paste support ticket.

---

## 2026-04-21 — Interview Tool resume detection & workflow (Task #32)

- **`supabase/migrations/20260508000000_interview_session_drafts.sql`** — added `status` (`draft`|`completed`, default `completed`) and `updated_at` columns to `public.interview_sessions`, plus a partial index on `(user_id, updated_at DESC) WHERE status='draft'`, an `update_updated_at_column` trigger, and a `cleanup_expired_interview_drafts()` SECURITY DEFINER function for pruning drafts older than 24 h. Existing rows default to `completed` so the history view is unchanged.
- **`src/integrations/supabase/types.ts`** — extended the `interview_sessions` Row/Insert/Update types with the new `status` and `updated_at` columns.
- **`src/hooks/useInterviewHistory.ts`** — `useInterviewHistory` now filters by `status='completed'`. `useSaveInterviewSession` accepts an optional `draft_id` and promotes the draft row in place via `UPDATE` (insert fallback if the draft was pruned). Added `useLatestInterviewDraft` (24 h freshness window with opportunistic cleanup of this user's expired drafts), `useUpsertInterviewDraft`, and `useDeleteInterviewDraft`.
- **`src/hooks/useVoiceInterview.ts`** — replaced the silent toast in the ElevenLabs `onError` path with a stateful `voiceFallbackReason` exposed by the hook. Added `retryVoice()` (clears the fallback flag + re-prefetches the ElevenLabs token), `submitAnswerNow()` for the explicit "I'm done" affordance, and `resumeFromDraft({messages, jobDescription, interviewType, durationSeconds})` which rehydrates the transcript bubbles, reconstructs `messagesRef` (so the AI continues coherently), restores the elapsed timer, the JD, and the quick-practice flag, and re-enters the active phase **without** triggering an AI call (no credits burned). `startInterview`/`resetInterview` clear `voiceFallbackReason`.
- **`src/components/interview/ResumePicker.tsx`** — new in-page picker (uses shadcn `Select`) that lists the user's resumes (Master CV pinned + most recent first) and updates `useResumeStore` on change. Hidden while loading/empty.
- **`src/pages/InterviewPage.tsx`** — auto-selects Master CV (or most recent resume) on entry when the store is empty; renders `ResumePicker` above setup and preview (switching from preview clears the cached role analysis and drops back to setup so the JD can be re-confirmed against the new resume); gates the "No Resume Yet" empty state on `useResumes().isFetched` so users with resumes never see a flash of the empty state during the auto-select round-trip; persists each transcript turn to a draft via `useUpsertInterviewDraft` (keyed on `transcript.length`); shows a bottom-sheet "Resume previous interview?" prompt when a fresh draft (<24 h) exists; on "Resume Previous" restores the draft's resume into `useResumeStore`, parses stored `messages`, and calls `resumeFromDraft(...)` so the user lands back in the active phase with their transcript and AI context intact; passes `draft_id` to `useSaveInterviewSession` so the final save promotes the draft instead of creating a duplicate row; renders the always-visible voice→text fallback banner with a "Try voice again" retry button; adds an always-visible explicit "I'm done answering" control next to the mic toggle (active while listening); and replaces the "Go to Dashboard" empty-state CTA with "Use Sample Resume" (calls `useResumeMutations().createResume` with `buildSampleResume`).
- **`src/pages/__tests__/InterviewPage-D7.test.tsx`** — extended hook mocks to cover `useUpsertInterviewDraft`, `useDeleteInterviewDraft`, `useLatestInterviewDraft`, and the new `voiceFallbackReason`/`retryVoice`/`submitAnswerNow`/`retryCurrentQuestion` fields returned by `useVoiceInterview`. All 7 D7 tests still pass.
- **No edge function changes** — interview-chat AI prompts and credit accounting are untouched. Pro-only feature gate (`UpgradeWall`) is preserved.


## 2026-04-21 — Hostinger SFTP transient-throttle resilience (Task #29 follow-up)

- **Root cause** — Deploy run `24747728477` (commit `2c47d11`, 21:37 UTC) failed during the lftp upload step despite an identical run succeeding 48 minutes earlier (run `24745677150`, 20:49 UTC). The lftp transcript shows TCP connect succeeding and the SSH session spawning, then the SFTP `INIT` packet (5 bytes, type 1) being sent and the server never replying — four `**** Timeout - reconnecting / ---- Disconnecting` cycles followed by `mirror: Fatal error: max-retries exceeded`. With identical secrets, identical workflow, identical target, and a clean run minutes earlier, the failure mode is a transient `fail2ban`-style throttle on Hostinger's SFTP daemon against the GitHub Actions runner's outbound IP — not a credentials, configuration, or code issue. Hostinger shared SFTP applies per-IP rate limiting, and Azure-hosted runner IPs are a shared pool, so a "neighbour" CI job hitting Hostinger seconds before us is enough to get our IP temporarily blocked. The block typically clears in 30–120 s.
- **`.github/workflows/deploy.yml`** —
  - Per-connection lftp settings relaxed: `net:timeout 60` (was 20), `net:max-retries 5` (was 2), plus new `net:reconnect-interval-base 10`, `net:reconnect-interval-multiplier 1.5`, and `net:persist-retries 5`. Each individual lftp invocation is now significantly more tolerant of slow SFTP-INIT replies.
  - lftp invocation moved into a `deploy_once()` shell function and wrapped in a 4-attempt outer `for` loop with widening backoff (`attempt * 45` seconds → 45 s, 90 s, 135 s between retries). On the first successful attempt the step exits 0 immediately; only after all four attempts fail do we surface a `::error::` annotation that correctly attributes the failure to a Hostinger-side throttle and tells the operator to wait 5–10 minutes and re-run (with the runner IP captured via `https://api.ipify.org` so a manual ticket to Hostinger support is one paste away).
  - Strict `set -euo pipefail` was relaxed to `set -uo pipefail` because the retry loop relies on capturing lftp's non-zero exit inside an `if` — without dropping `-e`, the function would still exit the whole shell on the first failed attempt and the retry loop would never run. The `if … ; then … fi` branch is exempt from `set -e`, but a non-conditional call to a function that fails would not be, so the explicit removal is the safer choice.
  - Pipe to `tail -300` retained (was `tail -200`); pipefail still in effect, so lftp's exit code is what the function returns even when piped.
- **What this does NOT change** — The post-upload `verify-live-deploy.mjs` step is unchanged and remains the authoritative gate for "did v3.5 actually go live". The retry only addresses the transport-layer flakiness; correctness checks still run.
- **Operator note** — If all four attempts still fail (extremely unlikely), the failure annotation will print the runner's outbound IP. Open a ticket with Hostinger support including that IP and the run URL; they can confirm and lift any longer-term block. The transient class of failure that motivated this commit will not recur.

---

## 2026-04-21 — Hostinger deploy guards + stale-v3.4 postmortem (Task #29)

- **Root cause** — Live `https://resume.thewise.cloud` continued to serve v3.4 after a "successful" v3.5 upload. Curl probes against origin (Hostinger CDN reported `x-hcdn-cache-status: DYNAMIC`, ruling out edge cache) showed every file timestamped `Sun, 19 Apr 2026 07:48:21 GMT`, the live `index.html` referenced an entry script (`assets/index-6cKUqAp4.js`) whose hash exists in no local v3.5 build, `/changelog.json` body still reported `"version": "v3.4.0"`, `custom-sw.js` carried the old `cache-control: public, max-age=604800`, and `Strict-Transport-Security` / `X-Content-Type-Options` / `Cross-Origin-Opener-Policy` were all absent — proving the live `.htaccess` was the v3.4-era version (Task #22's no-cache `<FilesMatch>` and Task #26's headers had never been uploaded). The recent operator upload either targeted the wrong directory or used a tool that silently skipped dotfiles like `.htaccess`. Documented in full at `docs/ops/stale-v3.4-postmortem.md` with the curl evidence table, root-cause reasoning, and operator runbook.
- **`scripts/verify-live-deploy.mjs`** (new) — Standalone, dependency-free Node verifier. Reads `package.json` `version`, then asserts against the live URL (defaulting to `https://resume.thewise.cloud`, overridable via `LIVE_SITE_URL`): (a) first entry of `/changelog.json` body has `version === "v" + pkg.version`; (b) `/changelog.json` and `/index.html` both serve `Cache-Control` containing `no-cache` or `no-store`; (c) `/` carries `Strict-Transport-Security`, `X-Content-Type-Options`, and `Cross-Origin-Opener-Policy`; (d) a probe URL ending in `.map` returns 403 or 404 (Task #26 deny rule active). Exit code 0 = clean; exit code 1 emits a per-check `FAIL` line plus a remediation hint pointing the operator at `.github/workflows/deploy.yml`. Smoke-tested locally — fails with all 7 expected errors against today's stale live site.
- **`.github/workflows/deploy.yml`** —
  - lftp invocation gains `set cmd:fail-exit yes` so any single file upload error aborts the workflow instead of being silently swallowed (the prior failure mode that made the partial-upload-still-green path possible). The script also runs under `set -euo pipefail`.
  - New "Verify live site reflects the new build" step runs `node scripts/verify-live-deploy.mjs` against the live URL with up to 6 retries × 10 s sleep (~60 s total) to absorb Hostinger origin/edge settling. Workflow only reports green when every assertion passes — this is the authoritative `.htaccess actually landed` gate. The earlier draft greped the lftp transfer log for `.htaccess`, but lftp's `mirror --reverse --delete` legitimately skips unchanged files, which would have produced false-red deploys; the live-header check is what users actually experience and is what we now assert.
- **`docs/ops/stale-v3.4-postmortem.md`** (new) — Postmortem with the curl evidence table, the `.htaccess` v3.4-era detection, root-cause reasoning, the operator's recovery procedure (run the hardened workflow, then run the verifier locally, then visually confirm v3.5 in Settings), and an explanation of why this exact silent-stale failure mode is now impossible to miss.
- **Why this isn't fixed in this commit alone** — Replit cannot deploy from this environment (no FTP credentials, no SSH access to Hostinger). The actual upload must be triggered by running the now-hardened `.github/workflows/deploy.yml` from the GitHub Actions UI; the verifier step inside that workflow then converts any future stale-deploy regression from "silent" to "red". Tracked as follow-up Task #30.

---

## 2026-04-21 — DevTools exposure hardening (Task #26)

- **`vite.config.ts`** —
  - `build.sourcemap` is now `process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false` (was unconditionally on). When the Sentry token is unset (the default for any non-CI build, including the operator running `npm run build` locally before a Hostinger upload), no `*.js.map` files are emitted at all, so the original un-minified source can never be reconstructed by an attacker fetching `assets/<file>.js.map` directly.
  - `esbuild.drop = ['debugger']` strips `debugger` statements from production bundles unconditionally.
  - `esbuild.pure = ['console.log', 'console.info', 'console.debug', 'console.trace']` marks those four methods as side-effect-free, so the minifier removes calls whose return value is unused (which is true of every direct call in this codebase). `console.error` and `console.warn` are deliberately NOT in the pure list — they survive minification so Sentry breadcrumbs and the ErrorBoundary still capture useful diagnostics. Comment in the file explains why `drop: ['console']` would have been the wrong tool (it removes every `console.*`).
- **`scripts/check-no-sourcemaps.mjs`** (new) — Postbuild guard wired into `npm run build`. Walks `dist/` for any `*.map` file. If found AND `SENTRY_AUTH_TOKEN` is unset, the script exits 1 with a list of offending paths so the build fails loudly before the operator can ship sourcemaps to production. If `SENTRY_AUTH_TOKEN` IS set, the maps are expected (they get uploaded to Sentry then deleted by the Sentry plugin's `filesToDeleteAfterUpload`), so the script just logs and exits 0.
- **`package.json`** — `build` script now chains the postbuild guard: `vite build && node scripts/check-no-sourcemaps.mjs`.
- **`public/.htaccess`** —
  - New `<FilesMatch "\.map$">` block returning 403 before the SPA fallback rewrite, so even if a future build accidentally regenerated `.map` files Apache would still refuse to serve them. Defense-in-depth against the postbuild guard.
  - New `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS, 1-year, preload-ready — domain not yet submitted to the HSTS preload list, that's a separate follow-up).
  - New `X-Content-Type-Options: nosniff` to block MIME-sniffing attacks.
  - New `Cross-Origin-Opener-Policy: same-origin` to isolate the browsing context group from any opener / popup, mitigating XS-Leaks and Spectre-style cross-window attacks.
  - Existing CSP, X-Frame-Options, Referrer-Policy, and Permissions-Policy lines were left exactly as-is — no behaviour change to those.
- **`replit.md`** — Documented the sourcemap policy (only emitted when `SENTRY_AUTH_TOKEN` is set, deleted after upload), the `console.*` strip policy (log/info/debug/trace stripped via `pure`, error/warn preserved for Sentry), and the new HSTS / X-Content-Type-Options / COOP headers. Operator note: a fresh full re-upload of `dist/` is required for the `.map` files already on Hostinger to be deleted (Hostinger File Manager does not delete files missing from the upload set — Task #29 found this is the same root cause as the v3.4 staleness).
- **Why no auth/RLS audit in this task** — Out of scope per the task spec; flagged as a separate follow-up (already in queue: "RLS audit (#27)"). DevTools-exposure hardening is purely about what an unauthenticated visitor can read off the wire and out of the browser, not about whether authenticated requests are properly authorized server-side.

---

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
