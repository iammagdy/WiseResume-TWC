
# WiseResume -- Complete App Blueprint

## 1. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| State | Zustand (persistent stores) + TanStack React Query (server state) |
| Routing | React Router v6 (nested layout routes) |
| Backend | Supabase (Auth, Postgres, Edge Functions, Storage) |
| Native | Capacitor (Android/iOS: biometrics, haptics, status bar, splash) |
| AI | 3-tier fallback: User BYOK key -> GEMINI_API_KEY -> EMERGENT_LLM_KEY |
| PDF/Docs | pdf-lib, pdfjs-dist, html2canvas, mammoth, docx, tesseract.js |
| Animation | Framer Motion |
| PWA | vite-plugin-pwa (service worker, offline) |

---

## 2. App Entry and Provider Tree

```text
main.tsx
  |-- registerSW (PWA)
  |-- <App />
        |-- QueryClientProvider (React Query)
        |-- TooltipProvider
        |-- ErrorBoundary
        |-- Toaster (sonner)
        |-- BrowserRouter
              |-- AuthProvider (Supabase auth context)
                    |-- AppRoutes (theme, biometric lock, splash)
                    |-- DeferredProviders (CommandPalette, BugReportDialog)
                    |-- AppInstallPrompt
```

---

## 3. Routing Map

### Public Routes (no auth)
| Path | Page | Description |
|------|------|-------------|
| `/` | Index | Landing page |
| `/auth` | AuthPage | Login / signup |
| `/auth/callback` | AuthCallbackPage | OAuth callback |
| `/privacy` | PrivacyPage | Privacy policy |
| `/terms` | TermsPage | Terms of service |
| `/reset-password` | ResetPasswordPage | Password reset |
| `/share/:token` | SharePage | Public resume share |
| `/p/:username` | PublicPortfolioPage | Public portfolio |
| `/l/:linkId` | ShortLinkPage | Short link resolver |

### Protected Routes (require auth, wrapped in AppShell)
| Path | Page | Skeleton |
|------|------|----------|
| `/dashboard` | DashboardPage | DashboardSkeleton |
| `/editor` | EditorPage | EditorSkeleton |
| `/preview` | PreviewPage | PreviewSkeleton |
| `/upload` | UploadPage | UploadSkeleton |
| `/settings` | SettingsPage | SettingsSkeleton |
| `/interview` | InterviewPage | InterviewSkeleton |
| `/applications` | ApplicationsPage | ApplicationsSkeleton |
| `/onboarding` | OnboardingPage | OnboardingSkeleton |
| `/profile` | ProfilePage | ProfilePageSkeleton |
| `/templates` | TemplatesPage | TemplatesPageSkeleton |
| `/resume/:id` | ResumeDetailPage | DetailSkeleton |
| `/job/:id` | JobDetailPage | DetailSkeleton |
| `/application/:id` | ApplicationTrackerPage | DetailSkeleton |
| `/notifications` | NotificationsPage | NotificationsSkeleton |
| `/portfolio` | PortfolioEditorPage | PortfolioEditorSkeleton |
| `/cover-letters` | CoverLettersPage | CoverLettersSkeleton |
| `/cover-letter/new` | CoverLetterNewPage | DetailSkeleton |
| `/cover-letter/edit/:id` | CoverLetterEditPage | DetailSkeleton |
| `/examples` | ExamplesPage | GuidesExamplesSkeleton |
| `/career` | CareerPage | DetailSkeleton |
| `/resignation-letters` | ResignationLettersPage | ResignationLettersSkeleton |
| `/resignation-letter/new` | ResignationLetterNewPage | DetailSkeleton |
| `/resignation-letter/edit/:id` | ResignationLetterEditPage | DetailSkeleton |
| `/guides` | GuidesPage | GuidesExamplesSkeleton |
| `/guides/:slug` | GuidePage | DetailSkeleton |
| `/ai-studio` | AIStudioPage | AIStudioSkeleton |

### Redirects
- `/activity` -> `/applications`
- `/jobs` -> `/applications`
- `/jobs/:id` -> RedirectJobRoute

---

## 4. Layout Architecture

```text
AppShell
  |-- OfflineBanner
  |-- SlowConnectionBanner
  |-- Header (mobile, lg:hidden) -- "WiseResume" + page title
  |-- DesktopNav (lg:block) -- sidebar navigation
  |-- <main>
  |     |-- ScrollProgressBar
  |     |-- SwipeBackWrapper (conditional)
  |     |-- <Outlet /> (page content)
  |-- BottomTabBar (mobile, 5 tabs: Home, Editor, Studio, Activity, Portfolio)
  |-- SyncConflictDialog
```

### Navigation
- **Mobile**: 5-tab BottomTabBar (Home, Editor, Studio, Activity, Portfolio)
- **Desktop**: DesktopNav sidebar
- **Settings**: Accessible via dashboard header gear icon + profile popover

---

## 5. Database Schema (20 Tables)

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `profiles` | User profile, portfolio config, social links | portfolio_resume_id -> resumes |
| `resumes` | Resume data (JSON sections) | parent_resume_id -> resumes (self-ref) |
| `resume_versions` | Version history snapshots | resume_id -> resumes |
| `resume_shares` | Share links with optional password/expiry | resume_id -> resumes |
| `share_comments` | Reviewer comments on shared resumes | share_id -> resume_shares |
| `cover_letters` | Generated cover letters | resume_id -> resumes |
| `resignation_letters` | Resignation letter documents | standalone |
| `jobs` | Saved job listings | standalone |
| `job_applications` | Application tracking | job_id -> jobs, resume_id -> resumes, cover_letter_id -> cover_letters |
| `interview_sessions` | Mock interview records | resume_id -> resumes |
| `tailor_history` | AI tailor results | resume_id -> resumes |
| `career_assessments` | Career quiz results | resume_id -> resumes |
| `ai_credits` | Daily AI usage limits | standalone |
| `ai_usage_logs` | AI action audit trail | resume_id -> resumes |
| `audit_logs` | Security/action audit | standalone |
| `bug_reports` | User-submitted bug reports | standalone |
| `feature_requests` | User feature requests | standalone |
| `notifications` | In-app notifications | standalone |
| `push_subscriptions` | Web push endpoints | standalone |
| `user_api_keys` | Encrypted BYOK keys | standalone |
| `user_preferences` | App settings sync | standalone |
| `portfolio_visits` | Portfolio analytics | short_link_id -> short_links |
| `short_links` | Branded short URLs | standalone |

### Database Functions (RPCs)
- `get_public_portfolio`, `get_portfolio_analytics`, `get_portfolio_active_status`
- `increment_portfolio_views`, `record_portfolio_visit`
- `get_shared_resume`, `increment_share_view_count`
- `add_share_comment`, `get_share_comments`
- `check_username_available`, `resolve_short_link`
- `hash_share_password`, `verify_share_password`
- `increment_ai_usage`, `cleanup_stale_data`
- `get_user_api_key_info`

### View
- `user_api_keys_safe` -- exposes key metadata without encrypted values

---

## 6. State Management

### Zustand Stores (persistent)
| Store | File | Purpose |
|-------|------|---------|
| resumeStore | `src/store/resumeStore.ts` | Active resume, section edits, undo/redo (50 snapshots), cloud sync |
| settingsStore | `src/store/settingsStore.ts` | Theme, biometric, shake-to-report, splash flag |
| offlineSyncStore | `src/store/offlineSyncStore.ts` | Pending offline mutations queue |
| proofreadStore | `src/store/proofreadStore.ts` | Proofread session state |
| aiHealthStore | `src/store/aiHealthStore.ts` | AI service health status |
| atsScoreHistoryStore | `src/store/atsScoreHistoryStore.ts` | ATS score trend data |
| contentLibraryStore | `src/store/contentLibraryStore.ts` | Reusable content snippets |
| guidesStore | `src/store/guidesStore.ts` | Guide read progress |

### React Query
- Server state caching (5min stale, 10min gc)
- Hooks: `useResumes`, `useJobs`, `useJobApplications`, `useCoverLetters`, `useResignationLetters`, `useProfile`, `useNotifications`, `usePortfolioAnalytics`, etc.

### Auth Context
- `AuthContext` + `useAuth()` hook
- Early session fetch (parallel with splash)
- Session hijack protection (active user ID tracking)
- Expired session detection + event dispatch

---

## 7. Edge Functions (39 functions)

### AI-Powered
| Function | Purpose |
|----------|---------|
| `analyze-resume` | Job match scoring + gap analysis |
| `tailor-resume` | AI resume tailoring for specific jobs |
| `enhance-section` | AI rewrite of individual sections |
| `score-resume` | ATS compatibility scoring |
| `proofread-resume` | Grammar/style checking |
| `generate-cover-letter` | AI cover letter generation |
| `generate-resignation-letter` | Resignation letter generation |
| `interview-chat` | Mock interview conversation |
| `recruiter-simulation` | Recruiter perspective feedback |
| `detect-and-humanize` | AI content detection + humanization |
| `optimize-for-linkedin` | LinkedIn profile optimization |
| `one-page-optimizer` | Condense resume to one page |
| `agentic-chat` | General AI assistant |
| `career-path-advisor` | Career trajectory advice |
| `career-assessment` | Career quiz evaluation |
| `company-briefing` | Company research for interviews |
| `generate-portfolio-bio` | AI portfolio bio writer |
| `ask-portfolio` | AI Q&A for public portfolios |
| `fill-gap` | Fill employment gaps |
| `explain-gap` | Explain employment gaps |
| `generate-headshot` | AI headshot generation |

### Document Processing
| Function | Purpose |
|----------|---------|
| `parse-resume` | PDF/image resume extraction |
| `parse-linkedin` | LinkedIn profile parsing |
| `parse-job-url` | Job listing URL scraping |
| `parse-job-text` | Job description text parsing |

### Utility
| Function | Purpose |
|----------|---------|
| `manage-api-keys` | BYOK key CRUD |
| `validate-api-key` | Key validation |
| `ai-health` | AI service health check |
| `send-bug-report` | Bug report submission |
| `send-feature-request` | Feature request submission |
| `send-push-notification` | Push notification dispatch |
| `send-resume-reminder` | Scheduled reminders |
| `weekly-digest` | Weekly email digest |
| `og-image` | Dynamic OG image generation |
| `portfolio-meta` | Portfolio SEO metadata |
| `track-portfolio-view` | Analytics tracking |
| `resolve-short-link` | Short link resolution |
| `elevenlabs-scribe-token` | Voice transcription token |

### Shared Modules (`_shared/`)
- `aiClient.ts` -- 3-tier AI provider fallback
- `authMiddleware.ts` -- JWT validation
- `cors.ts` -- CORS headers
- `rateLimiter.ts` -- Rate limiting

---

## 8. Component Architecture

### Editor (core feature, ~60 components)
```text
EditorPage
  |-- StepperNav (section navigation)
  |-- ContactSection
  |-- SummarySection
  |-- ExperienceSection (+ ExperienceTimeline, GapFiller, GapExplainer)
  |-- EducationSection
  |-- SkillsSection
  |-- CertificationsSection
  |-- AwardsSection
  |-- ProjectsSection
  |-- PublicationsSection
  |-- VolunteeringSection
  |-- HobbiesSection
  |-- LanguagesSection
  |-- ReferencesSection
  |-- LivePreviewPanel (desktop) / LivePreviewSheet (mobile)
  |-- TemplateSelector
  |-- CustomizeSheet (colors, fonts, spacing, margins)
  |-- TailorSheet (AI job tailoring)
  |-- ShareSheet / ShareFeedbackSheet
  |-- ExportOptionsSheet
  |-- ProofreadSheet
  |-- ATSScanSheet / ATSParserPreview
  |-- VersionHistorySheet
  |-- AddSectionSheet / PageBreakSheet
  |-- AIHubSheet / AgenticChatSheet
  |-- CareerPathSheet / JobAnalysisSheet
  |-- ContentLibrarySheet / CompareSheet
  |-- KeyboardToolbar / KeyboardShortcutsSheet
  |-- AI components: AIFloatingButton, AIAssistantBar, AIContextualNudge, InlineAIButton
```

### Dashboard
```text
DashboardPage
  |-- DashboardStats (resume count, score trends)
  |-- QuickActionChips
  |-- ResumeFilters + ResumeGroup + ResumeListCard
  |-- ATSScoreBreakdown + ATSScoreTrendChart
  |-- WhatsNextCard, DailyTipCard, FeatureDiscoveryCard
  |-- CareerMilestonesRow
  |-- PortfolioActivityCard
  |-- FloatingCreateButton + CreateResumeDialog
  |-- AnalyzeJobSheet, SetTargetJobSheet
  |-- HiredCelebrationModal
```

### Other Feature Modules
- `ai-studio/` -- AI experimentation (A/B compare, tour)
- `applications/` -- Job application tracker
- `career/` -- Career assessment tools
- `cover-letter/` -- Cover letter editor
- `interview/` -- Mock interview UI
- `onboarding/` -- First-run wizard
- `portfolio/` -- Portfolio editor + public view + QR codes
- `resignation/` -- Resignation letter editor
- `templates/` -- Template gallery
- `upload/` -- Resume upload + parsing
- `settings/` -- App preferences + profile editing
- `landing/` -- Marketing landing page components
- `home/` -- Home/index page components

---

## 9. Key Hooks (55+)

| Category | Hooks |
|----------|-------|
| Auth | `useAuth`, `useBiometricLock`, `useGuestMigration` |
| Resume | `useResumes`, `useResumeScore`, `useResumeVersions`, `useResumeShares`, `useResumeNudges`, `useUndoRedo`, `useUnsavedChangesGuard` |
| AI | `useAIAction`, `useAICredits`, `useAIEnhance`, `useAIHealth`, `useAIProviderInfo`, `useATSSuggestions`, `useAgenticChat`, `useProofread` |
| Jobs | `useJobs`, `useJobApplications`, `useJobActivityStats`, `useCompanyBriefing` |
| Documents | `useCoverLetters`, `useResignationLetters`, `useExportProgress` |
| Interview | `useVoiceInterview`, `useInterviewHistory`, `useElevenLabsScribe`, `useWebSpeechFallback` |
| Career | `useCareerAssessment`, `useCareerMilestones` |
| Portfolio | `usePublicPortfolio`, `usePortfolioAnalytics`, `useShareComments` |
| Platform | `useBackButton`, `useDeepLinking`, `useAppLifecycle`, `useStatusBar`, `useShakeDetect`, `useNetworkStatus`, `useNetworkQuality`, `useOfflineSync`, `useKeyboardAwareScroll` |
| UI | `use-mobile`, `useInView`, `useDoubleTap`, `useTilt`, `useEditorShortcuts`, `useBackNavigation` |
| Misc | `useProfile`, `useNotifications`, `usePushNotifications`, `useActiveStatus`, `useChangelogBadge`, `useRateApp` |

---

## 10. Native (Capacitor) Features

- Biometric lock (fingerprint/face ID via `@capgo/capacitor-native-biometric`)
- Haptic feedback (`@capacitor/haptics`)
- Status bar theming (`@capacitor/status-bar`)
- Splash screen (`@capacitor/splash-screen`)
- Deep linking (`@capacitor/app`)
- External browser (`@capacitor/browser`)
- Back button handling (Android)
- Shake-to-report bug

---

## 11. Offline and PWA

- Service worker via `vite-plugin-pwa` with auto-update
- `OfflineBanner` + `SlowConnectionBanner` UI indicators
- `offlineSyncStore` queues mutations when offline
- `useNetworkStatus` / `useNetworkQuality` hooks
- Resume data persisted locally via Zustand `persist` middleware

---

## 12. Security Architecture

- Row Level Security (RLS) on all user-owned tables
- JWT validation in edge functions (`authMiddleware.ts`)
- Rate limiting in edge functions (`rateLimiter.ts`)
- Encrypted BYOK API keys (`user_api_keys` table)
- Safe view (`user_api_keys_safe`) hides encrypted values
- Audit logging (`audit_logs` table)
- Session hijack prevention (active user ID tracking in AuthContext)
- Share passwords (hashed via `hash_share_password` RPC)
- Biometric lock for native apps

---

## 13. Current Backend Configuration

The app currently has `safeClient.ts` pointed to your personal instance (`jnsfmkzgxsviuthaqlyy.supabase.co`). You will need to recreate all 20 tables, RLS policies, RPCs, views, and triggers on that instance for the app to function. Edge functions still run on Lovable Cloud infrastructure.
