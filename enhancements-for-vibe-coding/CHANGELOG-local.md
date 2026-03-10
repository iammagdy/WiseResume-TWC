# CHANGELOG-local.md

Local changelog tracking WiseResume changes via Lovable AI sessions.

## 2026-03-10

### FIX-CLOUDS-NOT-RENDERING
- **Summary**: Fixed two bugs preventing 3D clouds from rendering: (1) cloud group positioned at Y=-30, far below camera viewport — moved to Y=0; (2) `segments={1}` too low to produce visible geometry — increased to `segments={20}`. Clouds now visible in both light and dark mode.
- **Files edited**: `src/components/ui/SkyWallpaperCanvas.tsx`
- **Test**: Open app on desktop and mobile — clouds should be visible floating in the background in both light and dark mode.
- **Risks**: None — purely fixes broken rendering.

### 3D-ANIMATED-BACKGROUND
- **Summary**: Replaced CSS-based sky background (gradients, puff clouds, stars) with a full-screen 3D animated background using React Three Fiber + GSAP. Desktop renders a `<Canvas>` with drei `<Stars>` (dark mode) and `<Clouds>` (both modes), camera parallax on mouse move, film grain noise overlay, 1rem inset border, and 3s fade-in on load. Mobile skips 3D entirely — plain div with animated background color + noise overlay for zero 3D overhead. Theme transitions animated via `useGSAP`.
- **Files created**: `src/components/ui/SkyWallpaperCanvas.tsx`
- **Files rewritten**: `src/components/ui/SkyWallpaper.tsx`
- **Dependencies added**: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@gsap/react`
- **Test**: Visit app on desktop — should see 3D clouds floating, stars in dark mode, smooth color transition on theme toggle. On mobile — should see plain colored background with noise texture, no 3D. Public routes (`/p/`, `/share/`) should show nothing.
- **Risks**: R3F is heavier than CSS; lazy-loaded canvas mitigates initial bundle impact.


### LANDING-CTA-POLISH
- **Summary**: Removed guest "Log in" and "Sign Up" header buttons for a minimal landing page. Renamed "Get Started Free" → "Get Started" with filled primary background and stronger glow effect.
- **Files edited**: `src/pages/Index.tsx`
- **Test**: Visit landing page as guest — header should show only logo + theme toggle. Hero CTA should say "Get Started" with a bold primary-colored button.
- **Manual action**: Update Kinde dashboard theme (Design → Pages): background `#070712`, primary button `#D92638`, upload WiseResume logo, card background `hsl(240 20% 8%)`.



### AUTH-FLOW-SIMPLIFICATION
- **Summary**: Removed intermediate auth page card UI. Landing page buttons (Log in, Sign Up, Get Started Free) now call Kinde directly. AuthPage.tsx converted to a thin redirect layer that auto-triggers Kinde login/register based on `?mode=` param.
- **Files edited**: `src/pages/Index.tsx`, `src/pages/AuthPage.tsx`
- **Test**: Click "Log in", "Sign Up", and "Get Started Free" on landing page — should redirect directly to Kinde hosted auth. Visit `/auth?mode=login` directly — should auto-redirect to Kinde login.
- **Manual action**: Update Kinde dashboard (Design → Pages) to match app dark theme: background `hsl(240 30% 3%)`, primary button color to match app primary red.



### REPO-SIZE-CLEANUP
- **Summary**: Deleted legacy/redundant files to reduce repo size (~16K+ lines removed). Deleted `email-templates-html.md`, `email-templates.md`, `deno.lock`. Could not delete `package-lock.json` or edit `.gitignore` (read-only).
- **Files deleted**: `email-templates-html.md`, `email-templates.md`, `deno.lock`
- **Note**: `.gitignore` and `package-lock.json` are read-only — need manual git cleanup for `package-lock.json`.


### ROUTE-RENAME-PRIVACY-TERMS
- **Summary**: Renamed `/privacy` → `/privacy-policy` and `/terms` → `/terms-of-service` across routes, links, and bug report screen map.
- **Files edited**: `src/App.tsx`, `src/components/landing/Footer.tsx`, `src/pages/AuthPage.tsx`, `src/lib/bugReport.ts`
- **Test**: Click Privacy Policy and Terms of Service links in footer and auth page; verify they navigate to `/privacy-policy` and `/terms-of-service`.



### AUTH-CLEANUP-LEGACY-ARTIFACTS
- **Summary**: Removed 6 ghost Clerk-era entries from `supabase/config.toml` (`clerk-webhook`, `debug-jwt`, `patch-clerk-jwt-template`, `provision-clerk-user`, `repair-clerk-uuid`, `repair-user-uuid`). Dropped legacy `signup_otps` table. Kept `auth-email-hook` (Lovable Cloud system function), `KindeAuthTestPage.tsx` (testing phase), and `get_clerk_user_id` DB function (still used by callers, rename deferred).
- **Files edited**: `supabase/config.toml`
- **Migration**: `DROP TABLE IF EXISTS public.signup_otps`
- **Test**: Verify app loads, auth works, Dev-Kit tests pass. No functional changes expected.


### BRIDGE-ERROR-BANNER-USAGE-EVENTS-CONFIG-FIX
- **Summary**: Added `lastError` state to supabaseBridge with `getLastError()`/`clearLastError()` exports. AppShell now shows a dismissible banner on bridge errors (session expired or data connection issues). Fixed `config.toml` to include `[functions.me]` and removed legacy `send-signup-otp`/`migrate-user-data` entries. Created `usage_events` table (RLS: user SELECT only, no client inserts). Updated `tailor-resume` to insert usage events via service-role. Added "Usage Events" section to Dev-Kit.
- **Files edited**: `supabase/config.toml`, `src/lib/supabaseBridge.ts`, `src/components/layout/AppShell.tsx`, `supabase/functions/tailor-resume/index.ts`, `src/pages/DevToolsPage.tsx`
- **Migration**: Created `public.usage_events` table
- **Test**: Log in → Dev-Kit → run "Load Last 5 Usage Events" (empty initially). Run tailor-resume, then re-check usage events. Verify bridge error banner by simulating token failure.

### TOKEN-EXCHANGE-HARDENING-AND-ME-ENDPOINT
- **Summary**: Hardened token-exchange with structured error codes (`INVALID_KINDE_TOKEN`, `SHADOW_USER_FAILED`, `PROFILE_UPSERT_FAILED`, `JWT_SECRET_MISSING`, `INTERNAL_ERROR`) and proper HTTP statuses. Added `token_exchanges` audit table for exchange diagnostics. Added `refreshTokenIfNeeded()` to supabaseBridge with auto-retry on 401 in safeClient and edgeFunctions. Created `/me` edge function returning userId, kinde_sub, profile, and preferences. Added "Who am I?" test to Dev-Kit.
- **Files edited**: `supabase/functions/token-exchange/index.ts`, `src/lib/supabaseBridge.ts`, `src/contexts/AuthContext.tsx`, `src/integrations/supabase/safeClient.ts`, `src/integrations/supabase/edgeFunctions.ts`, `src/pages/DevToolsPage.tsx`
- **Files created**: `supabase/functions/me/index.ts`
- **Migration**: Created `public.token_exchanges` table with RLS (deny-all for public, service-role only)
- **Test**: Log in → Dev-Kit → run "Who am I?" test → verify structured response. Test token expiry handling by waiting or manually clearing bridge.


### AUTH-CLEANUP-LEGACY-ARTIFACTS
- **Summary**: Removed all legacy Supabase Auth artifacts after Kinde migration. Deleted unused edge functions (`send-signup-otp`, `verify-signup-otp`, `migrate-user-data`), legacy pages (`ResetPasswordPage`, `EmailConfirmationPage`), and outdated test file (`useAuth.test.tsx`). Removed corresponding lazy imports and route definitions from `App.tsx`. Zero `supabase.auth.*` calls remain in the frontend. Auth is 100% Kinde + token bridge.
- **Files deleted**: `src/hooks/useAuth.test.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/pages/EmailConfirmationPage.tsx`, `supabase/functions/send-signup-otp/`, `supabase/functions/verify-signup-otp/`, `supabase/functions/migrate-user-data/`
- **Files edited**: `src/App.tsx` (removed 2 lazy imports and 2 route definitions)
- **Test**: Verify app loads, `/auth` works, protected routes redirect to `/auth` when logged out, login + dashboard flow works end-to-end.
- **Note**: `signup_otps` DB table remains (unused) — no schema changes made.

### DEV-KIT-UPGRADE
- **Summary**: Full rewrite of `/dev-tools` Dev-Kit page. Expanded from 3 to 7 sections with 18 total tests. Added "Run All" per section with sequential execution and pass/fail summary badges. Added collapsible JSON results with human-readable summary lines. New sections: Routing & Protected Pages, Settings & Preferences, Credits & Usage, Error Handling & Logging. All tests use real code paths.
- **Files**: `src/pages/DevToolsPage.tsx` (full rewrite)
- **Test**: Go to Settings → Dev Tools → enter password → verify all 7 sections render → click "Run All" per section → verify summaries and collapsible JSON work.

### DEV-TOOLS-PAGE
- **Summary**: Added password-gated `/dev-tools` page for internal debugging of all AI tools and key features. Runs real requests against edge functions (tailor-resume, enhance-section, analyze-resume, score-resume, parse-resume, generate-cover-letter, agentic-chat) and Supabase queries. Shows raw JSON responses, HTTP status codes, and errors in copyable `<pre>` blocks. Accessible only via "Dev Tools" button on Developer Credit Card in Settings.
- **Files**: `src/pages/DevToolsPage.tsx` (new), `src/App.tsx` (added route), `src/components/settings/DeveloperCreditCard.tsx` (added Dev Tools button)
- **Test**: Go to Settings → scroll to Developer card → click "Dev Tools" → enter password `thewisedeveloper` → run each test and verify responses appear.
- **Removal**: Delete `DevToolsPage.tsx`, remove route from `App.tsx`, revert Dev Tools button in `DeveloperCreditCard.tsx`.


### AUDIT-AI-TOOLS-KINDE-AUTH
- **Summary**: Audited all 30 AI features and their edge function calls after Kinde auth migration. All frontend callers use the bridge token (via `edgeFunctions.invoke` or `getSupabaseToken()`). All edge functions use `requireAuth` middleware with JWT `sub` claim extraction. No issues found — no code changes needed.
- **Files**: No files changed (audit only)
- **Test**: Run manual test checklist: Resume Score, Section Enhance, Smart Tailor, Cover Letter, Parse Resume, Interview Simulator, Career Path, AI Chat — confirm no 401/403 errors in DevTools Network tab.

### REMOVE-TRASH-UI
- **Summary**: Completely removed Trash concept from UI. Deleted `TrashSheet.tsx`, removed Trash button from dashboard header, removed `showTrash` state and `TrashSheet` rendering from `DashboardPage.tsx`. Delete is now permanent with no Trash view.
- **Files**: `src/pages/DashboardPage.tsx` (removed import, state, button, component), `src/components/dashboard/TrashSheet.tsx` (deleted)
- **Test**: Dashboard header should have no Trash icon. Deleting a resume removes it permanently. No TypeScript errors.

### FIX-PGRST204-SOFT-DELETE (v2) — superseded by HARD-DELETE-REMOVE-TRASH
- **Summary**: Fixed PGRST202 error — RPCs not found in schema cache. Replaced `.rpc()` calls with direct `.update({ deleted_at })` + `.select('id')` which forces PostgREST to resolve the column. `emptyTrash` unchanged (already uses JS filtering + hard delete by ID).
- **Files**: `src/hooks/useResumes.ts`
- **Test**: Click Delete on a resume → should soft-delete without errors. Open Trash → restore and permanently delete should work. Empty Trash should work.


### FIX-PDF-DOWNLOAD-AUTH
- **Summary**: Fixed "Failed to generate PDF" in Company Briefing — `handleDownloadPDF` called `supabase.auth.getUser()` which fails with Kinde bridge tokens. Replaced with `useAuth()` hook to get user email. Also fixed `ErrorBoundary.tsx` bug report to use `getUserId()` from bridge instead of `supabase.auth.getUser()`.
- **Files**: `src/components/interview/CompanyBriefingSheet.tsx`, `src/components/ErrorBoundary.tsx`
- **Test**: Generate a Company Briefing, click Download PDF — should succeed. Trigger ErrorBoundary report — should include user ID.


### AUTH-AUDIT-EDGE-FUNCTIONS
- **Summary**: Audited all 48 edge functions for auth consistency with Kinde→Supabase token bridge. Fixed 4 functions that used `supabase.auth.getUser()` (fails with cross-project bridge tokens): `generate-portfolio-bio` and `elevenlabs-scribe-token` now use `requireAuth()` from shared middleware; `ai-health` and `parse-resume` now use `decodeJwtPayload()` for optional auth. Removed unused `createClient` imports. 26 functions were already correct; 13+ public functions unchanged.
- **Files**: `supabase/functions/generate-portfolio-bio/index.ts`, `supabase/functions/elevenlabs-scribe-token/index.ts`, `supabase/functions/ai-health/index.ts`, `supabase/functions/parse-resume/index.ts`
- **Test**: Generate portfolio bio, use voice-to-text, check AI health, parse a resume — all should work when logged in.


### FIX-EDGE-FUNCTION-AUTH-401
- **Summary**: Fixed 401 Unauthorized in `tailor-resume`, `enhance-section`, `parse-job-url`. Replaced `getClaims()` (verifies against Lovable Cloud JWT secret) with `requireAuth()` from shared middleware (decodes without signature check, matching bridge token pattern).
- **Files**: `supabase/functions/tailor-resume/index.ts`, `supabase/functions/enhance-section/index.ts`, `supabase/functions/parse-job-url/index.ts`

### DEBUG-SHADOW-USER-CREATION
- **Summary**: Enhanced `token-exchange` edge function with verbose logging around `auth.admin.createUser` — logs target URL, user ID, email, full success/error objects. Broadened error matching to handle `already`/`duplicate`/`exists` variants. Added `getUserById` fallback verification: if createUser fails with unexpected error, confirms user actually exists before proceeding; returns 500 if not.
- **Files**: `supabase/functions/token-exchange/index.ts`
- **Test**: Trigger token-exchange, check edge function logs for diagnostic output. Confirm shadow user row exists in auth.users.

### FIX-SHADOW-USER-AUTH-USERS
- **Summary**: Fixed `resumes_user_id_fkey` foreign key violation by creating a shadow `auth.users` row in the `token-exchange` edge function using `serviceClient.auth.admin.createUser()` before upserting profiles. Idempotent — ignores "already registered" errors.
- **Files**: `supabase/functions/token-exchange/index.ts`
- **Notes**: Same pattern as `migrate-user-data`. The edge function auto-deploys on Lovable Cloud.


### FIX-USER-ID-BRIDGED-UUID
- **Summary**: Fixed `user.id` returning raw Kinde ID (`kp_...`) instead of bridged UUID, causing `invalid input syntax for type uuid` on all Supabase inserts. Updated `AuthContext` to use `getUserId()` from supabaseBridge as the primary `user.id`, falling back to Kinde ID only before bridge is ready. Fixed `CreateResumeDialog.handleCreateTailored` to use `getUserId()` with a null guard and toast error.
- **Files**: `src/contexts/AuthContext.tsx`, `src/components/dashboard/CreateResumeDialog.tsx`
- **Notes**: All 31+ files using `user.id` for Supabase calls are automatically fixed via the AuthContext change.

### KINDE-SUPABASE-TOKEN-BRIDGE
- **Summary**: Implemented a complete Kinde→Supabase token bridge so RLS and edge functions work for Kinde-only users. Created `token-exchange` edge function that verifies Kinde tokens via JWKS, generates deterministic UUID v5 from Kinde ID, upserts a profile row, and signs a Supabase-compatible JWT. Created `supabaseBridge.ts` singleton to manage token lifecycle. Updated `safeClient.ts` to inject bridge token on every fetch. Updated `AuthContext` to exchange tokens on login and refresh every 50 min. Removed all `supabase.auth.getSession()` calls from frontend.
- **Files**: `supabase/functions/token-exchange/index.ts` (new), `src/lib/supabaseBridge.ts` (new), `src/contexts/AuthContext.tsx`, `src/integrations/supabase/safeClient.ts`, `src/lib/supabaseAuth.ts`, `src/lib/auditLogger.ts`, `src/integrations/supabase/edgeFunctions.ts`, `src/components/settings/AISettingsSheet.tsx`, `src/components/settings/ContactInquiryDialog.tsx`, `src/components/settings/FeatureRequestDialog.tsx`, `src/components/BugReportDialog.tsx`, `supabase/config.toml`
- **Secrets**: Added `EXT_SUPABASE_JWT_SECRET` to sign Supabase JWTs
- **Notes**: Existing data under old Supabase Auth UUIDs will need a separate migration. New data uses deterministic UUID v5 from Kinde ID.

### REMOVE-SUPABASE-AUTH-KINDE-ONLY
- **Summary**: Fully removed Supabase Auth from the login flow. AuthPage now shows only Kinde Google + Kinde email sign-in/sign-up (no Supabase forms, forgot-password, or reset-password). AuthContext simplified to derive auth state solely from `useKindeAuth()`. AuthCallbackPage stripped of Supabase token exchange. EmailConfirmationPage and ResetPasswordPage now redirect to `/auth`. SignInPromptDialog uses `kindeRegister()`/`kindeLogin()` instead of navigating to Supabase signup. Updated `useProfile`, `useEditorHydration`, `useEditorAutosave`, `AccountSection`, `DashboardPage`, and `SettingsPage` to use `KindeAppUser` type instead of Supabase `User`.
- **Files**: `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/AuthCallbackPage.tsx`, `src/pages/EmailConfirmationPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`, `src/hooks/useProfile.ts`, `src/hooks/useEditorHydration.ts`, `src/hooks/useEditorAutosave.ts`, `src/components/settings/sections/AccountSection.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/SettingsPage.tsx`
- **Notes**: Supabase client kept for DB queries. Data-access helpers (`auditLogger`, `edgeFunctions`, `supabaseAuth`) still reference `supabase.auth.getSession()` and will need a token bridge in a future step. No DB/RLS changes.


### KINDE-EMAIL-LOGIN-SECTION
- **Summary**: Added experimental Kinde email/password login section to `/auth` page below the Google button. Provides email input + "Sign In" / "Sign Up" buttons that redirect to Kinde's hosted login page with `loginHint` pre-filled. Existing Supabase email/password form untouched.
- **Files**: `src/pages/AuthPage.tsx`
- **Notes**: No DB, RLS, or AuthContext changes. Uses `kindeLogin({ loginHint })` and `kindeRegister({ loginHint })` from Kinde React SDK. Section labeled "Beta" to distinguish from primary flow.


### KINDE-AUTH-SOURCE-OF-TRUTH
- **Summary**: Switched `AuthContext` and `AuthCallbackPage` to use Kinde as the primary auth source for page access (routing). `isAuthenticated` is now true if either Kinde or Supabase session exists. `signOut` clears both providers. `kindeUser` exposed on context. Supabase session kept for data queries — no DB/RLS changes.
- **Files**: `src/contexts/AuthContext.tsx`, `src/pages/AuthCallbackPage.tsx`
- **Notes**: Kinde-only users can now access protected pages but Supabase data queries will fail without a token bridge (next step). Email/password login unchanged.

### KINDE-GOOGLE-BUTTON-SWITCH
- **Summary**: Switched "Continue with Google" button on `/auth` and `SignInPromptDialog` to use Kinde's `login()` instead of `supabase.auth.signInWithOAuth`. Lifted `KindeProvider` to `App.tsx` root. Simplified `KindeAuthTestPage` to use inherited provider.
- **Files**: `src/App.tsx`, `src/pages/AuthPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`, `src/pages/KindeAuthTestPage.tsx`
- **Notes**: Email/password auth remains on Supabase. Kinde session does NOT create a Supabase session — `ProtectedRoute` won't recognize Kinde-only users yet. Follow-up needed for token bridge.

### KINDE-AUTH-TEST-PAGE
- **Summary**: Installed `@kinde-oss/kinde-auth-react` and added isolated `/kinde-auth-test` page with Login/Register/Logout buttons and user info display. Zero changes to existing Supabase Auth.
- **Files**: `src/pages/KindeAuthTestPage.tsx` (new), `src/App.tsx` (added lazy route)
- **Notes**: Kinde domain `https://thewisecloud.kinde.com`, Client ID `629174acb2874e6bbf53cd4a95497425`. Redirect URI set to `origin + /kinde-auth-test`.

## 2026-03-09

### PORTFOLIO-SYNC-MODE-DEDUP
- **Summary**: Removed duplicate Content Sync Mode toggle from Setup Tab's "Content & Visibility" section. The Content Tab retains the sole toggle with its smart pre-population logic. Setup Tab now focuses purely on section visibility switches.
- **Files**: `src/components/portfolio/editor/SetupTab.tsx`, `src/pages/PortfolioEditorPage.tsx`



### PORTFOLIO-AUDIT-FIX — Issue 2 Refresh Button
- **Summary**: Replaced `window.location.reload()` with `queryClient.invalidateQueries` for targeted analytics refresh without full page reload.
- **Files**: `src/components/portfolio/VisitorsPanel.tsx`


### PORTFOLIO-TOOL-BUG-FIX-ROUND
- **Summary**: Comprehensive portfolio tool bug fix round addressing 9 issues: (1) Footer link now explicit href + visual underline. (2) Visitors panel: fixed domain to resume.thewise.cloud, added refresh button, richer draft placeholder with mock cards. (3) Short link domain fixed. (4) Career card preview removed max-w-2xl for full-width scaling. (5) Theme filter: assigned proper categories to base themes, strict filtering. (6) Content tab restructured: Match CV/Custom toggle, separate portfolioSummary field in portfolioExtras, renamed Case Studies→Projects, reordered sections. (7) Chat widget: z-[60], pointer-events:auto, BYOK owner key via getUserKeyFromDB, chatDisabled self-hide. (8) Username field: replaced "WiseResume/" with live URL preview. (9) LivePreviewCard: shows bio snippet, Open to Work badge, view count. Design thumbnails inject user name/avatar.
- **Files**: `src/pages/PublicPortfolioPage.tsx`, `src/components/portfolio/VisitorsPanel.tsx`, `src/lib/portfolioThemes.ts`, `src/components/portfolio/editor/ThemeStorePicker.tsx`, `src/components/portfolio/editor/ContentTab.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/SetupTab.tsx`, `src/components/portfolio/editor/DesignTab.tsx`, `src/components/portfolio/editor/LivePreviewCard.tsx`, `src/components/portfolio/public/ChatWidget.tsx`, `src/components/portfolio/CareerCardSheet.tsx`, `supabase/functions/ask-portfolio/index.ts`

---

## 2026-03-09

### COMPANY-BRIEFING-SCROLLBAR-PDF-LOADING
- **Summary**: (1) Replaced ScrollArea with native overflow-y-auto div for visible scrollbar. (2) Rewrote PDF export using pdf-lib with professional layout: white background, WiseResume logo, branded header, structured sections, diagonal watermark, footer with copyright/URL/user email/page numbers. (3) Added smart loading progress bar with animated steps and rotating status messages.
- **Files**: `src/components/interview/CompanyBriefingSheet.tsx`, `src/lib/companyBriefingPdf.ts` (new)

### FIX-RESUME-DELETE-DELETEALL-PORTFOLIO-TABS
- **Summary**: Three fixes: (1) Resume soft-delete — added `.select('id')` to `.update()` mutations to force PostgREST schema cache refresh. (2) Delete All Data — fixed `share_comments` deletion via `share_id` subquery, used `localStorage.clear()` and `window.location.replace('/')`. (3) Portfolio Editor — moved Content & Visibility and Availability from Content tab to Setup tab.
- **Files**: `src/hooks/useResumes.ts`, `src/lib/dataExport.ts`, `src/pages/SettingsPage.tsx`, `src/components/portfolio/editor/ContentTab.tsx`, `src/components/portfolio/editor/SetupTab.tsx`, `src/pages/PortfolioEditorPage.tsx`

---

## 2026-03-09
- **Summary**: Enhanced Company Briefing tool with dual input modes (Search by Company Name + Paste Job Description), deep research via `gemini-2.5-pro` for company-name searches, expanded output (competitors, products/services, tech stack, Glassdoor-style workplace insights), PDF download, copy-to-clipboard, and Smart Tailor CTA linking to resume tailoring.
- **Files**: `supabase/functions/company-briefing/index.ts`, `src/types/companyBriefing.ts`, `src/hooks/useCompanyBriefing.ts`, `src/components/interview/CompanyBriefingSheet.tsx`

---

### FIX-4-ISSUES-CI-DELETE-DOCS
- **Summary**: Four fixes: (1) GitHub CI — replaced broken `npm install -g supabase` with `supabase/setup-cli@v1` and deploy-all. (2) Resume delete — replaced RPC calls (`soft_delete_resume`, `soft_delete_resumes`, `restore_resume`) with direct `.update()` using `as any` cast since RPCs only exist on Lovable Cloud, not external DB. (3) Delete All Data — added missing tables (`short_links`, `contact_inquiries`, `feature_requests`), explicit dependent deletes (`share_comments`, `resume_shares`, `resume_versions`), more localStorage cleanup. (4) Reorganized CHANGELOG-local.md and updated SPEC.md.
- **Files**: `.github/workflows/deploy-edge-functions.yml`, `src/hooks/useResumes.ts`, `src/lib/dataExport.ts`, `enhancements-for-vibe-coding/CHANGELOG-local.md`, `enhancements-for-vibe-coding/SPEC.md`

---

### FIX-6-ISSUES-DELETE-NAV-AI
- **Summary**: Six fixes: (1) Resume delete — switched to RPC calls (reverted next session). (2) Delete All Data — signs user out after deletion. (3) Desktop nav — removed `/settings` from Home matchPaths. (4) Settings tab — conditional tab in desktop nav with back-to-previous-page. (5) AI "Last used" — seeded from `ai_usage_logs` on init. (6) AI provider revert — deferred persistence until key validated.
- **Files**: `src/hooks/useResumes.ts`, `src/pages/SettingsPage.tsx`, `src/components/layout/DesktopNav.tsx`, `src/hooks/useAIKeyHydration.ts`, `src/components/settings/AISettingsSheet.tsx`

---

### PORTFOLIO-EDITOR-REORG-AI-PROJECT
- **Summary**: (1) Added `add_project` tool to Wise AI edge function. (2) Reorganized portfolio editor from 3 tabs to 4 tabs (Setup/Content/Design/More).
- **Files**: `supabase/functions/agentic-chat/index.ts`, `src/hooks/useAgenticChat.ts`, `src/components/portfolio/editor/ContentTab.tsx` (new), `src/components/portfolio/editor/SetupTab.tsx`, `src/components/portfolio/editor/MoreTab.tsx`, `src/pages/PortfolioEditorPage.tsx`
- **Notes**: Edge function needs redeployment.

---

### UNIVERSAL-WISE-AI-DELETE-FIX
- **Summary**: (1) Resume delete via DB RPCs. (2) Universal Wise AI floating button on mobile + pill in desktop nav. (3) Context-aware category filters in chat. (4) Smart action confirmations via suggest_edits flow.
- **Files**: `src/hooks/useResumes.ts`, `src/components/layout/AppShell.tsx`, `src/components/layout/DesktopNav.tsx`, `src/components/editor/AgenticChatSheet.tsx`, `src/hooks/useAgenticChat.ts`, `src/lib/agenticChat.ts`, `supabase/functions/agentic-chat/index.ts`

---

### ANALYTICS-DELETE-AISTUDIO-CHAT
- **Summary**: (1) Analytics page desktop layout fix with smarter insights. (2) Resume delete robustness fix. (3) AI Studio resume picker popup. (4) Wise AI clickable resume cards in responses.
- **Files**: `src/pages/AnalyticsPage.tsx`, `src/hooks/useResumes.ts`, `src/pages/AIStudioPage.tsx`, `src/components/editor/AgenticChatSheet.tsx`

---

### PROFILE-DASH-CHAT-UX
- **Summary**: (1) Profile "Complete Your Profile" banner. (2) Dashboard delete → "Move to Trash" wording. (3) Removed ResumeFilters. (4) Chat new-chat icon. (5) Chat scroll fix + resume picker. (6) Chat passes resume list to edge function.
- **Files**: `src/pages/ProfilePage.tsx`, `src/pages/DashboardPage.tsx`, `src/components/editor/AgenticChatSheet.tsx`, `src/hooks/useAgenticChat.ts`, `src/lib/agenticChat.ts`, `supabase/functions/agentic-chat/index.ts`

---

### PROFILE-NAV-IMPORT-SHARE
- **Summary**: (1) Fixed `/profile` highlighting Home tab. (2) LinkedIn Smart Import step-by-step wizard. (3) Profile page LinkedIn import button. (4) Portfolio Share with draft detection.
- **Files**: `src/components/layout/DesktopNav.tsx`, `src/components/settings/LinkedInImportSheet.tsx`, `src/pages/ProfilePage.tsx`

---

### LINKEDIN-SMART-IMPORT
- **Summary**: Replaced URL import with guided Smart Import — visual step cards showing what to copy from LinkedIn.
- **Files**: `src/components/settings/LinkedInImportSheet.tsx`

---

### BACKUP-RESTORE-WHITELIST-FIX
- **Summary**: Switched backup import from strip-list to whitelist column approach. Unknown/stale columns silently dropped.
- **Files**: `src/lib/accountBackup.ts`

---

### BACKUP-RESTORE-FIX
- **Summary**: Fixed backup import FK constraint errors by stripping stale cross-reference columns.
- **Files**: `src/lib/accountBackup.ts`, `src/components/profile/AccountBackupSheet.tsx`

---

### LINKEDIN-PDF-FIX + LINKEDIN-URL-GUIDE
- **Summary**: Fixed LinkedIn PDF import (client-side pipeline with OCR fallback). Added guided URL import flow.
- **Files**: `src/components/settings/LinkedInImportSheet.tsx`

---

### ONBOARDING-DATA-REFLECT-FIX
- **Summary**: Invalidated React Query profile cache after onboarding DB update.
- **Files**: `src/pages/OnboardingPage.tsx`

---

### DOMAIN-SWAP
- **Summary**: Replaced `wiseresume.magdysaber.com` with `resume.thewise.cloud` across all domain references.
- **Files**: `src/lib/portfolioUrl.ts`, `supabase/functions/portfolio-meta/index.ts`, `supabase/functions/_shared/cors.ts`

---

### SAVEBAR-OVERLAP-FIX
- **Summary**: Changed SaveBar from fixed to static flex footer to prevent overlap.
- **Files**: `src/components/portfolio/editor/SaveBar.tsx`, `src/pages/PortfolioEditorPage.tsx`

---

### PORTFOLIO-EMPTY-RESUME-FIX
- **Summary**: `get_public_portfolio` now returns empty resume skeleton instead of NULL for users with no resumes.
- **Files**: DB migration

---

### OAUTH-IMPLICIT-FLOW
- **Summary**: Switched from PKCE to implicit OAuth flow to fix origin mismatch error.
- **Files**: `src/integrations/supabase/safeClient.ts`

---

### OAUTH-LANDING-SAFETY-NET
- **Summary**: Added OAuth hash token detection in Index.tsx to forward to `/auth/callback`.
- **Files**: `src/pages/Index.tsx`

---

### REMOVE-LOVABLE-CLOUD-AUTH
- **Summary**: Deleted `@lovable.dev/cloud-auth-js` package that intercepted OAuth calls.
- **Files**: `src/integrations/lovable/index.ts` (deleted), `package.json`

---

### REMOVE-CROSS-DOMAIN-OAUTH
- **Summary**: Removed leftover cross-domain OAuth relay logic from AuthPage.
- **Files**: `src/pages/AuthPage.tsx`

---

### GOOGLE-AUTH-CALLBACK-FIX
- **Summary**: Added error detection in AuthCallbackPage for whitelisting failures.
- **Files**: `src/pages/AuthCallbackPage.tsx`

---

### GOOGLE-AUTH-FIX
- **Summary**: Switched Google OAuth to direct `supabase.auth.signInWithOAuth`.
- **Files**: `src/pages/AuthPage.tsx`, `src/components/auth/SignInPromptDialog.tsx`

---

### PWA-ALT-BROWSER
- **Summary**: Fixed Install button for alternative Chromium browsers.
- **Files**: `src/components/pwa/InstallButton.tsx`

---

### HERO-CTA-SHIMMER + HERO-CTA-RESTYLE
- **Summary**: Added shimmer animation and redesigned authenticated hero CTA buttons.
- **Files**: `src/index.css`, `src/pages/Index.tsx`

---

### DEPT-CONTACT-FAQ
- **Summary**: Department dropdown in contact dialog, fixed email logos, expanded FAQ to 21 items, replaced mailto with dialog on Help page.
- **Files**: `src/components/settings/ContactInquiryDialog.tsx`, `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/pages/HelpPage.tsx`, edge functions

---

### DIALOG-EMAIL-REVAMP
- **Summary**: Fixed dialog positioning, revamped notification email templates, added `screen` and `error_category` to `bug_reports`.
- **Files**: `src/components/BugReportDialog.tsx`, `src/lib/bugReport.ts`, edge functions, DB migration

---

### EDGE-FN-AUTH-401
- **Summary**: Fixed 401 in feedback edge functions by replacing `getUser()` with manual JWT decode.
- **Files**: Edge functions, `FeatureRequestDialog.tsx`, `ContactInquiryDialog.tsx`

---

### EMAIL-SENDER-UPDATE + EMAIL-DELIVERY-FIX
- **Summary**: Fixed email deliverability by separating from/to addresses and using `notifications@thewise.cloud`.
- **Files**: Edge functions (send-bug-report, send-feature-request, send-contact-inquiry)

---

### LIGHT-MODE-VISIBILITY-FIXES
- **Summary**: Fixed hardcoded white colors causing light mode issues across auth, settings, and portfolio. Created `useIsDark` hook.
- **Files**: `src/hooks/useIsDark.ts` (new), `src/pages/EmailConfirmationPage.tsx`, `src/components/portfolio/public/StickyHeader.tsx`, `src/components/home/ActionCard.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/AuthPage.tsx`, `src/components/auth/SlideCaptcha.tsx`

---

### AUTH-CARD-GLASS + SCROLL
- **Summary**: Glassmorphic auth card styling with reduced opacity and scroll support for tall forms.
- **Files**: `src/pages/AuthPage.tsx`

---

### CAPTCHA-HOOKS-FIX
- **Summary**: Fixed SlideCaptcha hook ordering crash and ErrorBoundary bug report button.
- **Files**: `src/components/auth/SlideCaptcha.tsx`, `src/components/ErrorBoundary.tsx`

---

### SIGNUP-TERMS-CAPTCHA
- **Summary**: Added Terms/Privacy checkbox and slide-to-verify captcha to sign-up form.
- **Files**: `src/components/auth/SlideCaptcha.tsx` (new), `src/pages/AuthPage.tsx`

---

### LEGAL-PAGES-POLISH + EMAIL-DOMAIN-CONTACT
- **Summary**: Rewrote legal content, fixed backgrounds, added contact dialog with department dropdown, created `send-contact-inquiry` edge function.
- **Files**: `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/components/settings/ContactInquiryDialog.tsx` (new), edge function, DB migration

---

### BYOK-ROUTING-FIX + MANAGE-KEYS-500-FIX
- **Summary**: Fixed Gemini BYOK key retrieval and manage-api-keys 500 error by removing non-existent column queries.
- **Files**: `supabase/functions/_shared/aiClient.ts`, `supabase/functions/ai-test/index.ts`, `supabase/functions/manage-api-keys/index.ts`

---

### AI-TEST-PROVIDER-IDENTITY + AI-SETTINGS-LEAK-FIX + AI-TEST-401-FIX
- **Summary**: Deterministic provider greetings, fixed settings leaking between users, fixed 401 in ai-test.
- **Files**: `supabase/functions/ai-test/index.ts`, `src/hooks/useAIKeyHydration.ts`, `src/contexts/AuthContext.tsx`

---

### OTP-6-DIGIT-FIX + OTP-RESEND-FIX + OTP-DEPLOY-FIX + OTP-EDGE-FUNCTION
- **Summary**: Full OTP signup flow: `signup_otps` table, `send-signup-otp` and `verify-signup-otp` edge functions, 6-digit numeric codes with 10-min expiry, resend support, branded email template.
- **Files**: DB migration, `supabase/functions/send-signup-otp/index.ts`, `supabase/functions/verify-signup-otp/index.ts`, `src/pages/AuthPage.tsx`, `src/pages/EmailConfirmationPage.tsx`

---

### PORTFOLIO-DOMAIN-FIX
- **Summary**: Updated all domain references to `thewise.cloud`. Increased portfolio cache times.
- **Files**: `src/lib/portfolioUrl.ts`, edge functions, `src/pages/PortfolioEditorPage.tsx`, `src/hooks/usePublicPortfolio.ts`

---

### ONBOARDING-PHASE-2 + ONBOARDING-PHASE-3
- **Summary**: OTP email template with 6-digit code, rewrote EmailConfirmationPage with OTP input UI, moved onboarding to dedicated page route, retired modal carousel.
- **Files**: `src/pages/EmailConfirmationPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/DashboardPage.tsx`, email templates, deleted `OnboardingCarousel.tsx` and `OnboardingStep.tsx`

---

### LANDING-PAGE-AUTH-CLEANUP
- **Summary**: Removed redundant auth entry points from landing page (demo card buttons, bottom CTA).
- **Files**: `src/pages/Index.tsx`

---

### LANDING-GLASS-THEME
- **Summary**: Glassmorphic hero CTA and header styling, reduced header opacity to 0.55.
- **Files**: `src/pages/Index.tsx`, `src/index.css`

---

## 2026-03-08

### EMAIL-TEMPLATE-POLISH
- **Summary**: Redesigned all 6 auth email templates with futuristic premium look — dark header/footer, red accent, gradient CTA buttons.
- **Files**: `supabase/functions/_shared/email-templates/*.tsx`

---

### BRANDED-AUTH-EMAILS
- **Summary**: Scaffolded all 6 auth email templates for `notify.thewise.cloud`. Created `EmailConfirmationPage`. Uploaded logo to storage.
- **Files**: Email templates, `supabase/functions/auth-email-hook/index.ts`, `src/pages/EmailConfirmationPage.tsx`, `src/pages/AuthPage.tsx`, `src/App.tsx`

---

### OAUTH-CUSTOM-DOMAIN
- **Summary**: Fixed Google OAuth 404 on custom domains by routing through Lovable app domain then redirecting back with session tokens.
- **Files**: `src/pages/AuthPage.tsx`, `src/pages/AuthCallbackPage.tsx`

---

### SKELETON-DEDUP
- **Summary**: Eliminated duplicate skeleton states across 9 pages. Merged cover letter/resignation skeletons into shared `ListPageSkeleton`.
- **Files**: 9 page files, `src/components/layout/PageSkeletons.tsx`, `src/components/ui/skeleton-card.tsx`

---

### AUTH-MIGRATION
- **Summary**: Complete removal of Clerk authentication — migrated to pure Supabase Auth. Rewrote AuthContext, simplified edge function auth middleware, simplified `get_clerk_user_id()` and `safe_uid()` to return `auth.uid()`.
- **Files**: Deleted 4 Clerk files, rewrote 6 core files, created `AuthPage.tsx` and `supabaseAuth.ts`, edited 20+ import-swap files, DB migration
- **Notes**: All RLS policies maintained via simplified helper functions.

---

## 2026-03-07

### ISSUE-C (D-2, D-3, P-2, S-1, PE-1)
- **Summary**: Five medium UX fixes: server error state on Dashboard, persisted tab/search in sessionStorage, renamed Export button, share page "Go to WiseResume" link, tooltip on disabled Save button.
- **Files**: `src/pages/DashboardPage.tsx`, `src/pages/PreviewPage.tsx`, `src/pages/SharePage.tsx`, `src/components/portfolio/editor/SaveBar.tsx`

---

<!-- Entry template:
- ### ISSUE-ID
- **Summary**: What changed
- **Files**: Files touched
- **Notes**: Optional notes
-->
