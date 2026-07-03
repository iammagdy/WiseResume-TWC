# 01 — Route Inventory

Source of truth: [`src/AppInterior.tsx`](../../src/AppInterior.tsx) (`AppRoutes`, lines 305-415). Pages are lazy-loaded via `lazyWithRetry`. Shell wrappers: `AppShell` (app chrome), `ProtectedRoute` (auth), `JobSeekerRoute` (role), `AdminRoute`, `WiseHireGuard`. Feature flags gate several routes via `FeatureGate` (`AppInterior.tsx:180`).

## Public / marketing (no auth)

| Path | Page | Notes |
|------|------|-------|
| `/` | `Index` (Landing) | Jobseeker landing; aurora + ScrollStack |
| `/enterprises` | `Index` (Landing) | Forces WiseHire mode (`AuroraLayer.tsx:40-45`) |
| `/pricing` | `PricingPage` | Public; aurora-enabled |
| `/whats-new` | `WhatsNewPage` | Public |
| `/waitlist` | `WaitlistPage` | Public |
| `/enterprise` | `EnterprisePage` (wisehire) | Marketing |
| `/privacy-policy` | `PrivacyPage` | Inside `AppShell` |
| `/terms-of-service` | `TermsPage` | Inside `AppShell` |
| `/wisehire/signup` | `WiseHireSignupPage` | Public |
| `/wisehire/signup-early-access/:code` | `WiseHireEarlyAccessPage` | Public |
| `/wisehire/terms-of-service` | `WiseHireTermsPage` | Public |
| `/wisehire/privacy-policy` | `WiseHirePrivacyPage` | Public |

## Auth

| Path | Page | Notes |
|------|------|-------|
| `/auth` | `AuthPage` | login/signup/reset views |
| `/sign-in` | `AuthPage` | alias |
| `/auth/callback` | `AuthCallbackPage` | OAuth/hash callback |
| `/auth/verify-email` | `AuthVerifyEmailPage` | Email verification lock |
| `/auth/reset-password` | `AuthResetPasswordPage` | Reset flow |

## Core app (ProtectedRoute → JobSeekerRoute → AppShell)

| Path | Page | Skeleton | Feature gate |
|------|------|----------|--------------|
| `/dashboard` | `DashboardPage` | `DashboardSkeleton` | — |
| `/editor` | `EditorPage` | `EditorSkeleton` | — |
| `/preview` | `PreviewPage` | `PreviewSkeleton` | — (query: `?id=`, `&action=download\|ats-pdf\|docx`) |
| `/upload` | `UploadPage` | `UploadSkeleton` | — |
| `/settings` | `SettingsPage` | `SettingsSkeleton` | — |
| `/interview` | `InterviewPage` | `InterviewSkeleton` | `feature_interview_coach` |
| `/applications` | `ApplicationsPage` | `ApplicationsSkeleton` | `feature_applications` |
| `/onboarding` | `OnboardingPage` | `OnboardingSkeleton` | — |
| `/profile` | `ProfilePage` | `ProfilePageSkeleton` | — |
| `/templates` | `TemplatesPage` | `TemplatesPageSkeleton` | — |
| `/resume/:id` | `ResumeDetailPage` | `DetailSkeleton` | — |
| `/job/:id` | `JobDetailPage` | `DetailSkeleton` | — |
| `/application/:id` | `ApplicationTrackerPage` | `DetailSkeleton` | `feature_applications` |
| `/notifications` | `NotificationsPage` | `NotificationsSkeleton` | — |
| `/portfolio` | `PortfolioEditorPage` | `PortfolioEditorSkeleton` | `feature_portfolio` |
| `/cover-letters` | `CoverLettersPage` | `CoverLettersSkeleton` | `feature_cover_letters` |
| `/cover-letter/new` | `CoverLetterNewPage` | `DetailSkeleton` | `feature_cover_letters` |
| `/cover-letter/edit/:id` | `CoverLetterEditPage` | `DetailSkeleton` | `feature_cover_letters` |
| `/cover-letter` | → `/cover-letter/new` | redirect | — |
| `/examples` | `ExamplesPage` | `GuidesExamplesSkeleton` | — |
| `/career` | `CareerPage` | `DetailSkeleton` | `feature_career_advisor` |
| `/resignation-letters` | `ResignationLettersPage` | `ResignationLettersSkeleton` | — |
| `/resignation-letter/new` | `ResignationLetterNewPage` | `DetailSkeleton` | — |
| `/resignation-letter/edit/:id` | `ResignationLetterEditPage` | `DetailSkeleton` | — |
| `/guides`, `/guides/:slug` | `GuidesPage`, `GuidePage` | — | — |
| `/ai-studio`, `/ai-studio/:tool` | `AIStudioPage` | `AIStudioSkeleton` | `feature_ai_studio` |
| `/help` | `HelpPage` | `DetailSkeleton` | — |
| `/analytics` | `AnalyticsPage` | `AnalyticsSkeleton` | — |
| `/subscription` | `SubscriptionPage` | `DetailSkeleton` | — |
| `/referral` | `ReferralPage` | `DetailSkeleton` | — |
| `/achievements` | `AchievementsPage` | `AchievementsSkeleton` | — |
| `/qr-code`, `/qr-batch`, `/qr-scan` | `Qr*Page` | `DetailSkeleton` | — |
| `/search` | `SearchPage` | — | — |
| `/tailoring` | → `/tailoring-hub` | **redirect** | — |
| `/tailor`, `/tailor/:resumeId` | `TailorPage` (legacy, ~1,978 lines) | — | **Not redirected** — see 03 finding |
| `/tailoring-hub` | `TailoringHubPage` | — | — |
| `/tailoring-hub/result/:resumeId` | `TailoringHubResultPage` | — | — |
| `/tailor/result/:resumeId` | `TailoringHubResultPage` | — | — |

## Public share / standalone (no app shell — `useIsPublicRoute`)

| Path | Page | Notes |
|------|------|-------|
| `/p/:username` | `PublicPortfolioPage` | Public portfolio; password gate possible |
| `/share/:token` | `SharePage` | Shared resume |
| `/share/brief/:shareToken` | `PublicBriefPage` | WiseHire brief |
| `/share/scorecard/:shareToken` | `PublicScorecardPage` | WiseHire scorecard |
| `/interview/report/:token` | `InterviewReportPage` | Public report |
| `/l/:linkId` | `ShortLinkPage` | Short-link redirect |
| `/invite/:code` | `InviteRedirectPage` | Invite |
| Custom domain (non-app hostname) | `CustomDomainPortfolioWrapper` → `PublicPortfolioPage` | `AppInterior.tsx:153-168,270-272` |

## WiseHire (WiseHireGuard)

`/wisehire/dashboard`, `/onboarding`, `/subscription`, `/settings`, `/jd-writer`, `/briefs`, `/briefs/:briefId`, `/pipeline`, `/bulk-screen`, `/scorecards/:candidateId`, `/talent-pool`, `/analytics`, `/mask-cvs`, `/clients`, `/scorecard-templates`, `/roles`. *(Recruiter product — audited only at the design-token/branding level; deep UX out of primary scope.)*

## Admin / utility (ProtectedRoute / AdminRoute)

`/devkit` (AdminRoute), `/store-screenshots`, `/screenshots-gallery`, `/wallpaper` (`WallpaperPage` exists in `src/pages` but no route wired — likely dev-only). `*` → `NotFound`.

## Overlays / floating UI (not routes)

CommandPalette (`DeferredProviders`, ⌘K), BugReportDialog, WaitlistModal, QuickTailorSheet, ConsentBanner, AnnouncementBanner, BroadcastBanner, ActingAsBanner (impersonation), WiseWorkspaceDrawer (AI assistant), AppMobileSidebarSheet (mobile nav FAB), import-job sheet, export sheets, AI-studio sheets, bottom sheets (`BottomSheetProvider`).

**Counts:** ~70 page components in `src/pages` (+ `src/pages/wisehire`, `src/pages/share`); ~60 jobseeker/public/auth routes; 17 WiseHire routes; 8 public-standalone routes.
