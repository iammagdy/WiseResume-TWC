# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-08
- Issue ID: OAUTH-CUSTOM-DOMAIN (Google OAuth 404 on custom domains)
- Summary: Fixed Google OAuth returning 404 on custom domains (thewise.cloud) by routing OAuth through wiseresume.lovable.app where the /~oauth endpoint is handled, then redirecting back to the custom domain with session tokens via URL hash fragment. AuthCallbackPage now handles cross-domain token exchange via supabase.auth.setSession().
- Files touched:
  - `src/pages/AuthPage.tsx` — custom domain detection, redirect_uri routing, post-auth redirect-back logic
  - `src/pages/AuthCallbackPage.tsx` — cross-domain token exchange from URL hash
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Tokens in URL hash are the same pattern Supabase uses for email confirmations (hash fragments are not sent to servers). sessionStorage stores return origin during the OAuth flow.

- Date: 2026-03-08
- Issue ID: SKELETON-DEDUP (Remove double-skeleton loading states)
- Summary: Eliminated duplicate skeleton loading states across 9 pages where the Suspense fallback in App.tsx already showed the correct skeleton, but the page component showed an identical skeleton again during data fetching — causing a jarring reset. All internal skeleton returns replaced with `return null`. Merged `CoverLettersSkeleton` and `ResignationLettersSkeleton` into shared `ListPageSkeleton`. Fixed `SkeletonCard` mixed animation inconsistency. Removed DashboardPage custom inline skeleton.
- Files touched:
  - `src/pages/EditorPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/pages/SharePage.tsx`, `src/pages/JobDetailPage.tsx`, `src/pages/ApplicationTrackerPage.tsx`, `src/pages/CoverLetterEditPage.tsx`, `src/pages/ResignationLetterEditPage.tsx`, `src/pages/DashboardPage.tsx`
  - `src/components/layout/PageSkeletons.tsx`, `src/components/ui/skeleton-card.tsx`
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes / Constraints: No behavior changes. Suspense fallback skeletons persist until real content renders.

---

- Date: 2026-03-08
- Issue ID: AUTH-MIGRATION (Remove Clerk, switch to pure Supabase Auth)
- Summary: Complete removal of Clerk authentication and migration to pure Supabase Auth using project `jnsfmkzgxsviuthaqlyy`. All auth flows now use `supabase.auth.signInWithPassword()`, `signUp()`, `resetPasswordForEmail()`, and `updateUser()`. AuthContext rewritten to use `onAuthStateChange` + `getSession()`. Edge functions simplified to extract `sub` claim directly (no more `supabaseUuid` mapping). DB functions `get_clerk_user_id()` and `safe_uid()` simplified to return `auth.uid()`, keeping all RLS policies functional. Two packages removed (`@clerk/clerk-react`, `@lovable.dev/cloud-auth-js`).
- Files touched:
  - **Deleted**: `src/lib/clerkSupabase.ts`, `src/pages/ClerkAuthPage.tsx`, `src/pages/SSOCallbackPage.tsx`, `src/integrations/lovable/index.ts`, `supabase/functions/clerk-webhook/`, `supabase/functions/provision-clerk-user/`, `supabase/functions/repair-clerk-uuid/`, `supabase/functions/patch-clerk-jwt-template/`
  - **Rewritten**: `src/contexts/AuthContext.tsx`, `src/integrations/supabase/safeClient.ts`, `src/integrations/supabase/edgeFunctions.ts`, `src/pages/ResetPasswordPage.tsx`, `src/hooks/useAIKeyHydration.ts`, `src/lib/auditLogger.ts`
  - **Created**: `src/pages/AuthPage.tsx`, `src/lib/supabaseAuth.ts`
  - **Edited (import swap)**: `src/App.tsx`, `src/lib/supabaseConstants.ts`, `src/lib/aiTailor.ts`, `src/lib/pdfParser.ts`, `src/lib/shareUtils.ts`, `src/lib/migrateLocalKeys.ts`, `src/hooks/useAIEnhance.ts`, `src/hooks/useResumeScore.ts`, `src/hooks/useATSSuggestions.ts`, `src/components/editor/tailor/QuickActions.tsx`, `src/components/editor/TemplateAdvisorSheet.tsx`, `src/components/editor/ai/AIEnhanceSheet.tsx`, `src/components/interview/QuestionBankSheet.tsx`, `src/components/applications/AddApplicationSheet.tsx`, `src/components/portfolio/editor/SetupTab.tsx`, `src/components/BugReportDialog.tsx`, `src/components/settings/AISettingsSheet.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/pages/ResignationLetterNewPage.tsx`, `src/pages/ResignationLetterEditPage.tsx`, `src/pages/SettingsPage.tsx`
  - **Edge functions**: `supabase/functions/_shared/authMiddleware.ts`
  - **DB migration**: Simplified `get_clerk_user_id()` and `safe_uid()` to return `auth.uid()`
  - **Config**: `.env.example` (removed Clerk vars), `package.json` (removed `@clerk/clerk-react`, `@lovable.dev/cloud-auth-js`)
- Notes / Constraints: No RLS policy changes needed — `get_clerk_user_id()` and `safe_uid()` now delegate to `auth.uid()`. Edge functions still deploy on Lovable Cloud and need `EXT_SUPABASE_URL` / `EXT_SUPABASE_SERVICE_ROLE_KEY` secrets. Supabase project `jnsfmkzgxsviuthaqlyy` needs: Email auth enabled, Site URL = `https://thewise.cloud`, Redirect URLs include `https://thewise.cloud/reset-password`, and a `handle_new_user` trigger on `auth.users` to auto-create profiles.

---

- Date: 2026-03-07
- Issue ID: ISSUE-C (D-2, D-3, P-2, S-1, PE-1 — Medium UX fixes)
- Summary: Five Medium UX issues fixed in one pass. **(D-2)** Added a server-error state branch (`resumesError && !resumes && navigator.onLine`) between the offline state and empty state on the Dashboard; shows an `AlertCircle` icon, "Something went wrong" message, and a "Tap to retry" `Button` with `RefreshCw` icon that calls `refetch()`. **(D-3)** Persisted `activeTab` and `searchQuery` in `sessionStorage` (keys `wr-dash-tab` / `wr-dash-search`) — both states now initialise from sessionStorage and are synced via `handleSetActiveTab` / `handleSetSearchQuery` helpers; replaced all 3 call sites in the Embla carousel handler, `Tabs onValueChange`, and search `Input onChange`. **(P-2)** Renamed "Export CV" button to "Export Options" and swapped its icon from `Download` to `FileDown` on the Preview page bottom bar; the quick-PDF outline button retains the `Download` icon. **(S-1)** Added a subtle "← Go to WiseResume" link below the Unlock button on the Share page password gate screen (muted text, `text-[11px]`, `hover:text-foreground` transition). **(PE-1)** Wrapped the disabled Save button in `SaveBar` inside a `TooltipProvider/Tooltip/TooltipTrigger` (`<span>` wrapper to capture hover on disabled element) with `TooltipContent` reading "Fix username errors before saving"; the enabled state is unchanged.
- Files touched:
  - `src/pages/DashboardPage.tsx` (D-2: server error state branch + `AlertCircle`/`RefreshCw` imports; D-3: sessionStorage init + helpers + 3 call sites updated)
  - `src/pages/PreviewPage.tsx` (P-2: `FileDown` import + icon/label swap on Export button)
  - `src/pages/SharePage.tsx` (S-1: "← Go to WiseResume" link on password gate)
  - `src/components/portfolio/editor/SaveBar.tsx` (PE-1: Tooltip wrapper on disabled Save button)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. No handlers, routing, save, export, or auth logic modified. `App.tsx`, `types.ts`, `client.ts` untouched. All MEMORY.md "Do Not Touch" constraints respected. SessionStorage keys use `wr-` prefix consistent with existing app convention.

---

<!-- Add new entries below as changes are made. Copy the template for each entry. -->

<!--
Entry template:

- Date: YYYY-MM-DD
- Issue ID: ISSUE-XXX (or N/A)
- Summary:
- Files touched:
- Notes / Constraints:
-->
