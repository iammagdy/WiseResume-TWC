# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-09
- Issue ID: UNIVERSAL-WISE-AI-DELETE-FIX
- Summary: Four major changes: (1) Resume delete fix — created DB RPC functions (soft_delete_resume, soft_delete_resumes, restore_resume) to bypass PostgREST schema cache issue; updated useResumes.ts to use RPC calls. (2) Universal Wise AI — added global "Ask" floating button on mobile (AppShell.tsx) and "Ask" pill button in desktop nav (DesktopNav.tsx), making Wise AI accessible from any page. (3) Context-aware filters — added category chips (Resumes, Cover Letters, Applications, Portfolio, Activity) in AgenticChatSheet with auto-detection from current route; context passed to edge function for scoped AI responses. (4) Smart action confirmations — updated system prompt to prefer suggest_edits confirm/decline flow for any data-modifying action.
- Files: src/hooks/useResumes.ts, src/components/layout/AppShell.tsx, src/components/layout/DesktopNav.tsx, src/components/editor/AgenticChatSheet.tsx, src/hooks/useAgenticChat.ts, src/lib/agenticChat.ts, supabase/functions/agentic-chat/index.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: New DB migration with 3 RPC functions. Edge function redeployed. Context filters auto-detect from route.

- Date: 2026-03-09
- Issue ID: ANALYTICS-DELETE-AISTUDIO-CHAT
- Summary: Four improvements: (1) Analytics page — fixed desktop layout with max-w-4xl, 4-col stats grid on lg, side-by-side charts, added smarter insights (best ATS score, avg completeness, interview rate, worst resume nudge). (2) Resume delete fix — added .eq('user_id', user.id) and .select() to deleteResume and deleteMultipleResumes mutations for robustness. (3) AI Studio — "Change" button now opens resume picker popup instead of navigating to dashboard. (4) Wise AI Chat — AI responses now render clickable resume cards when resume titles are mentioned, allowing users to tap to switch context.
- Files: src/pages/AnalyticsPage.tsx, src/hooks/useResumes.ts, src/pages/AIStudioPage.tsx, src/components/editor/AgenticChatSheet.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: No backend changes. Delete fix addresses "Failed to delete resume" error by explicitly matching user_id.

- Date: 2026-03-09
- Issue ID: PROFILE-DASH-CHAT-UX
- Summary: Six improvements: (1) Profile page — added "Complete Your Profile" banner when profile < 100% with link to /onboarding. (2) Dashboard delete dialog — changed text from "permanently delete" to "moved to trash for 30 days", button now says "Move to Trash". (3) Dashboard — removed ResumeFilters component (sort/category/score chips). (4) Wise AI Chat — replaced Trash2 icon with MessageSquarePlus "New Chat" icon. (5) Wise AI Chat — fixed scrolling with h-0 flex-1 pattern, added resume picker (FileText button) in input area with popover listing all resumes, and "Chatting about" badge. (6) Wise AI Chat — now passes resume list to edge function so AI references actual resume titles instead of giving generic responses; updated system prompt for smarter, data-aware answers.
- Files: src/pages/ProfilePage.tsx, src/pages/DashboardPage.tsx, src/components/editor/AgenticChatSheet.tsx, src/hooks/useAgenticChat.ts, src/lib/agenticChat.ts, supabase/functions/agentic-chat/index.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Edge function redeployed. ResumeFilters component file kept but no longer rendered.

- Date: 2026-03-09
- Issue ID: PROFILE-NAV-IMPORT-SHARE
- Summary: Four improvements: (1) Fixed desktop nav highlighting — /profile no longer lights up "Home" tab. (2) Redesigned Smart Import into step-by-step wizard: one section at a time (About → Experience → Education → Skills), paste → Analyze → see result → Next, with skip and progress bar. (3) Profile page: removed redundant top Share/Copy buttons, replaced with Import from LinkedIn button, added LinkedIn import sheet. (4) Portfolio Share button made functional with draft detection — warns if portfolio is inactive, offers "Go Live & Share" or "Share Anyway".
- Files: src/components/layout/DesktopNav.tsx, src/components/settings/LinkedInImportSheet.tsx, src/pages/ProfilePage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: No backend changes. Edge function untouched. BottomTabBar already correct (no /profile in matchPaths).

- Date: 2026-03-09
- Issue ID: LINKEDIN-SMART-IMPORT
- Summary: Redesigned LinkedIn import flow. Removed "Import via URL" method (blocked by LinkedIn/popup blockers). Replaced "Paste Profile Text" with "Smart Import" — a guided paste experience with visual step cards showing users exactly what to copy from LinkedIn (About, Experience, Education, Skills). Single paste area + AI analysis unchanged. PDF upload unchanged.
- Files: src/components/settings/LinkedInImportSheet.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Removed openExternal, Link2, url-guide state, linkedinUrl state, handleUrlGuide. Added GUIDE_STEPS visual cards, Wand2 icon, AI badge on Smart Import card. No backend changes.

- Date: 2026-03-09
- Issue ID: BACKUP-RESTORE-WHITELIST-FIX
- Summary: Switched account backup import from strip-list to whitelist column approach. Each table now has an explicit list of valid columns; unknown/stale columns (including FK refs like parent_resume_id, resume_id, cover_letter_id) are silently dropped. Profile update and preferences also use whitelist filtering. Import is now resilient to schema version mismatches.
- Files: src/lib/accountBackup.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Export unchanged. Stale FK references no longer need explicit stripping since they're not in the whitelist.

- Date: 2026-03-09
- Issue ID: BACKUP-RESTORE-FIX
- Summary: Fixed account backup import failures. Stripped stale cross-reference columns (parent_resume_id, portfolio_resume_id, resume_id, cover_letter_id, job_id) during import to prevent FK constraint errors. Added error checking on profile update. Awaited query invalidation before closing sheet.
- Files: src/lib/accountBackup.ts, src/components/profile/AccountBackupSheet.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Export unchanged. Cross-references are stripped since IDs change on import. Data content is fully preserved.

- Date: 2026-03-09
- Issue ID: LINKEDIN-PDF-FIX + LINKEDIN-URL-GUIDE
- Summary: Fixed LinkedIn PDF import (was sending raw base64 to edge function that only accepts text; now uses client-side parseResumePDF pipeline with OCR fallback). Added guided "Import via URL" flow that opens the profile in a new tab and guides the user to copy-paste content.
- Files: src/components/settings/LinkedInImportSheet.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: No new edge functions or external services needed. PDF fix reuses the proven upload pipeline.


- Date: 2026-03-09
- Issue ID: ONBOARDING-DATA-REFLECT-FIX
- Summary: Onboarding data (name, DOB, phone, referral, career level) was not reflected after completion because the React Query profile cache was never invalidated. Added `queryClient.invalidateQueries({ queryKey: ['profile'] })` after the DB update.
- Files: src/pages/OnboardingPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Minimal fix — one import + one invalidation call.


- Date: 2026-03-09
- Issue ID: DOMAIN-SWAP
- Summary: Replaced deprecated `wiseresume.magdysaber.com` with `resume.thewise.cloud` across all domain references; updated fallback/default URLs
- Files touched: `src/lib/portfolioUrl.ts`, `supabase/functions/portfolio-meta/index.ts`, `supabase/functions/_shared/cors.ts`
- Notes: Old domain removed entirely. `resume.thewise.cloud` is now primary/fallback.

---

##

- Date: 2026-03-09
- Issue ID: SAVEBAR-OVERLAP-FIX
- Summary: Changed SaveBar from fixed positioning to static flex footer to prevent it from overlapping content (e.g. Availability section). Reduced scroll container bottom padding from pb-36 to pb-6.
- Files touched: src/components/portfolio/editor/SaveBar.tsx, src/pages/PortfolioEditorPage.tsx
- Notes: No logic changes. Layout-only fix.


- Date: 2026-03-09
- Issue ID: PORTFOLIO-EMPTY-RESUME-FIX
- Summary: Updated get_public_portfolio DB function to return profile data with an empty resume skeleton instead of NULL when a user has no resumes. Fixes "Not Found" on portfolio pages for new users who enabled their portfolio before creating a resume.
- Files touched: Database migration (get_public_portfolio function)
- Notes: Low risk — only affects users with zero resumes. Existing portfolios unaffected.

- Date: 2026-03-09
- Issue ID: OAUTH-IMPLICIT-FLOW
- Summary: Switched Supabase client from PKCE to implicit OAuth flow (flowType: 'implicit', detectSessionInUrl: false) to fix "Unable to exchange external code" error caused by origin mismatch between Lovable preview and external Supabase project.
- Files touched: src/integrations/supabase/safeClient.ts
- Notes: AuthCallbackPage already handles hash-based tokens. No other code changes needed.

- Date: 2026-03-09
- Issue ID: OAUTH-LANDING-SAFETY-NET
- Summary: Added useEffect in Index.tsx to detect OAuth hash tokens (#access_token=...&refresh_token=...) and forward to /auth/callback. Acts as safety net when Supabase redirects to site URL instead of /auth/callback due to missing redirect URL allowlist entries.
- Files touched: src/pages/Index.tsx
- Notes: User must also add preview/production URLs to Supabase Redirect URLs allowlist.


- Date: 2026-03-09
- Issue ID: REMOVE-LOVABLE-CLOUD-AUTH
- Summary: Deleted src/integrations/lovable/index.ts and removed @lovable.dev/cloud-auth-js package. This package was globally intercepting OAuth calls and routing them through Lovable Cloud's /~oauth proxy instead of the external Supabase project (jnsfmkzgxsviuthaqlyy).
- Files touched: src/integrations/lovable/index.ts (deleted), package.json
- Notes: Google OAuth should now redirect directly to jnsfmkzgxsviuthaqlyy.supabase.co. Hard-refresh required after deploy.

- Date: 2026-03-09
- Issue ID: REMOVE-CROSS-DOMAIN-OAUTH
- Summary: Removed leftover cross-domain OAuth logic (LOVABLE_ORIGIN, isCustomDomain, oauth-return-origin sessionStorage) from AuthPage. Google OAuth now calls supabase.auth.signInWithOAuth directly without any cross-domain relay.
- Files touched: src/pages/AuthPage.tsx
- Notes: If Google still redirects to /~oauth, it means @lovable.dev/cloud-auth-js is monkey-patching globally or a stale service worker is cached — user should hard-refresh and unregister SW.

- Date: 2026-03-09
- Issue ID: GOOGLE-AUTH-CALLBACK-FIX
- Summary: Added error detection in AuthCallbackPage — if Supabase redirects with ?error= query params (e.g. redirect URL not whitelisted), a toast is shown instead of silently landing on the home page. Also added toast on setSession failure.
- Files touched: src/pages/AuthCallbackPage.tsx

- Date: 2026-03-09
- Issue ID: GOOGLE-AUTH-FIX
- Summary: Switched Google OAuth from Lovable Cloud managed auth to direct supabase.auth.signInWithOAuth on external project (jnsfmkzgxsviuthaqlyy). Removed lovable OAuth import from AuthPage. Updated SignInPromptDialog Google button to call supabase directly.
- Files touched: src/pages/AuthPage.tsx, src/components/auth/SignInPromptDialog.tsx
- Notes: Google sign-in requires configuring Google provider on the external Supabase dashboard first.



- Date: 2026-03-09
- Issue ID: PWA-ALT-BROWSER
- Summary: Fixed Install button showing "use Chrome or Safari" on alternative Chromium browsers (Comet, Brave, etc). Now shows universal browser-menu instructions for adding to home screen.
- Files touched: src/components/pwa/InstallButton.tsx
- Notes: UI text only, no functional changes


- Date: 2026-03-09
- Issue ID: HERO-CTA-SHIMMER
- Summary: Added shimmer sweep animation + frosted glass background to Dashboard and Tailor CTA buttons for visibility in both light/dark modes. Added border-glow-pulse animation to Tailor button.
- Files touched: src/index.css, src/pages/Index.tsx
- Notes: CSS-only, no functional changes.

- Date: 2026-03-09
- Issue ID: HERO-CTA-RESTYLE
- Summary: Redesigned authenticated hero CTA buttons — stacked vertically, Dashboard button uses outline style in dark mode, Tailor button uses glass + border-glow with Sparkles icon and explainer subtitle.
- Files touched: src/pages/Index.tsx
- Notes: Purely visual change, no functional impact.

- Date: 2026-03-09
- Issue ID: DEPT-CONTACT-FAQ
- Summary: Replaced all raw email addresses on Terms & Privacy pages with clickable department hyperlinks that scroll to contact section and auto-open dialog with department pre-selected. Added department dropdown (9 departments) to ContactInquiryDialog. Fixed LOGO_URL in all 3 notification edge functions to use correct avatars bucket PNG. Added z-[100] to ContactInquiryDialog and FeatureRequestDialog for proper centering. Expanded FAQ from 8 to 21 items. Replaced broken mailto link on Help page with Contact Support dialog. Updated HelpSheet to navigate to /help instead of showing "Coming Soon".
- Files touched: src/components/settings/ContactInquiryDialog.tsx, src/components/settings/FeatureRequestDialog.tsx, src/pages/TermsPage.tsx, src/pages/PrivacyPage.tsx, src/pages/HelpPage.tsx, src/components/settings/HelpSheet.tsx, supabase/functions/send-bug-report/index.ts, supabase/functions/send-feature-request/index.ts, supabase/functions/send-contact-inquiry/index.ts
- Notes: Department is included in email subject line for routing. Edge functions deployed. Logo uses existing PNG from avatars bucket for email client compatibility.



- Date: 2026-03-09
- Issue ID: DIALOG-EMAIL-REVAMP
- Summary: Fixed dialog positioning (popups opening off-center on Terms/Privacy/Help pages), revamped all 3 notification email templates to match auth email branding (dark header/footer, red accent, logo, table-based layout), expanded SCREEN_MAP with 14 new routes, added `screen` and `error_category` columns to `bug_reports` table for searchability, removed raw user-agent noise from emails.
- Files touched: src/components/BugReportDialog.tsx, src/lib/bugReport.ts, supabase/functions/send-bug-report/index.ts, supabase/functions/send-feature-request/index.ts, supabase/functions/send-contact-inquiry/index.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: DB migration added nullable `screen` and `error_category` columns. Email templates now use table-based layout for email client compatibility. Dialog centering uses standard Radix positioning instead of manual hacks.


- Date: 2026-03-09
- Issue ID: EDGE-FN-AUTH-401
- Summary: Fixed 401 in send-feature-request/bug-report/contact-inquiry. Replaced getUser() with manual JWT decode. Fixed client dialogs to use supabase.auth.getSession().
- Files: send-feature-request, send-bug-report, send-contact-inquiry edge functions, FeatureRequestDialog.tsx, ContactInquiryDialog.tsx


- Date: 2026-03-09
- Issue ID: EMAIL-SENDER-UPDATE
- Summary: Changed email sender from `noreply@thewise.cloud` to `notifications@thewise.cloud` in all three feedback edge functions to improve deliverability (Resend penalizes "noreply" addresses).
- Files touched: supabase/functions/send-bug-report/index.ts, supabase/functions/send-feature-request/index.ts, supabase/functions/send-contact-inquiry/index.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Final config: from=`notifications@thewise.cloud`, to=`contact@thewise.cloud`, reply_to=user's email. No DNS or Resend domain changes.

- Date: 2026-03-09
- Issue ID: EMAIL-DELIVERY-FIX
- Summary: Fixed "sent but not delivered" emails from Resend by separating from/to addresses. Changed `from` field in all three feedback edge functions from `contact@thewise.cloud` to `noreply@thewise.cloud` with user's email in display name (e.g., `user@gmail.com via WiseResume <noreply@thewise.cloud>`). This prevents self-delivery blocking and shows user identity in inbox.
- Files touched: supabase/functions/send-bug-report/index.ts, supabase/functions/send-feature-request/index.ts, supabase/functions/send-contact-inquiry/index.ts, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: `reply_to` remains user's email so replies go to them. `to` remains contact@thewise.cloud.

- Date: 2026-03-09
- Issue ID: LIGHT-MODE-VISIBILITY-FIXES
- Summary: Fixed hardcoded white-based colors causing visibility issues in light mode across Auth, main app pages, Settings, and portfolio components. Made EmailConfirmationPage card border, StickyHeader background, ActionCard primary variant, and Settings changelog button theme-aware using useIsDark hook and semantic design tokens.
- Files touched: src/hooks/useIsDark.ts (imported reusable), src/pages/EmailConfirmationPage.tsx, src/components/portfolio/public/StickyHeader.tsx, src/components/home/ActionCard.tsx, src/pages/SettingsPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: All priority UI areas (auth flow, main app, settings, portfolio) now properly adapt to both light and dark modes. Replaced portfolio-theme-based isLight with global useIsDark() for consistency.

- Date: 2026-03-09
- Issue ID: LIGHT-MODE-UI-FIX
- Summary: Fixed light mode visibility issues in auth components. Extracted useIsDark hook from SkyWallpaper for reuse. Updated SlideCaptcha track/border to use theme-aware colors (black tints in light mode, white tints in dark). Fixed verified text to use text-green-600 dark:text-green-400. Updated AuthPage back button and card inner styles to use CSS variables (--foreground) for proper theme adaptation.
- Files touched: src/hooks/useIsDark.ts (new), src/components/auth/SlideCaptcha.tsx, src/pages/AuthPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: No auth or business logic modified. Light mode UI now properly visible.

- Date: 2026-03-09
- Issue ID: AUTH-CARD-GLASS-ENHANCE
- Summary: Reduced auth card background opacity from 0.12 → 0.06 for a stronger glassmorphic effect in dark mode. The cosmic space background now shows through more clearly while text remains legible thanks to the preserved 28px backdrop blur.
- Files touched: src/pages/AuthPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: CSS-only change. No auth or business logic modified.

- Date: 2026-03-09
- Issue ID: LANDING-GLASS-THEME
- Summary: Redesigned "Get Started Free" hero CTA and "Sign Up" header button to glassmorphic style (transparent bg, primary-tinted border, soft glow) matching the cosmic glass app theme. Reduced .glass-header opacity from 0.85→0.55 and increased blur to 28px — propagates to DesktopNav, BottomTabBar, and all page headers app-wide. Removed heavy shadow-lg from scrolled landing header.
- Files touched: src/pages/Index.tsx, src/index.css, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: CSS-only for header. Button redesign is cosmetic — no logic changed.

- Date: 2026-03-09
- Issue ID: AUTH-CARD-GLASS-SCROLL
- Summary: Reduced auth card opacity (0.25→0.12) and gradient border intensity for a softer glass effect. Softened box-shadow glow. Changed root container from overflow-hidden to overflow-y-auto so tall sign-up forms scroll. Increased vertical padding (py-8→py-12).
- Files touched: src/pages/AuthPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: CSS-only changes. No auth or business logic modified.

- Date: 2026-03-09
- Issue ID: CAPTCHA-HOOKS-FIX
- Summary: Fixed SlideCaptcha crash ("Rendered fewer hooks than expected") by moving useTransform call above the early return. Fixed ErrorBoundary "Report Issue" button by adding an inline self-contained bug report dialog that works independently of BugReportDialog (which gets unmounted on error).
- Files touched: src/components/auth/SlideCaptcha.tsx, src/components/ErrorBoundary.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: triggerBugReport import removed from ErrorBoundary; replaced with direct supabase.functions.invoke + DB fallback.

- Date: 2026-03-09
- Issue ID: SIGNUP-TERMS-CAPTCHA
- Summary: Added Terms of Service + Privacy Policy acceptance checkbox and a custom slide-to-verify captcha to the sign-up form. Both must be completed before the Continue button is enabled. Captcha uses a glassmorphic drag handle with spring animations. Checkbox links to /terms and /privacy in new tabs.
- Files touched: src/components/auth/SlideCaptcha.tsx (new), src/pages/AuthPage.tsx, enhancements-for-vibe-coding/CHANGELOG-local.md
- Notes: Sign-up only — sign-in flow unchanged. No backend changes.

- Date: 2026-03-09
- Issue ID: LEGAL-PAGES-POLISH
- Summary: Fixed black background on Terms/Privacy pages by removing bg-background class. Rewrote all legal content to be concise and professional. Added Contact Us dialog + button to Privacy page section 12 for parity with Terms page.
- Files touched: src/pages/TermsPage.tsx, src/pages/PrivacyPage.tsx
- Notes: Content rewritten to remove robotic template language. Background now shows sky wallpaper consistently.

- Date: 2026-03-09
- Issue ID: EMAIL-DOMAIN-CONTACT
- Summary: Replaced all @wiseresume.app emails with @thewise.cloud across TermsPage and PrivacyPage. Added Contact Us dialog (ContactInquiryDialog) to TermsPage section 14 with SLA messaging. Created send-contact-inquiry edge function and contact_inquiries DB table with RLS.
- Files touched: src/pages/TermsPage.tsx, src/pages/PrivacyPage.tsx, src/components/settings/ContactInquiryDialog.tsx (new), supabase/functions/send-contact-inquiry/index.ts (new), DB migration (contact_inquiries table)
- Notes: Dialog follows same pattern as FeatureRequestDialog. Edge function sends Resend email to developer.

- Date: 2026-03-09
- Issue ID: BYOK-ROUTING-FIX
- Summary: Fixed Gemini BYOK key retrieval failing silently due to schema mismatch. `getUserKeyFromDB` and `getUserKeyAndUrlFromDB` in `aiClient.ts` queried `base_url`/`model` columns that don't exist in the external DB, causing SELECT to fail and all requests to fall back to WiseResume AI gateway. Removed those columns from SELECT queries. Also removed `model` column query from `ai-test/index.ts`.
- Files touched: supabase/functions/_shared/aiClient.ts, supabase/functions/ai-test/index.ts
- Notes: base_url/model columns still not present in external DB — Ollama BYOK will need them added later.


- Date: 2026-03-09
- Issue ID: MANAGE-KEYS-500-FIX
- Summary: Fixed 500 error in manage-api-keys edge function. Two issues: (1) function connected to Lovable Cloud DB instead of external project — switched to EXT_SUPABASE_URL/EXT_SUPABASE_SERVICE_ROLE_KEY; (2) external DB's user_api_keys table lacks base_url/model columns — removed those from SELECT and upsert queries.
- Files touched: supabase/functions/manage-api-keys/index.ts
- Notes: base_url and model columns should be added to external project's user_api_keys table for full Ollama support.

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
