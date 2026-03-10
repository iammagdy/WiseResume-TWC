# CHANGELOG-local.md

Local changelog tracking WiseResume changes via Lovable AI sessions.

## 2026-03-10

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
