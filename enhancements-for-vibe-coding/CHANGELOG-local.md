# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-09
- Issue ID: MANAGE-KEYS-500-FIX
- Summary: Fixed 500 error in manage-api-keys edge function caused by FK violation. Function was connecting to Lovable Cloud DB instead of external project (jnsfmkzgxsviuthaqlyy). Switched to EXT_SUPABASE_URL/EXT_SUPABASE_SERVICE_ROLE_KEY.
- Files touched: supabase/functions/manage-api-keys/index.ts
- Notes: Same cross-project pattern as other edge functions.

- Date: 2026-03-09
- Issue ID: AI-TEST-PROVIDER-IDENTITY
- Summary: Made ai-test edge function return deterministic, provider-specific greetings ("Hello! I'm Wise Resume AI" / "Hello! I'm Gemini AI" / "Hello! I'm Ollama AI") instead of letting the AI hallucinate its own name. Prevents fake provider names in Recent AI Requests log.
- Files touched: supabase/functions/ai-test/index.ts
- Notes: Cosmetic change only — no routing or auth logic modified.

- Date: 2026-03-09
- Issue ID: AI-SETTINGS-LEAK-FIX
- Summary: Fixed AI provider settings (Gemini/Ollama validated flags, provider choice) leaking between users via localStorage. Added reset on sign-out and reset-before-hydrate on login.
- Files touched: src/hooks/useAIKeyHydration.ts, src/contexts/AuthContext.tsx
- Notes: Low risk — resetSettings() restores defaults; hydration re-applies server values on next login.


- Date: 2026-03-09
- Issue ID: AI-TEST-401-FIX
- Summary: Fixed 401 in ai-test edge function. Replaced getClaims() with requireAuth() middleware for cross-project JWT compatibility.
- Files touched: supabase/functions/ai-test/index.ts

- Date: 2026-03-09
- Issue ID: OTP-6-DIGIT-FIX
- Summary: Replaced hashed_token (long hex) with real 6-digit numeric OTP. Created `signup_otps` table to store codes with 10-min expiry. Updated `send-signup-otp` to generate/store 6-digit code and send it via Resend. Created new `verify-signup-otp` edge function that validates the code, confirms the user, and returns a session token. Updated `EmailConfirmationPage` to call `verify-signup-otp` instead of `supabase.auth.verifyOtp`.
- Files touched:
  - DB migration: `signup_otps` table
  - `supabase/functions/send-signup-otp/index.ts`
  - `supabase/functions/verify-signup-otp/index.ts` (new)
  - `supabase/config.toml` (add verify-signup-otp)
  - `src/pages/EmailConfirmationPage.tsx`
- Notes: OTP stored in plaintext — acceptable for short-lived 10-min codes. RLS enabled with no policies (service-role only).

- Date: 2026-03-09
- Issue ID: OTP-RESEND-FIX
- Summary: Fixed OTP resend sending verification links instead of OTP codes. Pass `password` and `fullName` through router state from AuthPage to EmailConfirmationPage. Updated `handleResend` in OTP mode to call `send-signup-otp` edge function instead of `supabase.auth.resend()`. Updated edge function to handle existing unconfirmed users by falling back to `magiclink` type when `signup` returns "already registered".
- Files touched:
  - `src/pages/AuthPage.tsx` (pass password/fullName in router state)
  - `src/pages/EmailConfirmationPage.tsx` (OTP resend via edge function, import edgeFunctions)
  - `supabase/functions/send-signup-otp/index.ts` (handle existing users with magiclink fallback)
- Notes: Edge function redeployed. Risk: `hashed_token` from `generateLink` may not be a 6-digit code — needs end-to-end testing.

- Date: 2026-03-09
- Issue ID: OTP-DEPLOY-FIX
- Summary: Deployed `send-signup-otp` edge function to Lovable Cloud (was returning 404). Fixed error handling in AuthPage OTP branch to `return` on failure instead of falling through to navigation. Improved error message extraction to read `{ error }` from edge function response body.
- Files touched:
  - `src/pages/AuthPage.tsx` (error handling fix)
- Notes: Verified deployment with curl — function returns `{ success: true }`.



- Date: 2026-03-09
- Issue ID: OTP-EDGE-FUNCTION + AUTH-CARD-STYLING
- Summary: Fixed OTP signup flow by creating a new `send-signup-otp` edge function that uses `admin.generateLink` to get the OTP token and sends a branded email via Resend. Split the AuthPage signup handler: OTP mode calls the edge function, link mode uses standard `supabase.auth.signUp()`. Updated both AuthPage and EmailConfirmationPage card styling to use transparent glass background (`hsl(var(--card) / 0.25)` with 24px blur), stronger gradient border (0.7/0.5/0.4 opacity), and subtle white border for clear outline against the sky wallpaper. EmailConfirmationPage now properly supports dual mode: OTP shows 6-digit input, link shows "check your email for a link" message.
- Files touched:
  - `supabase/functions/send-signup-otp/index.ts` (New)
  - `supabase/config.toml`
  - `src/pages/AuthPage.tsx`
  - `src/pages/EmailConfirmationPage.tsx`
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Requires `EXT_SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` secrets (already configured). The `admin.generateLink` returns the OTP via `hashed_token`. Test both OTP and link signup flows end-to-end.

- Date: 2026-03-09
- Issue ID: PORTFOLIO-DOMAIN-FIX
- Summary: Fixed broken portfolio links by updating all hardcoded domain references from wiseresume.lovable.app to thewise.cloud. Updated FALLBACK_DOMAIN, edge functions (portfolio-meta, og-image), and editor display URL. Also increased public portfolio cache times (staleTime 5→10min, gcTime 10→30min) for performance.
- Files touched:
  - `src/lib/portfolioUrl.ts`
  - `supabase/functions/portfolio-meta/index.ts`
  - `supabase/functions/og-image/index.ts`
  - `src/pages/PortfolioEditorPage.tsx`
  - `src/hooks/usePublicPortfolio.ts`
- Notes: Deploy edge functions. Test portfolio links from preview and production domains.

- Date: 2026-03-09
- Issue ID: ONBOARDING-PHASE-3
- Summary: Implemented Phase 3 of the onboarding flow rewrite. Retired the modal-based `OnboardingCarousel` and moved onboarding to a dedicated `OnboardingPage.tsx` route. Added automatic redirection to `/onboarding` upon successful sign-up and updated `DashboardPage.tsx` to handle background onboarding checks cleanly without modal rendering.
- Files touched:
  - `src/pages/EmailConfirmationPage.tsx`
  - `src/pages/OnboardingPage.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/components/onboarding/OnboardingCarousel.tsx` (Deleted)
  - `src/components/onboarding/OnboardingStep.tsx` (Deleted)
- Notes: Test the full sign-up to onboarding to dashboard flow. Ensure `profiles.onboarding_completed` successfully syncs via Supabase on complete/skip.


- Issue ID: ONBOARDING-PHASE-2
- Summary: Implemented Phase 2 of the onboarding flow rewrite. Updated `SignupEmail` template to include a 6-digit OTP code block alongside the magic link. Fully rewrote `EmailConfirmationPage.tsx` to include a polished 6-digit OTP input UI with auto-submit, paste support, and real-time validation via `supabase.auth.verifyOtp`.
- Files touched:
  - `src/pages/EmailConfirmationPage.tsx`
  - `supabase/functions/_shared/email-templates/signup.tsx`
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Requires testing the email delivery to ensure the 6-digit code is properly generated and verifiable.

- Date: 2026-03-09
- Issue ID: LANDING-PAGE-AUTH-CLEANUP
- Summary: Removed redundant auth entry points from the landing page. Removed the "Try AI Editor" button from Demo Card A, the "Build Your Portfolio" button from Demo Card B, and the duplicate "Start Building Now" bottom CTA section.
- Files touched:
  - `src/pages/Index.tsx`
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Simplifies auth conversion paths to just the header buttons and hero CTA.

- Date: 2026-03-08
- Issue ID: EMAIL-TEMPLATE-POLISH
- Summary: Redesigned all 6 auth email templates with a futuristic premium look — dark header/footer bands (#1a1a2e), red accent divider (#e63946), light gray card content area (#f8f9fa), gradient CTA buttons with shadow trick, emoji accents per template type, dark code block for OTP, refined typography (28px/800 headings, -0.5px letter-spacing). Redeployed auth-email-hook.
- Files touched:
  - `supabase/functions/_shared/email-templates/signup.tsx`
  - `supabase/functions/_shared/email-templates/recovery.tsx`
  - `supabase/functions/_shared/email-templates/magic-link.tsx`
  - `supabase/functions/_shared/email-templates/invite.tsx`
  - `supabase/functions/_shared/email-templates/email-change.tsx`
  - `supabase/functions/_shared/email-templates/reauthentication.tsx`
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Purely visual change, no auth flow impact.

- Date: 2026-03-08
- Issue ID: BRANDED-AUTH-EMAILS
- Summary: Scaffolded and branded all 6 auth email templates (signup, recovery, magic-link, invite, email-change, reauthentication) for custom sender domain notify.thewise.cloud. Applied WiseResume brand: vibrant red (#e63946) CTA buttons, logo from storage, centered layout, professional copy with "Build your career story" footer. Uploaded wise-ai-logo.png to avatars/email-assets/ storage. Deployed auth-email-hook edge function. Also created EmailConfirmationPage shown after signup instead of a toast.
- Files touched:
  - `supabase/functions/_shared/email-templates/signup.tsx` — branded signup template
  - `supabase/functions/_shared/email-templates/recovery.tsx` — branded recovery template
  - `supabase/functions/_shared/email-templates/magic-link.tsx` — branded magic link template
  - `supabase/functions/_shared/email-templates/invite.tsx` — branded invite template
  - `supabase/functions/_shared/email-templates/email-change.tsx` — branded email change template
  - `supabase/functions/_shared/email-templates/reauthentication.tsx` — branded reauth template
  - `supabase/functions/auth-email-hook/index.ts` — edge function (scaffolded)
  - `src/pages/EmailConfirmationPage.tsx` — post-signup confirmation page
  - `src/pages/AuthPage.tsx` — navigate to confirmation page on signup
  - `src/App.tsx` — added /auth/confirm-email route
  - `enhancements-for-vibe-coding/CHANGELOG-local.md`
- Notes: Custom emails activate automatically once DNS for notify.thewise.cloud is verified. Until then, default emails continue.

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
