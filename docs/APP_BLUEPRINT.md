# WiseResume — Complete App Blueprint

> **Purpose**: This document is a comprehensive reference for an AI agent to fully understand and recreate the WiseResume application. It covers every screen, component tree, data model, navigation flow, design system token, and backend function in the app.

---

## Table of Contents

1. [App Identity & Overview](#1-app-identity--overview)
2. [Technology Stack](#2-technology-stack)
3. [Design System](#3-design-system)
4. [App Entry & Provider Tree](#4-app-entry--provider-tree)
5. [Complete Routing Map](#5-complete-routing-map)
6. [Layout Architecture](#6-layout-architecture)
7. [Screen-by-Screen Breakdown](#7-screen-by-screen-breakdown)
8. [Resume Templates](#8-resume-templates-30)
9. [Data Models (TypeScript)](#9-data-models-typescript)
10. [Database Schema](#10-database-schema-20-tables)
11. [State Management](#11-state-management)
12. [Edge Functions](#12-edge-functions-39)
13. [Hooks Reference](#13-hooks-reference-56)
14. [Navigation Flow](#14-navigation-flow)
15. [Native Features (Capacitor)](#15-native-features-capacitor)
16. [Offline & PWA](#16-offline--pwa)
17. [Security Architecture](#17-security-architecture)
18. [Visual Screen Mockups](#18-visual-screen-mockups)

---

## 1. App Identity & Overview

| Property | Value |
|----------|-------|
| **Name** | WiseResume |
| **Brand** | WiseUniverse |
| **Mascot** | Wise AI (sparkle icon throughout UI) |
| **Tagline** | "AI-Powered Resume Builder" |
| **Platform** | Mobile-first PWA + Capacitor (Android/iOS) |
| **Target Users** | Job seekers optimizing resumes, preparing for interviews |
| **Default Theme** | Dark mode (space-inspired aesthetic) |
| **Base Font Size** | 14.5px mobile, 16px desktop (compact density) |

**Value Proposition**: All-in-one career toolkit — resume builder with 30 templates, AI tailoring for specific jobs, ATS scoring, mock interviews with voice, cover/resignation letter generation, portfolio hosting, and job application tracking.

---

## 2. Technology Stack

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| **Framework** | React + TypeScript + Vite | React 18.3, Vite 5 |
| **Styling** | Tailwind CSS + shadcn/ui (Radix primitives) | tailwindcss-animate plugin |
| **Animation** | Framer Motion | v12+ |
| **State (client)** | Zustand with `persist` middleware | 8 stores |
| **State (server)** | TanStack React Query | v5 |
| **Routing** | React Router | v6 (nested layouts) |
| **Backend** | Supabase (Auth, Postgres, Edge Functions, Storage) | — |
| **Native** | Capacitor | v8 (Android + iOS) |
| **Biometrics** | @capgo/capacitor-native-biometric | v8 |
| **Haptics** | @capacitor/haptics | v8 |
| **PDF Generation** | pdf-lib + html2canvas | — |
| **PDF Parsing** | pdfjs-dist | v4.4 |
| **Word Docs** | mammoth (read) + docx (write) | — |
| **OCR** | tesseract.js | v7 |
| **Voice** | ElevenLabs Scribe API + Web Speech API | — |
| **QR Codes** | qr-code-styling | — |
| **Charts** | Recharts | — |
| **Forms** | React Hook Form + Zod | — |
| **Markdown** | react-markdown | — |
| **PWA** | vite-plugin-pwa | Service worker with auto-update |
| **IDs** | uuid v13 | — |

---

## 3. Design System

### 3.1 Breakpoints

```
xs: 375px   (iPhone SE — primary target)
sm: 640px
md: 768px   (tablet)
lg: 1024px  (desktop sidebar appears)
xl: 1280px
2xl: 1400px
```

### 3.2 Fonts

| Role | Font | Weight |
|------|------|--------|
| Body (`font-sans`) | Inter | 400-700 |
| Display (`font-display`) | Space Grotesk | 600 (headings h1-h6) |

### 3.3 Color System (HSL CSS Variables)

All colors are defined as HSL values in `index.css` and consumed via Tailwind tokens. **Never use raw hex/rgb in components.**

#### Dark Mode (default `:root`)

| Token | HSL Value | Description |
|-------|-----------|-------------|
| `--background` | `240 20% 4%` | Deep space black |
| `--foreground` | `0 0% 98%` | Near-white text |
| `--card` | `240 15% 8%` | Card surfaces |
| `--primary` | `355 90% 60%` | Vibrant red (brand) |
| `--secondary` | `185 100% 50%` | Cyan accent |
| `--accent` | `330 100% 65%` | Hot pink |
| `--muted` | `240 15% 15%` | Subdued surfaces |
| `--muted-foreground` | `240 10% 68%` | Secondary text |
| `--destructive` | `0 84% 60%` | Error red |
| `--success` | `145 100% 50%` | Lime green |
| `--warning` | `45 100% 55%` | Amber |
| `--border` | `240 15% 18%` | Subtle borders |
| `--input` | `240 15% 12%` | Input backgrounds |
| `--ring` | `355 90% 60%` | Focus ring (matches primary) |
| `--radius` | `1rem` | Border radius base |

#### Light Mode (`.light` class)

| Token | HSL Value |
|-------|-----------|
| `--background` | `0 0% 100%` |
| `--foreground` | `240 10% 10%` |
| `--card` | `0 0% 98%` |
| `--primary` | `355 75% 50%` |
| `--secondary` | `185 80% 45%` |
| `--accent` | `330 80% 55%` |
| `--muted` | `240 5% 92%` |
| `--success` | `145 70% 40%` |
| `--warning` | `45 90% 48%` |

#### Space Theme Tokens (dark only)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--space-deep` | `240 30% 3%` | Landing page deep background |
| `--space-nebula` | `270 60% 15%` | Nebula effect |
| `--space-star` | `45 100% 75%` | Star particles |
| `--space-cyan` | `185 100% 60%` | Glowing cyan accents |
| `--space-glow` | `270 100% 70%` | Purple glow |

#### Sidebar Tokens

| Token | Dark | Light |
|-------|------|-------|
| `--sidebar-background` | `240 15% 6%` | `0 0% 98%` |
| `--sidebar-primary` | `355 90% 60%` | `355 75% 50%` |
| `--sidebar-accent` | `240 15% 12%` | `240 5% 92%` |

### 3.4 Typography Utilities

```css
.text-h1      → font-display font-bold, clamp(1.5rem, 7vw, 2rem)
.text-h2      → font-display text-2xl font-bold
.text-h3      → font-display text-xl font-semibold
.text-body    → text-base, line-height 1.6
.text-caption → text-sm uppercase tracking-wider
.text-tiny    → text-xs font-medium
.text-page-title    → clamp(1.125rem, 4.5vw, 1.375rem)
.text-section-header → clamp(1rem, 4vw, 1.125rem)
.text-label   → text-xs text-muted-foreground
```

### 3.5 Spacing Utilities

```css
.px-edge       → px-3 md:px-4        (page edge padding)
.space-section → mb-4 md:mb-6        (between sections)
.p-card        → p-3 md:p-4          (card internal padding)
.safe-top/bottom/left/right → env(safe-area-inset-*)
```

### 3.6 Glass Surface System

```css
.glass          → card/0.7 + blur(20px) + border/0.3
.glass-card     → card/0.5 + blur(16px) + primary shadow
.glass-surface  → card/0.6 + blur(16px) + border/0.3
.glass-elevated → card/0.5 + blur(24px) + elevated shadow
.glass-input    → input/0.5 + blur(8px) + focus glow
.glass-header   → background/0.85 + blur(20px)
```

> **Native APK**: All `backdrop-filter` disabled for WebView performance. Fallback uses opaque backgrounds.

### 3.7 Gradient Utilities

```css
.gradient-primary  → linear-gradient(135deg, primary → accent)
.gradient-secondary → linear-gradient(135deg, secondary → primary)
.gradient-text     → 3-stop gradient with background-clip: text
.glow-primary      → box-shadow with primary color
.glow-accent       → box-shadow with accent color
```

### 3.8 Animations

| Name | Duration | Description |
|------|----------|-------------|
| `fade-in` | 0.5s | translateY(10px) → 0, opacity |
| `slide-up` | 0.6s | translateY(20px) → 0, opacity |
| `scale-in` | 0.3s | scale(0.95) → 1, opacity |
| `shimmer` | 2s infinite | Background position sweep |
| `gradient-shift` | 20s infinite | Background position oscillation |
| `float` | 3s infinite | translateY(0 → -8px → 0) |
| `glow-pulse` | 2s infinite | box-shadow intensity oscillation |
| `twinkle` | 3s infinite | opacity + scale pulse (stars) |
| `orbit` | 20s linear infinite | 360° rotation |
| `float-slow` | 6s infinite | Multi-axis float |
| `pulse-glow-cosmic` | 3s infinite | Purple/cyan cosmic glow |
| `shooting-star` | 3s infinite | Diagonal translate + fade |

### 3.9 Dark Mode Toggle

- Class-based: `.dark` / `.light` on `<html>`
- System preference support via `prefers-color-scheme` media query
- Stored in `settingsStore.theme` (`'light' | 'dark' | 'system'`)
- Smooth transitions on `background-color` (0.4s) and `color` (0.3s)

---

## 4. App Entry & Provider Tree

```text
main.tsx
  ├── registerSW() (PWA service worker)
  └── <App />
        └── QueryClientProvider (staleTime: 5min, gcTime: 10min, retry: 1)
              └── TooltipProvider
                    └── ErrorBoundary
                          ├── Toaster (sonner)
                          └── BrowserRouter
                                └── AuthProvider
                                      ├── AppRoutes
                                      │     ├── useBackButton()
                                      │     ├── useStatusBarThemeSync()
                                      │     ├── useDeepLinking()
                                      │     ├── useShakeDetect()
                                      │     ├── useAppLifecycle()
                                      │     ├── AnimatedSplash (first launch only)
                                      │     ├── BiometricLockScreen (when locked)
                                      │     └── <Routes> (all page routes)
                                      ├── DeferredProviders (2s delay)
                                      │     ├── CommandPalette
                                      │     └── BugReportDialog
                                      └── AppInstallPrompt (PWA install banner)
```

### AuthProvider Details
- Eagerly fetches session at module load (parallel with splash)
- Tracks `activeUserIdRef` to prevent session hijacking
- Detects unexpected sign-outs (`app:session-expired` event)
- Updates `profiles.last_active_at` on login
- Runs `migrateLocalKeysToServer()` and `runDailyCleanup()` on auth
- 5s timeout fallback if session fetch hangs

---

## 5. Complete Routing Map

### Public Routes (no auth required)

| Path | Page Component | Skeleton | Notes |
|------|---------------|----------|-------|
| `/` | `Index` | None (eagerly loaded) | Landing page |
| `/auth` | `AuthPage` | `AuthSkeleton` | Login/signup |
| `/auth/callback` | `AuthCallbackPage` | `PageLoadingSpinner` | OAuth redirect |
| `/privacy` | `PrivacyPage` | `PageLoadingSpinner` | — |
| `/terms` | `TermsPage` | `PageLoadingSpinner` | — |
| `/reset-password` | `ResetPasswordPage` | `PageLoadingSpinner` | — |
| `/share/:token` | `SharePage` | `ShareSkeleton` | Outside AppShell |
| `/p/:username` | `PublicPortfolioPage` | `DetailSkeleton` | Outside AppShell |
| `/l/:linkId` | `ShortLinkPage` | `DetailSkeleton` | Outside AppShell |

### Protected Routes (require auth, wrapped in AppShell)

| Path | Page Component | Skeleton |
|------|---------------|----------|
| `/dashboard` | `DashboardPage` | `DashboardSkeleton` |
| `/editor` | `EditorPage` | `EditorSkeleton` |
| `/preview` | `PreviewPage` | `PreviewSkeleton` |
| `/upload` | `UploadPage` | `UploadSkeleton` |
| `/settings` | `SettingsPage` | `SettingsSkeleton` |
| `/interview` | `InterviewPage` | `InterviewSkeleton` |
| `/applications` | `ApplicationsPage` | `ApplicationsSkeleton` |
| `/onboarding` | `OnboardingPage` | `OnboardingSkeleton` |
| `/profile` | `ProfilePage` | `ProfilePageSkeleton` |
| `/templates` | `TemplatesPage` | `TemplatesPageSkeleton` |
| `/resume/:id` | `ResumeDetailPage` | `DetailSkeleton` |
| `/job/:id` | `JobDetailPage` | `DetailSkeleton` |
| `/application/:id` | `ApplicationTrackerPage` | `DetailSkeleton` |
| `/notifications` | `NotificationsPage` | `NotificationsSkeleton` |
| `/portfolio` | `PortfolioEditorPage` | `PortfolioEditorSkeleton` |
| `/cover-letters` | `CoverLettersPage` | `CoverLettersSkeleton` |
| `/cover-letter/new` | `CoverLetterNewPage` | `DetailSkeleton` |
| `/cover-letter/edit/:id` | `CoverLetterEditPage` | `DetailSkeleton` |
| `/examples` | `ExamplesPage` | `GuidesExamplesSkeleton` |
| `/career` | `CareerPage` | `DetailSkeleton` |
| `/resignation-letters` | `ResignationLettersPage` | `ResignationLettersSkeleton` |
| `/resignation-letter/new` | `ResignationLetterNewPage` | `DetailSkeleton` |
| `/resignation-letter/edit/:id` | `ResignationLetterEditPage` | `DetailSkeleton` |
| `/guides` | `GuidesPage` | `GuidesExamplesSkeleton` |
| `/guides/:slug` | `GuidePage` | `DetailSkeleton` |
| `/ai-studio` | `AIStudioPage` | `AIStudioSkeleton` |

### Redirects

| From | To |
|------|----|
| `/activity` | `/applications` |
| `/jobs` | `/applications` |
| `/jobs/:id` | `RedirectJobRoute` component |

### Lazy Loading

All pages except `Index` (eagerly loaded for LCP) use `lazyWithRetry()` — a wrapper around `React.lazy` with automatic retry on chunk load failures.

---

## 6. Layout Architecture

### AppShell Component Tree

```text
AppShell
  ├── <a> Skip-to-content (sr-only)
  ├── OfflineBanner
  ├── SlowConnectionBanner
  ├── <header> (mobile only, lg:hidden)
  │     └── "WiseResume" brand + page title breadcrumb
  ├── DesktopNav (lg:block, sidebar navigation)
  ├── <main>
  │     └── Scroll container (ref for scroll-to-top on route change)
  │           ├── ScrollProgressBar
  │           ├── SwipeBackWrapper (conditional, not on editor/exit routes)
  │           └── <Outlet /> (page content with fade-in animation)
  ├── BottomTabBar (mobile only, lg:hidden)
  └── SyncConflictDialog
```

### BottomTabBar (5 tabs)

| Tab | Icon | Path | Match Paths |
|-----|------|------|-------------|
| **Home** | `Home` | `/dashboard` | `/dashboard`, `/settings`, `/profile`, `/notifications`, `/templates`, `/examples`, `/guides`, `/resume`, `/onboarding` |
| **Editor** | `FileText` | `/editor` | `/editor`, `/preview` |
| **AI Tools** | `Sparkles` | `/ai-studio` | `/ai-studio`, `/career`, `/cover-letter*`, `/resignation-letter*`, `/interview` |
| **Activity** | `BarChart3` | `/applications` | `/applications`, `/application`, `/job` |
| **Portfolio** | `Globe` | `/portfolio` | `/portfolio` |

**Tab Features**:
- Animated pill indicator (Framer Motion `layoutId` spring animation)
- Discovery dots for first-time users (AI Tools, Portfolio)
- Changelog badge on Home tab
- Offline sync pending count on Home tab
- Haptic feedback on tap
- Editor tab is "guarded" — auto-loads latest resume or prompts creation
- `glass-surface` background with rounded top corners

### TAB_ROUTES (routes showing bottom nav)

```
/dashboard, /upload, /settings, /interview, /editor, /preview,
/applications, /onboarding, /profile, /templates, /resume, /job,
/application, /notifications, /cover-letters, /cover-letter,
/examples, /career, /resignation-letter, /guides, /ai-studio, /portfolio
```

### DesktopNav

Desktop sidebar (visible at `lg:` breakpoint and above) with the same navigation structure as BottomTabBar plus additional links.

### Header (Mobile)

- Height: `h-10`
- Content: "WiseResume" brand text + `/ Page Title` breadcrumb
- Uses `glass-surface` background with border
- Hidden on editor routes
- Uses `getPageTitle()` from `src/lib/pageTitles.ts`

### Page Title Map

```
/editor → "Editor"           /preview → "Preview"
/upload → "Import Resume"    /ai-studio → "AI Tools"
/interview → "Interview Prep" /career → "Career Path"
/cover-letter → "Cover Letter" /cover-letters → "Cover Letters"
/resignation-letter → "Resignation Letter"
/resignation-letters → "Resignation Letters"
/applications → "Activity"   /application → "Application"
/job → "Job Details"         /settings → "Settings"
/profile → "Profile"         /notifications → "Notifications"
/templates → "Templates"     /examples → "Examples"
/guides → "Guides"           /resume → "Resume"
/onboarding → "Getting Started" /portfolio → "Portfolio"
/dashboard → "Home"
```

---

## 7. Screen-by-Screen Breakdown

### 7.1 Landing Page (`/`)

**Component**: `Index` (eagerly loaded)

```text
Index
  ├── Space-themed animated background (stars, nebula, shooting stars)
  ├── HeroSection
  │     ├── Gradient headline
  │     ├── Subtitle
  │     ├── CTA buttons (Get Started, See Demo)
  │     └── Floating feature badges
  ├── FeaturesGrid
  │     └── Feature cards with icons (AI Tailor, ATS Score, Interview Prep, etc.)
  ├── ComparisonTable (WiseResume vs competitors)
  ├── PortfolioDemo (interactive preview)
  ├── EditorDemo (interactive preview)
  ├── Footer
  │     ├── Brand
  │     ├── Links (Privacy, Terms)
  │     └── Social links
  └── Animated gradient orbs / particles
```

### 7.2 Auth Page (`/auth`)

```text
AuthPage
  ├── EmailEntryStep (email input → determines login vs signup)
  ├── LoginForm (password input, "Forgot password?" link)
  ├── SignupForm (password + confirm, terms checkbox)
  ├── MagicLinkSent (confirmation UI)
  ├── VerifyEmail (post-signup verification prompt)
  ├── ResetPasswordForm
  ├── Social Auth Buttons (Google, Apple)
  └── Rate limiting / cooldown UI
```

**Auth Features**:
- Email/password authentication
- Magic link option
- OAuth (Google, Apple)
- Email verification required
- Cooldown after failed attempts
- Auto-redirect to `/dashboard` on success

### 7.3 Dashboard (`/dashboard`)

```text
DashboardPage
  ├── Profile Header
  │     ├── Avatar
  │     ├── Greeting ("Good morning, [Name]")
  │     ├── Gear icon → /settings
  │     └── ProfilePopover (edit profile, sign out)
  ├── DashboardStats (resume count, avg ATS score, applications)
  ├── QuickActionChips (Create, Upload, Tailor, Templates)
  ├── OnboardingCarousel (first-time users)
  ├── ResumeFilters
  │     ├── Search input
  │     ├── Sort dropdown (recent, name, score)
  │     ├── Category filter
  │     └── Score range filter
  ├── ResumeGroup → ResumeListCard (for each resume)
  │     ├── Template preview thumbnail
  │     ├── Title, target job, score badge
  │     ├── Last modified timestamp
  │     └── Actions (edit, duplicate, delete, share)
  ├── WhatsNextCard (contextual next-step suggestions)
  ├── DailyTipCard (AI enhancement tips)
  ├── FeatureDiscoveryCard (discover new features)
  ├── ATSScoreBreakdown + ATSScoreTrendChart
  ├── CareerMilestonesRow
  ├── PortfolioActivityCard
  ├── FloatingCreateButton (fixed FAB)
  │     └── Mobile: popup menu (New, Tailor, Analyze)
  │     └── Desktop: pill button
  ├── CreateResumeDialog (modal for new resume creation)
  ├── AnalyzeJobSheet (paste job description for analysis)
  ├── SetTargetJobSheet
  └── HiredCelebrationModal (confetti animation)
```

### 7.4 Editor (`/editor`)

**The core feature — most complex screen.**

```text
EditorPage
  ├── Editor Header (back button with unsaved guard, title, save status)
  ├── ProgressBar (section completion %)
  ├── StepperNav (horizontal scrollable section tabs)
  │     └── Contact | Summary | Experience | Education | Skills | [Optional sections]
  ├── Section Content (one active section at a time)
  │     ├── ContactSection (form fields: name, email, phone, location, linkedin, portfolio, photo)
  │     ├── SummarySection (textarea + AI enhance button + character count)
  │     ├── ExperienceSection
  │     │     ├── ExperienceTimeline (visual timeline)
  │     │     ├── Experience cards (company, position, dates, achievements)
  │     │     ├── InlineAIButton (enhance each bullet point)
  │     │     ├── GapFiller (detect and fill employment gaps)
  │     │     └── GapExplainer (generate gap explanations)
  │     ├── EducationSection (institution, degree, field, dates, GPA)
  │     ├── SkillsSection (tag input, categorization, AI suggestions)
  │     ├── CertificationsSection
  │     ├── AwardsSection
  │     ├── ProjectsSection (name, role, technologies, description, URLs)
  │     ├── PublicationsSection
  │     ├── VolunteeringSection
  │     ├── HobbiesSection
  │     ├── LanguagesSection
  │     └── ReferencesSection
  ├── KeyboardToolbar (mobile: formatting shortcuts above keyboard)
  ├── Undo/Redo buttons (50-step history)
  ├── Cloud sync status indicator
  │
  ├── Toolbar Actions (bottom bar / sheet triggers)
  │     ├── TemplateSelector → template gallery sheet
  │     ├── CustomizeSheet → colors, fonts, spacing, margins, line height, page format
  │     ├── ShareSheet → generate share link, set password/expiry
  │     ├── ShareFeedbackSheet → view reviewer comments
  │     ├── ExportOptionsSheet → PDF, DOCX, plain text, ATS-optimized, LinkedIn
  │     ├── ATSScanSheet → ATS compatibility analysis
  │     ├── ATSParserPreview → see how ATS systems parse the resume
  │     ├── ProofreadSheet → grammar/style checking
  │     ├── VersionHistorySheet → browse and restore past versions
  │     ├── AddSectionSheet → add optional sections
  │     ├── PageBreakSheet → control page breaks
  │     ├── ContentLibrarySheet → save/reuse content snippets
  │     ├── CompareSheet → side-by-side resume comparison
  │     ├── AIHubSheet → access all AI tools
  │     ├── AgenticChatSheet → general AI assistant
  │     ├── CareerPathSheet → career trajectory advice
  │     ├── JobAnalysisSheet → analyze job description
  │     ├── TailorSheet → AI resume tailoring workflow
  │     └── KeyboardShortcutsSheet → shortcut reference
  │
  ├── LivePreviewPanel (desktop: side-by-side split view)
  └── LivePreviewSheet (mobile: bottom sheet with rendered resume)
```

**Editor AI Features**:
- `AIFloatingButton` — global AI action trigger
- `AIAssistantBar` — inline AI suggestions bar
- `AIContextualNudge` — context-aware tips
- `InlineAIButton` — per-field AI enhancement

### 7.5 Preview (`/preview`)

```text
PreviewPage
  ├── Template rendering (selected template applied to resume data)
  ├── Page navigation (multi-page resumes)
  ├── Zoom controls
  ├── Page break indicators
  ├── Export button → ExportOptionsSheet
  └── Template switch shortcut
```

### 7.6 Upload (`/upload`)

```text
UploadPage
  ├── UploadZone (drag & drop area)
  │     ├── Accepts: PDF, DOCX, DOC, images (PNG, JPG)
  │     └── File size limit indicator
  ├── FileTypeSelector (tabs: PDF, Word, Image, LinkedIn)
  ├── UploadProgressSteps (animated progress: Upload → Parse → Review)
  ├── OCRPromptDialog (for image uploads — confirm OCR processing)
  ├── ImportReviewSheet (review parsed data before importing)
  ├── ATSScorePreview (quick score of uploaded resume)
  └── ATSValidationChecklist (validation results)
```

### 7.7 AI Studio (`/ai-studio`)

```text
AIStudioPage
  ├── AIEngineBadge (shows current AI provider)
  ├── AICreditsIndicator (daily usage / limit)
  ├── Tool Grid (18 AI tools in categorized cards)
  │     ├── Resume Tools: Tailor, Score, Enhance, Proofread, One-Page Optimizer
  │     ├── Career Tools: Career Path, Career Assessment, Company Briefing
  │     ├── Documents: Cover Letter, Resignation Letter
  │     ├── Interview: Mock Interview, Recruiter Simulation
  │     ├── Optimization: LinkedIn Optimizer, Detect & Humanize
  │     ├── Content: Fill Gap, Explain Gap, Portfolio Bio
  │     └── Advanced: Agentic Chat (general AI assistant)
  ├── Chat input with suggestion chips
  ├── AI Studio Tour (first-time walkthrough)
  └── Lazy-loaded sheets for each tool
```

### 7.8 Interview (`/interview`)

```text
InterviewPage
  ├── InterviewSetup
  │     ├── Mode selection (Behavioral, Technical, Case Study, Mixed)
  │     ├── Job title input
  │     ├── Job description (optional)
  │     └── Start button
  ├── InterviewPreview
  │     └── Question category breakdown
  ├── Voice Conversation UI
  │     ├── TranscriptBubble (user + AI messages)
  │     ├── Audio visualization (waveform)
  │     ├── Voice recording controls (start/stop/pause)
  │     ├── Timer display
  │     └── Web Speech API fallback (when ElevenLabs unavailable)
  ├── InterviewSummary
  │     ├── Overall score
  │     ├── Category scores (communication, technical, behavioral)
  │     ├── Strengths list
  │     └── Improvements list
  ├── InterviewHistorySheet (past sessions)
  └── CompanyBriefingSheet (research company before interview)
```

### 7.9 Applications (`/applications`)

```text
ApplicationsPage
  ├── StatusFilter (All, Applied, Interviewing, Offered, Rejected, Saved)
  ├── ApplicationCard (for each application)
  │     ├── Company + job title
  │     ├── Status badge (color-coded)
  │     ├── Applied date
  │     ├── Deadline indicator
  │     └── Actions (update status, add notes, delete)
  ├── JobActivityStats (total, this week, response rate)
  ├── ActivityStreak (consecutive days of activity)
  ├── ActivityTimeline (chronological view)
  ├── AddApplicationSheet (create new application)
  ├── SaveJobSheet (save job for later)
  └── JobSearchSheet (search/browse jobs)
```

### 7.10 Portfolio Editor (`/portfolio`)

```text
PortfolioEditorPage
  ├── Portfolio toggle (enable/disable public portfolio)
  ├── Username picker (unique vanity URL: /p/username)
  ├── Theme selection (multiple visual themes)
  ├── Section arrangement (drag to reorder)
  │     ├── About / Bio
  │     ├── Experience
  │     ├── Education
  │     ├── Skills
  │     ├── Projects
  │     ├── Contact
  │     └── Custom sections
  ├── Accent color picker
  ├── Font selection
  ├── Layout options
  ├── SEO settings (meta title, meta description)
  ├── QR code generator (for printed resumes)
  ├── Short link manager (create branded short URLs)
  ├── VisitorsPanel (analytics)
  │     ├── Total views
  │     ├── Unique visitors
  │     ├── Geographic distribution
  │     ├── Referrer sources
  │     └── Section engagement
  └── Preview button (opens /p/username)
```

### 7.11 Public Portfolio (`/p/:username`)

```text
PublicPortfolioPage (outside AppShell, no auth required)
  ├── Portfolio theme applied
  ├── Profile header (name, title, avatar, social links)
  ├── Bio section
  ├── Experience timeline
  ├── Education
  ├── Skills visualization
  ├── Projects gallery
  ├── Contact form / links
  ├── "Ask AI" widget (visitors can ask questions about the portfolio owner)
  └── "Built with WiseResume" footer badge
```

### 7.12 Settings (`/settings`)

```text
SettingsPage
  ├── Section Chips (horizontal scrollable categories)
  │     ├── Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About
  ├── Account Section
  │     ├── EditProfileSheet (name, job title, location, avatar, social links)
  │     ├── Change email
  │     └── Delete account
  ├── Appearance Section
  │     ├── ThemeToggle (Light / Dark / System)
  │     └── Reduced motion toggle
  ├── AI & Voice Section
  │     ├── AISettingsSheet
  │     │     ├── AI Provider selection (WiseResume default vs BYOK Gemini)
  │     │     ├── API key management
  │     │     └── Daily usage display
  │     ├── ElevenLabsKeySheet (voice API key)
  │     └── Auto-proofread toggle
  ├── Editor Section
  │     ├── Default template selection
  │     ├── PDF defaults (page numbers, branding)
  │     └── Auto-save preferences
  ├── Notifications Section
  │     ├── Auto-save toast mode (always / errors-only)
  │     ├── AI tip frequency (daily / weekly / on-demand)
  │     ├── Quiet hours (start/end time)
  │     └── Push notification toggle
  ├── Privacy Section
  │     ├── BiometricSetupSheet (enable fingerprint/face lock)
  │     ├── Biometric timeout setting
  │     ├── Shake-to-report toggle
  │     ├── Local-only mode toggle
  │     ├── Analytics toggle
  │     └── DataExportSheet (export all data)
  ├── About Section
  │     ├── App version
  │     ├── DeveloperCreditCard
  │     ├── Privacy Policy link
  │     ├── Terms of Service link
  │     └── DeleteDataDialog (destructive: delete all data)
  └── Reset settings button
```

### 7.13 Cover Letters (`/cover-letters`, `/cover-letter/new`, `/cover-letter/edit/:id`)

```text
CoverLettersPage
  ├── CoverLetterCard list (saved cover letters)
  │     ├── Title, company, job title
  │     ├── Preview snippet
  │     ├── Created date
  │     └── Actions (edit, duplicate, delete, export)
  └── Create button → /cover-letter/new

CoverLetterNewPage / CoverLetterEditPage
  ├── Job title + company inputs
  ├── Tone selector (Professional, Friendly, Enthusiastic, Formal)
  ├── Template style selector
  ├── Resume selector (which resume to base it on)
  ├── AI generation button
  ├── Rich text editor for manual edits
  ├── Export options (PDF, DOCX, plain text)
  └── Save / Update button
```

### 7.14 Resignation Letters (`/resignation-letters`, `/resignation-letter/new`, `/resignation-letter/edit/:id`)

```text
ResignationLettersPage
  └── Similar structure to Cover Letters

ResignationLetterNewPage / ResignationLetterEditPage
  ├── Company, position, recipient name inputs
  ├── Last working day date picker
  ├── Notice period
  ├── Reason selector
  ├── Tone selector
  ├── AI generation
  ├── ResignationChecklist (step-by-step departure checklist)
  │     ├── Give notice
  │     ├── Transition responsibilities
  │     ├── Return company property
  │     ├── Update benefits
  │     └── Final tasks
  └── Export options
```

### 7.15 Career (`/career`)

```text
CareerPage
  ├── CareerQuizSheet (multi-step career assessment quiz)
  ├── CareerRoadmap (visual career path visualization)
  │     ├── Current position
  │     ├── Suggested next roles
  │     ├── Required skills for each path
  │     └── Timeline estimates
  └── SkillGapAnalyzer (compare current skills vs target role)
```

### 7.16 Templates (`/templates`)

```text
TemplatesPage
  ├── Category filters (All, Professional, Tech, Creative, Minimalist)
  ├── ATS compatibility filter (High, Medium, Low)
  ├── Template grid (30 templates)
  │     ├── Preview thumbnail
  │     ├── Template name
  │     ├── ATS score badge
  │     └── Select button
  └── Live preview on selection
```

### 7.17 Onboarding (`/onboarding`)

```text
OnboardingPage
  ├── Step 1: Welcome + name entry
  ├── Step 2: Career level selection (entry/mid/senior/executive)
  ├── Step 3: Primary goal (new job, career change, update resume)
  └── Step 4: Template selection → navigate to editor
```

---

## 8. Resume Templates (30)

| ID | Name | Category | ATS |
|----|------|----------|-----|
| `modern` | Modern | professional | high |
| `classic` | Classic | professional | high |
| `minimal` | Minimal | minimalist | high |
| `professional` | Professional | professional | high |
| `developer` | Developer | tech | high |
| `creative` | Creative | creative | medium |
| `executive` | Executive | professional | high |
| `compact` | Compact | minimalist | high |
| `academic` | Academic | professional | high |
| `healthcare` | Healthcare | professional | high |
| `sales` | Sales | professional | high |
| `elegant` | Elegant | creative | medium |
| `corporate` | Corporate | professional | high |
| `banking` | Banking | professional | high |
| `consulting` | Consulting | professional | high |
| `federal` | Federal | professional | high |
| `legal` | Legal | professional | high |
| `marketing` | Marketing | creative | medium |
| `designer` | Designer | creative | medium |
| `portfolio` | Portfolio | creative | low |
| `startup` | Startup | tech | medium |
| `infographic` | Infographic | creative | low |
| `data-science` | Data Science | tech | high |
| `devops` | DevOps | tech | high |
| `cyber` | Cybersecurity | tech | high |
| `product` | Product | tech | high |
| `clean` | Clean | minimalist | high |
| `swiss` | Swiss | minimalist | high |
| `mono` | Mono | minimalist | high |
| `zen` | Zen | minimalist | high |

**TemplateId type**: `'modern' | 'classic' | 'minimal' | 'professional' | 'developer' | 'creative' | 'executive' | 'compact' | 'academic' | 'healthcare' | 'sales' | 'elegant' | 'corporate' | 'banking' | 'consulting' | 'federal' | 'legal' | 'marketing' | 'designer' | 'portfolio' | 'startup' | 'infographic' | 'data-science' | 'devops' | 'cyber' | 'product' | 'clean' | 'swiss' | 'mono' | 'zen'`

---

## 9. Data Models (TypeScript)

### Core Resume Types

```typescript
interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  photoUrl?: string;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  responsibilities?: string[];
  isProject?: boolean;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  technologies: string[];
  description: string;
  url?: string;
  githubUrl?: string;
}

interface Publication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  coAuthors?: string;
  url?: string;
  description?: string;
}

interface Volunteering {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  hours?: string;
}

interface Hobby {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
}

interface Language {
  id: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'basic';
}

interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
  availableOnRequest?: boolean;
}

interface TemplateCustomization {
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  fontSize: 'small' | 'medium' | 'large';
  layout: 'single' | 'two-column';
  spacing: 'compact' | 'normal' | 'spacious';
  margins: 'narrow' | 'normal' | 'wide';
  lineHeight: 'single' | '1.15' | '1.5' | 'double';
  pageFormat: 'a4' | 'letter';
}

interface ResumeData {
  id?: string;
  contactInfo: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  awards?: Award[];
  projects?: Project[];
  publications?: Publication[];
  volunteering?: Volunteering[];
  hobbies?: Hobby[];
  references?: Reference[];
  languages?: Language[];
  templateId: string;
  customization?: TemplateCustomization;
  createdAt?: string;
  updatedAt?: string;
}
```

### AI Analysis Types

```typescript
interface JobMatchScore {
  overallScore: number;
  skillsMatch: number;
  experienceRelevance: number;
  keywordAlignment: number;
  atsCompatibility: number;
  strengths: string[];
  improvements: string[];
}

interface GapAnalysis {
  missingKeywords: string[];
  missingSkills: string[];
  suggestedSections: string[];
  recommendedPhrases: string[];
  priorityImprovements: {
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    impact: string;
  }[];
}

interface JobIntelligence {
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  salaryRange?: { min: number; max: number; currency: string };
  workMode: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  companyCultureSignals: string[];
  applicationDeadline?: string;
  redFlags: string[];
  industryDetected: string;
}

interface SuperTailorResult extends EnhancedTailorResult {
  jobIntelligence?: JobIntelligence;
  interviewTalkingPoints?: InterviewTalkingPoint[];
  atsAnalysis?: ATSAnalysis;
  bulletTransformations?: BulletTransformation[];
  strengthsAnalysis?: StrengthAnalysis[];
  projects?: Project[];
  certifications?: Certification[];
  awards?: Award[];
}
```

### Other Types

```typescript
type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'awards' | 'projects' | 'publications' | 'volunteering' | 'hobbies' | 'references' | 'languages';

type TailorSectionId = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'awards';

type ExportType = 'resume' | 'cover-letter' | 'combined' | 'one-page' | 'docx' | 'ats-pdf' | 'linkedin' | 'plain-text' | 'share-link' | 'interview-prep';

interface PDFOptions {
  showPageNumbers?: boolean;
  pageNumberFormat?: 'simple' | 'full';
  showBranding?: boolean;
}

interface PageBreakSettings {
  mode: 'auto' | 'manual';
  breakAfterSections: SectionId[];
}
```

---

## 10. Database Schema (20+ Tables)

### Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| **profiles** | `user_id`, `full_name`, `avatar_url`, `username`, `job_title`, `location`, `portfolio_enabled`, `portfolio_theme`, `portfolio_resume_id` (→ resumes), portfolio_* config fields | User profile + portfolio settings |
| **resumes** | `user_id`, `title`, `contact_info` (JSONB), `summary`, `experience` (JSONB), `education` (JSONB), `skills` (JSONB), `certifications` (JSONB), `awards`, `projects`, `publications`, `volunteering`, `hobbies`, `references`, `template_id`, `customization` (JSONB), `is_primary`, `job_match_score`, `target_job_title`, `target_company`, `job_url`, `parent_resume_id` (self-ref) | Core resume data |
| **resume_versions** | `resume_id` (→ resumes), `user_id`, `version_number`, `snapshot` (JSONB), `change_summary` | Version history |
| **resume_shares** | `resume_id` (→ resumes), `user_id`, `token`, `password` (hashed), `expires_at`, `is_active`, `view_count` | Share links |
| **share_comments** | `share_id` (→ resume_shares), `author_name`, `content`, `section`, `is_resolved` | Reviewer feedback |
| **cover_letters** | `user_id`, `resume_id` (→ resumes), `job_title`, `company`, `content`, `tone`, `template_style`, `title` | Cover letters |
| **resignation_letters** | `user_id`, `title`, `company`, `position`, `recipient_name`, `content`, `tone`, `template_style`, `last_working_day`, `notice_period`, `reason`, `additions` (JSONB), `checklist_progress` (JSONB) | Resignation letters |
| **jobs** | `user_id`, `title`, `company`, `location`, `job_type`, `description`, `requirements`, `salary_range`, `source_url`, `company_logo`, `is_saved`, `posted_date` | Job listings |
| **job_applications** | `user_id`, `job_title`, `company`, `status`, `job_id` (→ jobs), `resume_id` (→ resumes), `cover_letter_id` (→ cover_letters), `applied_at`, `deadline`, `url`, `notes`, `remind_at` | Application tracking |
| **interview_sessions** | `user_id`, `resume_id` (→ resumes), `job_title`, `job_description`, `interview_type`, `messages` (JSONB), `overall_score`, `strengths` (JSONB), `improvements` (JSONB), `duration_seconds` | Interview records |
| **tailor_history** | `user_id`, `resume_id` (→ resumes), `job_title`, `company`, `job_description`, `tailor_result` (JSONB), `applied_sections` (JSONB), `score_before`, `score_after` | AI tailor results |
| **career_assessments** | `user_id`, `resume_id` (→ resumes), `quiz_answers` (JSONB), `result` (JSONB), `completed_milestones` (JSONB) | Career quiz |
| **ai_credits** | `user_id`, `usage_date`, `daily_usage`, `daily_limit`, `total_usage` | AI rate limiting |
| **ai_usage_logs** | `user_id`, `action_type`, `section`, `resume_id` (→ resumes), `metadata` (JSONB) | AI audit trail |
| **audit_logs** | `user_id`, `action`, `category`, `metadata` (JSONB) | Security audit |
| **bug_reports** | `user_id`, `user_email`, `error_message`, `error_stack`, `route`, `app_version`, `user_agent`, `status`, `additional_context`, `component_stack`, `recent_errors` (JSONB), `session_id`, `active_feature` | Bug reports |
| **feature_requests** | `user_id`, `user_email`, `feature_title`, `feature_description`, `route`, `app_version`, `user_agent`, `status` | Feature requests |
| **notifications** | `user_id`, `title`, `message`, `type`, `link`, `is_read` | In-app notifications |
| **push_subscriptions** | `user_id`, `endpoint`, `p256dh`, `auth` | Web push |
| **user_api_keys** | `user_id`, `provider`, `encrypted_key`, `key_tier` | Encrypted BYOK keys |
| **user_preferences** | `user_id`, `ai_provider`, `default_template`, `biometric_enabled`, `biometric_timeout`, `pdf_defaults` (JSONB), `onboarding_flags` (JSONB) | Settings sync |
| **portfolio_visits** | `username`, `short_link_id` (→ short_links), `referrer`, `country`, `city`, `sections_viewed` (JSONB), `time_spent_seconds` | Portfolio analytics |
| **short_links** | `id` (custom), `owner_user_id`, `label`, `portfolio_username`, `target_url`, `click_count` | Branded URLs |

### Database Functions (RPCs)

| Function | Purpose |
|----------|---------|
| `get_public_portfolio(p_username)` | Returns public portfolio JSON |
| `get_portfolio_analytics(p_username)` | Returns analytics JSON |
| `get_portfolio_active_status(p_username)` | Returns status string |
| `increment_portfolio_views(p_username)` | Increment view counter |
| `record_portfolio_visit(...)` | Log visit with geo data |
| `get_shared_resume(share_token, password_attempt?)` | Returns shared resume JSON |
| `increment_share_view_count(share_token)` | Increment share views |
| `add_share_comment(...)` | Add reviewer comment |
| `get_share_comments(p_share_token)` | Get comments JSON |
| `check_username_available(p_user_id, p_username)` | Username availability |
| `resolve_short_link(p_link_id)` | Resolve short URL |
| `hash_share_password(raw_password)` | Hash password |
| `verify_share_password(hashed, raw)` | Verify password |
| `increment_ai_usage(p_user_id)` | Increment daily AI usage |
| `cleanup_stale_data()` | Remove old/orphaned data |
| `get_user_api_key_info(p_user_id)` | Get key metadata |

### View

| View | Purpose |
|------|---------|
| `user_api_keys_safe` | Exposes `provider`, `key_tier`, `created_at`, `updated_at` without `encrypted_key` |

---

## 11. State Management

### Zustand Stores (8 stores, all with `persist` middleware)

| Store | File | Key State | Key Actions |
|-------|------|-----------|-------------|
| **resumeStore** | `resumeStore.ts` | `currentResume`, `currentResumeId`, `jobDescription`, `matchScore`, `gapAnalysis`, `selectedTemplate`, `tailorHistory`, `tailorHistoryByResume`, `coverLetterHistory`, `currentComparison`, `pendingTailor*` | `updateResume()`, `addTailorHistory()`, `restoreTailorVersion()`, `setPendingTailor()`, `startNewComparison()`, `addJobToComparison()`, `applySelectedJob()` |
| **settingsStore** | `settingsStore.ts` | `theme`, `aiProvider`, `geminiApiKey`, `biometricLockEnabled`, `hasSeenSplash`, `hasSeenAIIntro`, `autoProofread`, `shakeToReportEnabled`, quiet hours config | `setTheme()`, `setAIProvider()`, `setGeminiApiKey()`, `incrementGeminiDailyUsage()`, `resetSettings()` |
| **offlineSyncStore** | `offlineSyncStore.ts` | `pendingChanges` | Queue mutations when offline, flush on reconnect |
| **proofreadStore** | `proofreadStore.ts` | Proofread session state | — |
| **aiHealthStore** | `aiHealthStore.ts` | AI service health status | — |
| **atsScoreHistoryStore** | `atsScoreHistoryStore.ts` | ATS score trend data | — |
| **contentLibraryStore** | `contentLibraryStore.ts` | Reusable content snippets | — |
| **guidesStore** | `guidesStore.ts` | Guide read progress | — |

### resumeStore Persistence

Persisted to `localStorage` under key `resume-storage`. Partializes to only persist:
- `currentResume`, `currentResumeId`, `selectedTemplate`, `pageBreakSettings`
- `tailorHistory`, `tailorHistoryByResume`, `coverLetterHistory`, `jobDescription`

### settingsStore Persistence

Persisted under key `wiseresume-settings`. Excludes sensitive keys (`geminiApiKey`, `elevenlabsApiKey`) from localStorage — those are stored server-side via `manage-api-keys` edge function.

### React Query Patterns

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Query hooks: `useResumes`, `useJobs`, `useJobApplications`, `useCoverLetters`, `useResignationLetters`, `useProfile`, `useNotifications`, `usePortfolioAnalytics`, `useInterviewHistory`, `useResumeVersions`, `useResumeShares`, `useShareComments`, etc.

---

## 12. Edge Functions (39)

### Shared Modules (`supabase/functions/_shared/`)

| Module | Purpose |
|--------|---------|
| `aiClient.ts` | 3-tier AI provider fallback: User BYOK key → `GEMINI_API_KEY` → `EMERGENT_LLM_KEY` |
| `authMiddleware.ts` | JWT validation for authenticated endpoints |
| `cors.ts` | CORS headers for cross-origin requests |
| `rateLimiter.ts` | Rate limiting per user |

### AI-Powered Functions (21)

| Function | Purpose | AI Model |
|----------|---------|----------|
| `analyze-resume` | Job match scoring + gap analysis | Gemini/GPT |
| `tailor-resume` | AI resume tailoring for specific jobs | Gemini/GPT |
| `enhance-section` | AI rewrite of individual sections | Gemini/GPT |
| `score-resume` | ATS compatibility scoring | Gemini/GPT |
| `proofread-resume` | Grammar/style checking | Gemini/GPT |
| `generate-cover-letter` | Cover letter generation | Gemini/GPT |
| `generate-resignation-letter` | Resignation letter generation | Gemini/GPT |
| `interview-chat` | Mock interview conversation | Gemini/GPT |
| `recruiter-simulation` | Recruiter perspective feedback | Gemini/GPT |
| `detect-and-humanize` | AI content detection + humanization | Gemini/GPT |
| `optimize-for-linkedin` | LinkedIn profile optimization | Gemini/GPT |
| `one-page-optimizer` | Condense resume to one page | Gemini/GPT |
| `agentic-chat` | General AI assistant | Gemini/GPT |
| `career-path-advisor` | Career trajectory advice | Gemini/GPT |
| `career-assessment` | Career quiz evaluation | Gemini/GPT |
| `company-briefing` | Company research for interviews | Gemini/GPT |
| `generate-portfolio-bio` | AI portfolio bio writer | Gemini/GPT |
| `ask-portfolio` | AI Q&A for public portfolios | Gemini/GPT |
| `fill-gap` | Fill employment gaps | Gemini/GPT |
| `explain-gap` | Explain employment gaps | Gemini/GPT |
| `generate-headshot` | AI headshot generation | Image model |

### Document Processing Functions (4)

| Function | Purpose |
|----------|---------|
| `parse-resume` | PDF/image resume extraction (with OCR) |
| `parse-linkedin` | LinkedIn profile parsing |
| `parse-job-url` | Job listing URL scraping |
| `parse-job-text` | Job description text parsing |

### Utility Functions (14)

| Function | Purpose |
|----------|---------|
| `manage-api-keys` | BYOK API key CRUD (encrypted storage) |
| `validate-api-key` | API key validation |
| `ai-health` | AI service health check |
| `send-bug-report` | Bug report submission |
| `send-feature-request` | Feature request submission |
| `send-push-notification` | Push notification dispatch |
| `send-resume-reminder` | Scheduled resume update reminders |
| `weekly-digest` | Weekly email digest |
| `og-image` | Dynamic Open Graph image generation |
| `portfolio-meta` | Portfolio SEO metadata |
| `track-portfolio-view` | Portfolio analytics tracking |
| `resolve-short-link` | Short link resolution |
| `elevenlabs-scribe-token` | ElevenLabs voice transcription token |

---

## 13. Hooks Reference (56)

### Authentication & Security

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth context consumer (user, session, signOut, isAuthenticated) |
| `useBiometricLock` | Biometric lock state and authentication |
| `useGuestMigration` | Migrate guest data to authenticated account |

### Resume & Editor

| Hook | Purpose |
|------|---------|
| `useResumes` | CRUD operations for resumes (React Query) |
| `useResumeScore` | ATS score fetching |
| `useResumeVersions` | Version history CRUD |
| `useResumeShares` | Share link management |
| `useResumeNudges` | Contextual improvement suggestions |
| `useUndoRedo` | 50-step undo/redo for editor |
| `useUnsavedChangesGuard` | Warn before leaving with unsaved changes |

### AI

| Hook | Purpose |
|------|---------|
| `useAIAction` | Generic AI action executor |
| `useAICredits` | Daily AI usage tracking |
| `useAIEnhance` | Section enhancement (summary, experience, etc.) |
| `useAIHealth` | AI service health status |
| `useAIProviderInfo` | Current AI provider details |
| `useATSSuggestions` | ATS improvement suggestions |
| `useAgenticChat` | Conversational AI assistant |
| `useProofread` | Grammar/style proofreading |

### Jobs & Applications

| Hook | Purpose |
|------|---------|
| `useJobs` | Job listings CRUD |
| `useJobApplications` | Application tracking CRUD |
| `useJobActivityStats` | Activity statistics |
| `useCompanyBriefing` | Company research data |

### Documents

| Hook | Purpose |
|------|---------|
| `useCoverLetters` | Cover letter CRUD |
| `useResignationLetters` | Resignation letter CRUD |
| `useExportProgress` | PDF/DOCX export progress tracking |

### Interview

| Hook | Purpose |
|------|---------|
| `useVoiceInterview` | Voice interview session management |
| `useInterviewHistory` | Past interview sessions |
| `useElevenLabsScribe` | ElevenLabs voice transcription |
| `useWebSpeechFallback` | Browser Speech API fallback |

### Career

| Hook | Purpose |
|------|---------|
| `useCareerAssessment` | Career quiz state |
| `useCareerMilestones` | Career milestone tracking |

### Portfolio

| Hook | Purpose |
|------|---------|
| `usePublicPortfolio` | Public portfolio data fetching |
| `usePortfolioAnalytics` | Portfolio visit analytics |
| `useShareComments` | Share page comments |

### Platform & Native

| Hook | Purpose |
|------|---------|
| `useBackButton` | Android hardware back button |
| `useDeepLinking` | Capacitor deep link handling |
| `useAppLifecycle` | App foreground/background events |
| `useStatusBar` | Status bar color sync |
| `useShakeDetect` | Shake-to-report bug |
| `useNetworkStatus` | Online/offline detection |
| `useNetworkQuality` | Connection speed detection |
| `useOfflineSync` | Offline mutation queue processing |
| `useKeyboardAwareScroll` | Scroll when keyboard opens |

### UI

| Hook | Purpose |
|------|---------|
| `use-mobile` | Mobile breakpoint detection |
| `useInView` | Intersection observer |
| `useDoubleTap` | Double-tap gesture |
| `useTilt` | Device tilt for parallax effects |
| `useEditorShortcuts` | Keyboard shortcuts in editor |
| `useBackNavigation` | Centralized back navigation |

### Miscellaneous

| Hook | Purpose |
|------|---------|
| `useProfile` | User profile CRUD |
| `useNotifications` | In-app notifications |
| `usePushNotifications` | Web push subscription |
| `useActiveStatus` | User active status tracking |
| `useChangelogBadge` | New feature badge on Home tab |
| `useRateApp` | App store rating prompt |

---

## 14. Navigation Flow

### BACK_ROUTES Map (explicit parent mapping)

```
/editor            → /dashboard
/preview           → /editor
/upload            → /dashboard
/interview         → /ai-studio
/career            → /ai-studio
/settings          → /dashboard
/auth              → /
/onboarding        → /dashboard
/profile           → /dashboard
/templates         → /dashboard
/resume            → /dashboard
/job               → /applications
/application       → /applications
/notifications     → /dashboard
/portfolio         → /dashboard
/portfolio/edit    → /portfolio
/cover-letter/new  → /cover-letters
/cover-letter/edit → /cover-letters
/cover-letter      → /cover-letters
/cover-letters     → /ai-studio
/resignation-letter/new  → /resignation-letters
/resignation-letter/edit → /resignation-letters
/resignation-letter      → /resignation-letters
/resignation-letters     → /ai-studio
/examples          → /dashboard
/guides            → /dashboard
/guide             → /guides
/ai-studio         → /dashboard
```

### EXIT_ROUTES

Routes where hardware back button exits the app:
```
/ (landing page)
/dashboard
```

### Navigation Rules

1. **Editor exit**: Always passes through `useUnsavedChangesGuard` → shows `UnsavedChangesDialog` if dirty
2. **AI sub-features** (Interview, Career, Cover Letters, Resignation Letters) → back to `/ai-studio`
3. **Job-related pages** (Job Detail, Application) → back to `/applications`
4. **BottomTabBar Editor tab**: Guarded — auto-loads latest resume or redirects to `/dashboard?action=create`
5. **Swipe-back gesture**: Enabled on all tab routes except editor and exit routes
6. **Dynamic routes** (e.g., `/resume/abc123`): Matched by prefix, backs to the base route

---

## 15. Native Features (Capacitor)

| Feature | Package | Usage |
|---------|---------|-------|
| **Biometric Lock** | `@capgo/capacitor-native-biometric` | Fingerprint/Face ID lock with configurable timeout (0s, 30s, 60s, 5min) |
| **Haptic Feedback** | `@capacitor/haptics` | Selection feedback on tab press, button interactions |
| **Status Bar** | `@capacitor/status-bar` | Theme-aware color sync (dark/light) |
| **Splash Screen** | `@capacitor/splash-screen` | Native splash, hidden after auth resolves |
| **Deep Linking** | `@capacitor/app` | Handle `wiseresume://` URLs, resume/portfolio links |
| **Browser** | `@capacitor/browser` | Open external links in-app browser |
| **Back Button** | `@capacitor/app` | Android hardware back with BACK_ROUTES mapping |
| **Shake Detect** | Device motion API | Shake-to-report bug (toggleable in settings) |

### Native APK Optimizations
- All `backdrop-filter` effects disabled for WebView performance
- Opaque fallback backgrounds for glass surfaces
- `body.native-app` CSS class applied for native-specific styles
- Touch manipulation on all interactive elements
- `-webkit-overflow-scrolling: touch` on scroll containers

---

## 16. Offline & PWA

| Feature | Implementation |
|---------|----------------|
| **Service Worker** | `vite-plugin-pwa` with auto-update strategy |
| **Offline Banner** | `OfflineBanner` component shown when `navigator.onLine === false` |
| **Slow Connection** | `SlowConnectionBanner` shown when network quality is poor |
| **Sync Queue** | `offlineSyncStore` queues mutations, flushes on reconnect |
| **Network Detection** | `useNetworkStatus` (online/offline), `useNetworkQuality` (speed) |
| **Local Persistence** | All Zustand stores persist to `localStorage` |
| **Background Save** | `app:save-draft` event dispatched on `visibilitychange` / `appStateChange` |

---

## 17. Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Row Level Security** | RLS enabled on all user-owned tables; policies restrict to `auth.uid()` |
| **JWT Validation** | `authMiddleware.ts` validates JWT in all authenticated edge functions |
| **Rate Limiting** | `rateLimiter.ts` limits AI calls per user per time window |
| **Encrypted API Keys** | BYOK keys stored in `user_api_keys` table with encryption |
| **Safe View** | `user_api_keys_safe` view hides `encrypted_key` column |
| **Audit Logging** | `audit_logs` table tracks security-relevant actions |
| **Session Protection** | `activeUserIdRef` prevents session hijacking from stale sessions |
| **Expired Session Detection** | `app:session-expired` custom event triggers re-auth flow |
| **Share Passwords** | Hashed via `hash_share_password` RPC, verified via `verify_share_password` |
| **Biometric Lock** | Native biometric auth with configurable auto-lock timeout |
| **Security Curtain** | `body.wr-security-curtain` blurs screen in OS app switcher |
| **User Select** | Disabled on buttons/tabs to prevent accidental selection |

---

## Component Directory Structure

```
src/components/
  ├── ai-studio/        # AI Studio tool grid, chat, credits
  ├── ai/               # AI floating button, assistant bar, nudges
  ├── applications/     # Job application tracking UI
  ├── auth/             # Login, signup, email verify forms
  ├── brand/            # Brand assets, logos
  ├── career/           # Career assessment, roadmap
  ├── cover-letter/     # Cover letter editor components
  ├── dashboard/        # Dashboard cards, stats, filters, FAB
  ├── editor/           # Resume editor sections, toolbar, sheets
  ├── examples/         # Example resumes gallery
  ├── home/             # Home/index page components
  ├── interview/        # Interview setup, voice UI, summary
  ├── landing/          # Landing page hero, features, footer
  ├── layout/           # AppShell, BottomTabBar, DesktopNav, Header
  ├── onboarding/       # Onboarding wizard steps
  ├── portfolio/        # Portfolio editor, public view, QR
  ├── pwa/              # Install prompt, update banner
  ├── resignation/      # Resignation letter components
  ├── settings/         # Settings sections, profile editor
  ├── templates/        # Template gallery, previews
  ├── ui/               # shadcn/ui primitives (button, dialog, sheet, etc.)
  ├── upload/           # Upload zone, progress, OCR, review
  ├── AnimatedSplash.tsx
  ├── BiometricLockScreen.tsx
  ├── BugReportDialog.tsx
  └── ErrorBoundary.tsx
```

---

## 18. Visual Screen Mockups

> This section provides ASCII wireframes and detailed visual descriptions for every major screen so a receiving agent can match the exact layout, spacing, color, and component placement.

### 18.1 Visual Patterns Reference

These reusable visual building blocks appear across multiple screens. Use these exact Tailwind class patterns:

| Pattern | Classes / Details |
|---|---|
| **Glass surface** | `bg-card/80 backdrop-blur-sm border border-border/30` — opaque fallback on Capacitor native |
| **Gradient primary button** | `bg-gradient-to-r from-primary to-accent text-primary-foreground` — h-14 for CTAs, rounded-2xl, `shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]` glow |
| **Card** | `rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4` |
| **Score ring** | Circular SVG, `strokeDasharray`/`strokeDashoffset`, color by score: `>=80` → `hsl(var(--success))`, `>=50` → `hsl(var(--warning))`, `<50` → `hsl(var(--destructive))` |
| **Bottom sheet** | Vaul drawer, `rounded-t-3xl px-4 pb-safe`, 32×4 grab handle bar centered top |
| **Empty state** | 64px gradient circle icon, bold heading, `text-muted-foreground text-sm max-w-[260px] text-center`, gradient CTA button below |
| **BottomTabBar pill** | `layoutId="active-tab-pill"` with `type:'spring', stiffness:500, damping:35`, `bg-primary/5 border border-primary/10 rounded-2xl` |
| **Section header** | `w-1 h-5 rounded-full bg-primary` bar + icon + label, all inline |
| **Settings row** | Full-width `py-3.5 px-4 min-h-[56px]`, icon in `w-8 h-8 rounded-lg`, label + optional description, chevron-right or Switch right |

---

### 18.2 Landing Page

```text
┌─────────────────────────────────┐
│ ▓ SpaceBackground (fixed z-0)  │
│   gradient nebula orbs + stars  │
├─────────────────────────────────┤
│ [Logo 28px]  WiseResume   [Sign In] │  ← sticky glass header z-40
├─────────────────────────────────┤
│                                 │
│      ┌──────────────┐           │
│      │  Logo 120×120 │          │  ← animate-glow-pulse, red drop-shadow
│      └──────────────┘           │
│   "Build Your Perfect Resume"   │  ← text-3xl font-bold, Space Grotesk
│   subtitle with **bold** words  │  ← text-muted-foreground
│                                 │
│  ┌─────────────────────────┐    │
│  │  Get Started Free →     │    │  ← gradient CTA h-14 rounded-2xl w-full
│  └─────────────────────────┘    │
│                                 │
│  ✓ Free  ✓ No card  ✓ ATS      │  ← trust bar, text-xs, Check icons
├─────────────────────────────────┤
│  ~~Other tools~~  │  **Us**     │  ← comparison strip rows
│  ~~Generic~~      │  **AI-Pow** │     left=line-through muted
│  ~~No ATS~~       │  **98%**    │     right=font-bold primary
├─────────────────────────────────┤
│  How It Works (3 steps)         │
│  ①──────── ②──────── ③────────  │  ← pink circle number icons
├─────────────────────────────────┤
│  Feature cards (grid cols-1→3)  │
│  ┌────┐ ┌────┐ ┌────┐          │  ← rounded-2xl card pattern
│  └────┘ └────┘ └────┘          │
├─────────────────────────────────┤
│  PortfolioDemo (phone frame)    │  ← aspect-[9/16] border-8 rounded-[2.5rem]
│  EditorDemo (interactive)       │
├─────────────────────────────────┤
│  Footer: logo + nav links      │
│  © 2025 WiseUniverse            │
└─────────────────────────────────┘
```

- SpaceBackground: `fixed inset-0 z-0`, canvas with animated stars + 3 gradient nebula `div`s (blur-3xl, animate-float)
- Header: `sticky top-0 z-40 glass-surface h-14`, logo left, "Sign In" outlined button right
- Hero logo: `w-[120px] h-[120px]` with `animate-glow-pulse`, `drop-shadow-[0_0_32px_hsl(var(--destructive)/0.5)]`
- CTA button: full-width, `h-14 rounded-2xl bg-gradient-to-r from-primary to-accent`, glow shadow
- Comparison strip: two-column, left items have `line-through text-muted-foreground`, right items `font-bold text-primary`

---

### 18.3 Auth Page

```text
┌─────────────────────────────────┐
│ ← (back)                       │  ← top-left, MobileLayout wrapper
│                                 │
│         ┌────────┐              │
│         │AppIcon │              │  ← 48×48, purple drop-shadow
│         │ 48×48  │              │
│         └────────┘              │
│      "Welcome Back"             │  ← text-2xl font-bold
│   "Sign in to continue"        │  ← text-muted-foreground
│                                 │
│  ┌─ 📧 ─────────────────────┐  │  ← Mail icon prefix
│  │  Email                    │  │
│  └───────────────────────────┘  │
│  ┌─ 🔒 ──────────────── 👁 ─┐  │  ← Lock icon + eye toggle
│  │  Password                 │  │
│  └───────────────────────────┘  │
│                                 │
│  "Sign in with email link"      │  ← text-primary text-sm
│  "Forgot password?"             │  ← text-muted-foreground text-sm
│                                 │
│  ┌─────────────────────────┐    │
│  │      Sign In             │   │  ← gradient button h-14
│  └─────────────────────────┘    │
│                                 │
│  ─────────── or ────────────    │  ← divider with "or" centered
│                                 │
│  ┌─────────────────────────┐    │
│  │ G  Continue with Google  │   │  ← outlined, Google icon left
│  └─────────────────────────┘    │
│                                 │
│  "Don't have an account?"       │
│  "Sign up" ← primary link      │
└─────────────────────────────────┘
```

- Wrapper: `MobileLayout` with back button
- AppIcon: `w-12 h-12`, purple `drop-shadow-[0_0_16px_hsl(var(--primary)/0.4)]`
- Input fields: shadcn Input with left icon slot (`Mail`, `Lock` from lucide), password has `Eye`/`EyeOff` toggle button
- Sign In button: `bg-gradient-to-r from-primary to-accent h-14 rounded-2xl w-full`
- Google button: `variant="outline"` full-width, Google SVG icon 20×20

---

### 18.4 Dashboard

```text
┌─────────────────────────────────┐
│ 🏠 WiseResume          ⚙       │  ← glass header, gear=Settings nav
├─────────────────────────────────┤
│ (●) Good morning, Name    ⚙    │  ← avatar h-10 w-10 border-2 primary
│     Software Engineer           │     greeting text, subtitle=job title
├─────────────────────────────────┤
│ ┌─ DashboardStats ────────────┐ │
│ │ gradient-border card         │ │  ← border via gradient pseudo-element
│ │ 🔥 3-day streak    📝 5 CVs │ │
│ │ 💡 "Tip: quantify impact"   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [+ Create] [📄 Upload] [🎯 T] │  ← QuickActionChips, horizontal scroll
│ [📋 Templates]                  │     pill buttons, motion fade-in
├─────────────────────────────────┤
│ ┌─ My CVs ─┬─ Tailored ──────┐ │  ← Tabs with Embla swipe
│ │           │                  │ │
│ ├───────────┴──────────────────┤ │
│ │ 🔍 Search...    [Sort ▼]    │ │  ← ResumeFilters row
│ ├──────────────────────────────┤ │
│ │ ┌────────────────────────┐   │ │
│ │ │ [thumb] Title      [92]│   │ │  ← ResumeListCard rounded-2xl
│ │ │         Target Job     │   │ │     score badge right (ScoreRing)
│ │ │         2 days ago     │   │ │
│ │ └────────────────────────┘   │ │
│ │ ┌────────────────────────┐   │ │
│ │ │ [thumb] Title      [78]│   │ │
│ │ └────────────────────────┘   │ │
│ └──────────────────────────────┘ │
│                            (+)   │  ← FloatingCreateButton
│                          pink    │     fixed bottom-20 right-4
│                          FAB     │     gradient bg, Plus icon
├─────────────────────────────────┤
│ Home  Editor  AI  Activity Port │  ← BottomTabBar
│  ●                              │     active pill under Home
└─────────────────────────────────┘
```

- Header: `glass-surface h-14`, app name left, gear icon right navigates to `/settings`
- Avatar: `h-10 w-10 rounded-full border-2 border-primary`, inside Popover with profile actions
- DashboardStats: `rounded-2xl` card with gradient border (pseudo-element), contains streak flame, resume count badges, daily tip
- QuickActionChips: `overflow-x-auto flex gap-2`, each chip is `rounded-full px-4 py-2 bg-muted/50 border border-border`
- ResumeListCard: `rounded-2xl border border-border bg-card p-3`, template thumbnail (48×64 aspect), title bold, ScoreRing right
- FloatingCreateButton: `fixed bottom-20 right-4 z-40`, `w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent`, Plus icon, shadow glow

---

### 18.5 Editor

```text
┌─────────────────────────────────┐
│ ← Title (truncate)   ☁ ↶ ↷    │  ← top bar: back, title, sync, undo/redo
├─────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 65%      │  ← ProgressBar gradient thin bar
├─────────────────────────────────┤
│ [Contact] [Summary] [Exp] →    │  ← StepperNav horizontal scroll pills
│  ●active                        │     active = primary bg, others muted
├─────────────────────────────────┤
│ ┌─ SectionCard ───────────────┐ │
│ │ Section Title          ✨   │ │  ← InlineAIButton sparkle icon
│ │                              │ │
│ │  Form fields for active     │ │  ← rounded-2xl border bg-card
│ │  section...                  │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                 │
│ ┌─ SectionCard ───────────────┐ │
│ │ Next section...              │ │
│ └──────────────────────────────┘ │
├─────────────────────────────────┤
│ 📋 🎨 🔗 📤 🔍 ✅ 📜 📚 ✨  │  ← bottom toolbar, horizontal scroll
│ Template Customize Share Export │     icon buttons with labels below
└─────────────────────────────────┘

Desktop (≥1024px):
┌──────────────────┬──────────────┐
│  Editor panel    │ LivePreview  │  ← ResizablePanelGroup
│  (as above)      │ panel        │     drag handle in center
│                  │ (template    │
│                  │  rendering)  │
└──────────────────┴──────────────┘
```

- No mobile header bar (editor manages its own top bar)
- Top bar: back arrow (`ChevronLeft`), title `truncate max-w-[200px]`, cloud sync icon (`Cloud`/`CloudOff`), undo/redo (`Undo2`/`Redo2`)
- ProgressBar: `h-1 bg-gradient-to-r from-primary to-accent`, width = completion %
- StepperNav: `overflow-x-auto flex gap-2`, each pill `rounded-full px-3 py-1.5 text-sm`, active = `bg-primary text-primary-foreground`
- SectionCard: `rounded-2xl border border-border bg-card p-4`, InlineAIButton = small sparkle icon button top-right
- Bottom toolbar: `overflow-x-auto flex gap-1 px-2 py-2 border-t`, each item = icon + 9px label stacked vertically
- Desktop: `ResizablePanelGroup direction="horizontal"`, left panel = editor, right panel = `LivePreviewPanel` with template rendering

---

### 18.6 Preview

```text
┌─────────────────────────────────┐
│ ← Preview          [🔍+] [🔍-]│  ← zoom controls top-right
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   Full-bleed template   │    │  ← rendered resume template
│  │   rendering             │    │     scaled to fit viewport
│  │                         │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│         ‹  1/2  ›               │  ← page navigation arrows
├─────────────────────────────────┤
│  [📤 Export PDF]                │  ← export button, gradient
└─────────────────────────────────┘
```

- Full-bleed rendering of the active template with resume data
- Zoom: pinch-to-zoom on mobile, +/- buttons on desktop
- Page nav: left/right arrows with page counter
- Export: bottom action bar with gradient export button

---

### 18.7 Upload

```text
┌─────────────────────────────────┐
│ ← Upload Resume                │
├─────────────────────────────────┤
│                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  ╎                           ╎  │  ← UploadZone: dashed border-2
│  ╎       📄 (icon 48px)     ╎  │     rounded-3xl, min-h-[280px]
│  ╎                           ╎  │     border-primary/30
│  ╎  "Drag & drop or tap     ╎  │
│  ╎   to upload your resume" ╎  │
│  ╎                           ╎  │
│  ╎  Supports PDF, DOCX, IMG ╎  │  ← text-xs text-muted-foreground
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                 │
├─────────────────────────────────┤
│ FileTypeSelector:               │
│ ┌──────────────────────────┐    │
│ │ 🔴 PDF   "Upload PDF"   │    │  ← 72px row, colored icon circle
│ │ 🔵 DOCX  "Upload Word"  │    │
│ │ 🟢 IMG   "Scan Image"   │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ Progress (when uploading):      │
│  ① Upload  ──→  ② Parse  ──→  ③ Review │  ← UploadProgressSteps
│    ✓ done      ◉ active     ○ pending  │     animated step icons
├─────────────────────────────────┤
│ ATSScorePreview (after parse):  │
│ ┌──────────────────────────┐    │
│ │ (92%) │ Format    ▓▓▓▓░  │    │  ← ScoreRing 56px + category bars
│ │       │ Content   ▓▓▓░░  │    │
│ │       │ Keywords  ▓▓░░░  │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

- UploadZone: `border-2 border-dashed border-primary/30 rounded-3xl min-h-[280px]`, centered content, upload icon `w-12 h-12 text-primary`
- FileTypeSelector: 3 rows in bottom sheet, each row 72px tall, left = `w-10 h-10 rounded-full` colored circle with icon, right = title + description
- UploadProgressSteps: 3-step horizontal stepper, active step pulses, completed step shows checkmark
- ATSScorePreview: ScoreRing (56px) left + 3 category progress bars right, each bar = `h-2 rounded-full bg-primary` with animated width

---

### 18.8 AI Studio

```text
┌─────────────────────────────────┐
│ ← AI Studio                    │
│    [GPT-4o ▾]  [12/50 credits] │  ← AIEngineBadge + AICreditsIndicator
├─────────────────────────────────┤
│ ┌─ Resume Context ────────────┐ │
│ │ 📄 "Software Engineer CV"   │ │  ← glass-surface bar, current resume
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌─ Wise AI Chat ──────────────┐ │
│ │ (●) Wise AI                  │ │  ← w-10 h-10 gradient circle
│ │     "How can I help?"        │ │     Sparkles icon inside
│ │                              │ │
│ │ [Improve summary] [Fix gaps] │ │  ← suggestion chips
│ │ [Tailor for job]             │ │
│ └──────────────────────────────┘ │
├─────────────────────────────────┤
│ Recent Tools ──────────→        │  ← horizontal scroll row
├─────────────────────────────────┤
│ ✍️ Writing Tools                │  ← category header
│ ┌──────────┐ ┌──────────┐      │
│ │ (🎯)     │ │ (✨)     │      │  ← 2-column grid
│ │ Tailor   │ │ Enhance  │      │     icon circle w-10 h-10
│ │ Match job│ │ Improve  │      │     colored bg
│ └──────────┘ └──────────┘      │     title + desc
│ ┌──────────┐ ┌──────────┐      │
│ │ (📝)     │ │ (🔍)     │      │
│ │ Summary  │ │ ATS Scan │      │  ← optional Featured badge
│ └──────────┘ └──────────┘      │
│                                 │
│ 📊 Analysis Tools               │
│ ┌──────────┐ ┌──────────┐      │
│ │ ...      │ │ ...      │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ [💬 Ask Wise AI...         🔄] │  ← chat input rounded-2xl bottom
└─────────────────────────────────┘
```

- AIEngineBadge: small chip `rounded-full px-2 py-0.5 text-[10px] bg-muted`, shows provider name
- AICreditsIndicator: `text-xs text-muted-foreground`, usage/limit format
- Wise AI Chat card: `rounded-2xl border bg-card p-4`, avatar = `w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent` with `Sparkles` icon
- Tool card: `rounded-2xl border bg-card/60 p-3`, icon circle `w-10 h-10 rounded-xl` with category color, title `font-medium text-sm`, description `text-xs text-muted-foreground`
- Optional badges: `Featured` = small accent badge, `AICostBadge` = credit cost indicator

---

### 18.9 Interview

```text
Setup Phase:
┌─────────────────────────────────┐
│ ← Interview Prep               │
├─────────────────────────────────┤
│ Select Interview Type:          │
│ ┌──────────────────────────┐    │
│ │ 🧠 Behavioral            │    │  ← rounded-2xl card, tappable
│ │ "STAR method questions"   │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ 💻 Technical              │    │
│ │ "Role-specific questions" │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ 📊 Case Study             │    │
│ │ "Problem-solving scenarios│    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘

Active Phase:
┌─────────────────────────────────┐
│ ← Interview    ⏱ 03:24         │  ← timer top-right
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────┐        │
│  │ AI: "Tell me about  │        │  ← TranscriptBubble left-aligned
│  │ a time you led..."  │        │     bg-muted rounded-2xl p-3
│  └─────────────────────┘        │
│                                 │
│        ┌─────────────────────┐  │
│        │ You: "In my last   │  │  ← right-aligned, bg-primary
│        │ role, I managed..." │  │     text-primary-foreground
│        └─────────────────────┘  │
│                                 │
│     ▁▂▃▅▃▂▁▂▃▅▇▅▃▂▁           │  ← audio waveform visualization
├─────────────────────────────────┤
│           [🎤]    [⏹]          │  ← mic button (large), stop
└─────────────────────────────────┘

Summary Phase:
┌─────────────────────────────────┐
│ Interview Summary               │
├─────────────────────────────────┤
│       ┌────────┐                │
│       │  78%   │                │  ← ScoreRing large (80px)
│       │ (ring) │                │
│       └────────┘                │
│                                 │
│ Communication  ▓▓▓▓▓▓▓░░░ 72%  │  ← category score bars
│ Technical      ▓▓▓▓▓▓▓▓░░ 85%  │
│ Problem Solving▓▓▓▓▓▓░░░░ 65%  │
├─────────────────────────────────┤
│ ✅ Strengths:                   │
│ • Clear communication           │
│ • Good examples                 │
├─────────────────────────────────┤
│ 📈 Improvements:               │
│ • More specific metrics         │
│ • Deeper technical detail       │
└─────────────────────────────────┘
```

- TranscriptBubble: AI = `bg-muted rounded-2xl p-3 max-w-[85%]` left-aligned; User = `bg-primary text-primary-foreground rounded-2xl p-3 max-w-[85%]` right-aligned
- Audio visualization: horizontal bar of animated height segments
- Recording controls: mic button `w-16 h-16 rounded-full bg-primary`, stop button `w-12 h-12 rounded-full bg-destructive`
- Summary ScoreRing: 80px size, centered

---

### 18.10 Applications

```text
┌─────────────────────────────────┐
│ ← Applications                 │
├─────────────────────────────────┤
│ [Applications] [Jobs]           │  ← Tabs with Embla swipe
├─────────────────────────────────┤
│ [All 12] [Applied 5] [Int 3]→  │  ← StatusFilter horizontal scroll
│ [Offered 1] [Rejected 2]       │     pills with counts, active=primary
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ **Google**          🟢   │    │  ← ApplicationCard rounded-2xl
│ │ Software Engineer        │    │     status badge color-coded
│ │ Applied · Jan 15         │    │     green=offered, blue=interview
│ │ [Notes] [Edit] [⋯]      │    │     red=rejected, gray=applied
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ **Meta**            🔵   │    │
│ │ Product Manager          │    │
│ │ Interviewing · Jan 20    │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ┌─ Stats ─────────────────────┐ │
│ │ 12 total │ 3 this week │ 8% │ │  ← JobActivityStatsCard
│ └─────────────────────────────┘ │
│ 🔥 3-day streak                │  ← ActivityStreak flame
├─────────────────────────────────┤
│ ActivityTimeline                │  ← vertical timeline dots + events
│ ● Applied to Google             │
│ │                               │
│ ● Interview at Meta             │
└─────────────────────────────────┘
```

- StatusFilter: `overflow-x-auto flex gap-2`, each pill `rounded-full px-3 py-1.5 text-sm border`, active = `bg-primary text-primary-foreground`
- ApplicationCard: `rounded-2xl border bg-card p-4`, company name `font-semibold`, status badge = small `rounded-full px-2 py-0.5` with status color
- Status colors: offered = `bg-success/10 text-success`, interviewing = `bg-primary/10 text-primary`, rejected = `bg-destructive/10 text-destructive`, applied = `bg-muted text-muted-foreground`
- Jobs tab: `JobCard` with `Briefcase` icon in colored circle, match score percentage, Tailor/Applied action buttons

---

### 18.11 Portfolio Editor

```text
┌─────────────────────────────────┐
│ ← Portfolio                    │
├─────────────────────────────────┤
│ Enable Portfolio  [━━━●]        │  ← Switch toggle
├─────────────────────────────────┤
│ Username:                       │
│ ┌──────────────────────────┐    │
│ │ /p/ [username        ]   │    │  ← prefix label + input
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ Theme:                          │
│ ● ● ● ● ● ● ●  →              │  ← horizontal scroll circles
│ midnight ocean forest           │     active = border-2 primary
├─────────────────────────────────┤
│ Sections:                       │
│ ☰ About          [✓]           │  ← draggable list, toggleable
│ ☰ Experience     [✓]           │
│ ☰ Education      [✓]           │
│ ☰ Skills         [ ]           │
├─────────────────────────────────┤
│ ┌─ QR Code ──────────────────┐  │
│ │  [████████]  Share link    │  │  ← QR code + copy button
│ └────────────────────────────┘  │
├─────────────────────────────────┤
│ Analytics:                      │
│ 👁 142 views  👤 89 visitors   │  ← stat cards
│ [mini chart]                    │
└─────────────────────────────────┘
```

- Toggle: shadcn `Switch` component
- Theme circles: `w-8 h-8 rounded-full` with theme color fill, active = `ring-2 ring-primary ring-offset-2`
- Section list: draggable rows with grip handle (`GripVertical`), checkbox toggle
- QR code: `qr-code-styling` library, 120×120, inside card pattern

---

### 18.12 Public Portfolio

```text
┌─────────────────────────────────┐
│ (standalone page, no AppShell)  │
├─────────────────────────────────┤
│                                 │
│         ┌────────┐              │
│         │ Avatar │              │  ← h-24 w-24 rounded-full
│         │ 96×96  │              │     border-4 border-accent
│         └────────┘              │
│      "John Doe"                 │  ← text-2xl font-bold
│   "Software Engineer"           │  ← text-muted-foreground
│   [🔗] [💼] [🐙] [🐦]         │  ← social icon row
│                                 │
├─────────────────────────────────┤
│ ▌ About                        │  ← accent left border (w-1)
│ │ Bio text paragraph...        │
├─────────────────────────────────┤
│ ▌ Experience                   │
│ │ Company — Role — Dates       │
│ │ • Bullet points              │
├─────────────────────────────────┤
│ ▌ Education                    │
│ │ University — Degree          │
├─────────────────────────────────┤
│                                 │
│                       [✨ Ask] │  ← floating "Ask AI" button
│                                 │     bottom-right, gradient
├─────────────────────────────────┤
│ Built with WiseResume           │  ← footer badge, muted
└─────────────────────────────────┘
```

- Outside `AppShell`, themed with portfolio theme colors
- Avatar: `h-24 w-24 rounded-full border-4` using accent color
- Sections: `border-l-2 border-accent pl-4` for left accent border
- Ask AI button: `fixed bottom-6 right-6 z-40`, gradient bg, Sparkles icon
- Footer: centered, `text-xs text-muted-foreground`, "Built with WiseResume" link

---

### 18.13 Settings

```text
┌─────────────────────────────────┐
│ ← Settings                     │
├─────────────────────────────────┤
│ [👤 Account] [🎨 Look] [🤖 AI]│  ← section chips, horizontal scroll
│ [✏️ Editor] [🔔 Notif] [🔒] → │     rounded-full pills with icons
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ (●)  John Doe            │    │  ← avatar card, h-16 w-16
│ │      john@email.com      │    │     profile completion badge
│ │      [72% complete]      │    │     ProgressRing overlay
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ▌🔐 Account                    │  ← SectionHeader: bar + icon + label
│ ┌──────────────────────────┐    │
│ │ 👤 Edit Profile      ›  │    │  ← SettingsRow: icon, label, chevron
│ │ ✉️ Change Email       ›  │    │
│ │ 🔑 Change Password    ›  │    │
│ │ 🔐 Biometric Lock   [━] │    │  ← toggle variant
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ▌🎨 Appearance                 │
│ ┌──────────────────────────┐    │
│ │ 🌙 Theme          Dark › │    │  ← value display right
│ │ 🎨 Accent Color       ›  │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ... more sections ...           │
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ 🚪 Sign Out              │    │  ← destructive red text
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ┌─ DeveloperCreditCard ───────┐ │
│ │ animated gradient card       │ │  ← special CSS animation
│ │ developer photo + credits    │ │     holographic effect
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- Section chips: `overflow-x-auto flex gap-2`, each = `rounded-full px-3 py-1.5 text-sm border`, active = filled primary
- SectionHeader: `flex items-center gap-2`, left bar = `w-1 h-5 rounded-full bg-primary`, icon + label
- SettingsRow: `py-3.5 px-4 min-h-[56px]`, icon in `w-8 h-8 rounded-lg icon-glow`, label + optional description, right side = chevron / Switch / value
- Sign Out: SettingsRow `type="button"` with `destructive=true`, red text + red icon bg
- DeveloperCreditCard: custom CSS with `background: conic-gradient(...)`, holographic shimmer effect, developer photo

---

### 18.14 Cover Letters

```text
┌─────────────────────────────────┐
│ ← Cover Letters                │
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ "Software Eng @ Google"  │    │  ← CoverLetterCard rounded-2xl
│ │ Google · Professional    │    │     title, company, tone
│ │ "Dear Hiring Manager..." │    │     snippet preview
│ │ Jan 15, 2025       [⋯]  │    │     date + action menu
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ "PM @ Meta"              │    │
│ │ Meta · Enthusiastic      │    │
│ │ "I'm excited to..."     │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│         OR (empty state):       │
│                                 │
│         ┌────────┐              │
│         │ 📝     │              │  ← 64px gradient circle
│         │ (icon) │              │
│         └────────┘              │
│   "No cover letters yet"       │  ← bold heading
│   "Create your first AI-       │  ← muted description
│    powered cover letter"        │
│  [✨ Create Cover Letter]      │  ← gradient CTA
├─────────────────────────────────┤
│ Create/Edit Form:               │
│ Job Title: [____________]       │
│ Company:   [____________]       │
│ Tone: [Professional] [Friendly] │  ← pill selector, active=primary
│       [Enthusiastic] [Formal]   │
│ [✨ Generate with AI]           │  ← gradient button
│ ┌──────────────────────────┐    │
│ │ Generated letter content │    │  ← rich text area
│ │ ...                      │    │
│ └──────────────────────────┘    │
│ [📄 PDF] [📋 Copy] [📤 Share] │  ← export options row
└─────────────────────────────────┘
```

---

### 18.15 Resignation Letters

```text
┌─────────────────────────────────┐
│ ← Resignation Letters          │
├─────────────────────────────────┤
│ (Similar card list as Cover     │
│  Letters, with title, company,  │
│  date, action menu)             │
├─────────────────────────────────┤
│ ResignationChecklist:           │
│ ┌──────────────────────────┐    │
│ │ Progress: ▓▓▓▓▓░░░ 60%  │    │  ← progress bar top
│ │                          │    │
│ │ ☑ Review employment      │    │  ← completed = checked
│ │   contract               │    │
│ │ ☑ Set last working day   │    │
│ │ ☐ Prepare handover docs  │    │  ← pending = unchecked
│ │ ☐ Schedule exit meeting  │    │
│ │ ☐ Return company assets  │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

- Checklist: `rounded-2xl border bg-card p-4`, each item = checkbox + label, completed = `line-through text-muted-foreground`
- Progress bar: `h-2 rounded-full bg-gradient-to-r from-primary to-accent`

---

### 18.16 Career

```text
┌─────────────────────────────────┐
│ ← Career Tools                 │
├─────────────────────────────────┤
│ CareerQuizSheet (bottom sheet): │
│ ┌──────────────────────────┐    │
│ │ ─── (grab handle)        │    │  ← rounded-t-3xl
│ │ Step 2 of 5   ● ● ○ ○ ○ │    │     progress dots
│ │                          │    │
│ │ "What's your experience  │    │
│ │  level?"                 │    │
│ │                          │    │
│ │ ○ Entry Level            │    │  ← radio options
│ │ ● Mid-Level              │    │     active = primary ring
│ │ ○ Senior                 │    │
│ │ ○ Executive              │    │
│ │                          │    │
│ │ [Next →]                 │    │  ← gradient button
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ CareerRoadmap:                  │
│ ┌──────────────────────────┐    │
│ │ ● Current: Jr Developer  │    │  ← vertical timeline
│ │ │                        │    │     nodes connected by line
│ │ ◎ Next: Mid Developer    │    │     current=filled, next=ring
│ │ │                        │    │
│ │ ○ Sr Developer           │    │     future=empty circle
│ │ │                        │    │
│ │ ○ Tech Lead              │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ SkillGapAnalyzer:               │
│ ┌────────────┬─────────────┐    │
│ │ Your Skills│ Required    │    │  ← two-column comparison
│ │ ✅ React   │ ✅ React    │    │     ✅ = match
│ │ ✅ TypeScript│ ✅ TypeScript│  │     ⚠️ = partial
│ │ ⚠️ Python  │ ✅ Python   │    │     ❌ = missing
│ │ ❌ —       │ ✅ AWS      │    │
│ └────────────┴─────────────┘    │
└─────────────────────────────────┘
```

---

### 18.17 Templates

```text
┌─────────────────────────────────┐
│ ← Templates                    │
├─────────────────────────────────┤
│ [All] [Professional] [Creative]│  ← category filter chips
│ [Academic] [Technical] →       │     horizontal scroll
├─────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐    │
│ │ ┌───────┐ │ │ ┌───────┐ │    │  ← 2-column grid
│ │ │preview│ │ │ │preview│ │    │     aspect-[3/4] thumbnail
│ │ │ thumb │ │ │ │ thumb │ │    │     rounded-xl overflow-hidden
│ │ └───────┘ │ │ └───────┘ │    │
│ │ Modern    │ │ Classic   │    │  ← name below
│ │ [ATS ✓]   │ │ [ATS ✓]   │    │  ← ATS badge overlay
│ └───────────┘ └───────────┘    │
│ ┌───────────┐ ┌───────────┐    │
│ │ ┌───────┐ │ │ ┌───────┐ │    │
│ │ │preview│ │ │ │preview│ │    │
│ │ └───────┘ │ │ └───────┘ │    │
│ │ Minimal   │ │ Developer │    │
│ └───────────┘ └───────────┘    │
│ ... (30 templates total)       │
└─────────────────────────────────┘
```

- Filter chips: same pattern as StatusFilter
- Template card: `rounded-xl border bg-card overflow-hidden`, thumbnail = `aspect-[3/4]` with template preview image, name below `text-sm font-medium`, ATS badge = `absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] bg-success/90 text-white`

---

### 18.18 Onboarding

```text
┌─────────────────────────────────┐
│ (full-screen overlay z-60)      │
│ ┌──────────────────────────────┐│
│ │                              ││
│ │      ┌──────────────┐       ││
│ │      │  Illustration │       ││  ← centered icon/illustration
│ │      │   or Icon     │       ││     per step
│ │      └──────────────┘       ││
│ │                              ││
│ │   "Welcome to WiseResume"    ││  ← heading, text-2xl font-bold
│ │                              ││
│ │   "Build professional        ││  ← description
│ │    resumes with AI"          ││     text-muted-foreground
│ │                              ││     text-center max-w-[280px]
│ │                              ││
│ │   [Get Started]              ││  ← gradient CTA (step 1-3)
│ │                              ││
│ │      ● ● ○ ○                 ││  ← dot indicators
│ │                              ││
│ └──────────────────────────────┘│
│                                 │
│ Final step (step 4):            │
│ ┌──────────────────────────────┐│
│ │ "Choose a Template"          ││
│ │                              ││
│ │ ┌──────┐ ┌──────┐ ┌──────┐  ││  ← template selection grid
│ │ │Modern│ │Clean │ │Prof. │  ││     3-column, tappable
│ │ └──────┘ └──────┘ └──────┘  ││     selected = ring-2 primary
│ │ ┌──────┐ ┌──────┐ ┌──────┐  ││
│ │ │Mini  │ │Dev   │ │Exec  │  ││
│ │ └──────┘ └──────┘ └──────┘  ││
│ │                              ││
│ │ [Start Building →]           ││  ← final CTA
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

- Overlay: `fixed inset-0 z-60 bg-background`, carousel powered by Embla
- Dot indicators: `flex gap-2`, active = `w-2 h-2 rounded-full bg-primary`, inactive = `bg-muted`
- Template grid: `grid grid-cols-3 gap-3`, each = `rounded-xl border p-2 aspect-[3/4]`, selected = `ring-2 ring-primary`
- Final CTA: gradient button, navigates to `/editor` or `/dashboard`

---

*This blueprint is generated from the WiseResume codebase and represents the complete application architecture as of the current version.*
