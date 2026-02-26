
# WiseResume -- Complete App Blueprint for Agent Reconstruction

Create a new file `docs/APP_BLUEPRINT.md` containing a comprehensive, organized reference document that another AI agent can use alongside the repository to fully understand and recreate the app. The document will cover:

## Document Structure

### 1. App Identity and Overview
- Name: WiseResume (brand: WiseUniverse)
- Tagline, mascot (Wise AI), target platform (mobile-first PWA + Capacitor)
- Target users and value proposition

### 2. Technology Stack (Full Table)
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- State: Zustand (persistent) + TanStack React Query
- Routing: React Router v6
- Backend: Supabase (Auth, Postgres, Edge Functions, Storage)
- Native: Capacitor (biometrics, haptics, status bar, splash, deep linking)
- PDF/Docs: pdf-lib, pdfjs-dist, html2canvas, mammoth, docx, tesseract.js
- Voice: ElevenLabs Scribe + Web Speech API
- PWA: vite-plugin-pwa

### 3. Design System
- Tailwind config: breakpoints (xs:375, sm:640, md:768, lg:1024, xl:1280)
- Fonts: Inter (body), Space Grotesk (display)
- Color system: HSL CSS variables (primary, secondary, destructive, muted, accent, success, warning, card, popover, sidebar)
- Dark mode: class-based toggle with system preference support
- Border radius: CSS variable `--radius`
- Custom animations: fade-in, slide-up, scale-in, shimmer, gradient-shift, float, glow-pulse, twinkle, orbit, cosmic effects
- Glass surface pattern, safe area insets for native

### 4. App Entry and Provider Tree
- Exact hierarchy: QueryClientProvider > TooltipProvider > ErrorBoundary > Toaster > BrowserRouter > AuthProvider > AppRoutes + DeferredProviders + AppInstallPrompt
- QueryClient config (5min stale, 10min gc, no refetch on focus, 1 retry)
- Splash screen, biometric lock, theme sync, global hooks

### 5. Complete Routing Map
- All public routes (9 routes with paths, pages, descriptions)
- All protected routes (25+ routes with paths, pages, skeletons)
- Redirects (/activity -> /applications, /jobs -> /applications)
- Public standalone routes (/share/:token, /p/:username, /l/:linkId)

### 6. Layout Architecture
- AppShell: OfflineBanner, SlowConnectionBanner, Header (mobile), DesktopNav (desktop sidebar), ScrollProgressBar, SwipeBackWrapper, BottomTabBar, SyncConflictDialog
- BottomTabBar: 5 tabs (Home, Editor, AI Tools, Activity, Portfolio) with icons, matchPaths, discovery dots, haptic feedback, animated pill indicator
- TAB_ROUTES list for bottom nav visibility
- Back navigation: BACK_ROUTES map, EXIT_ROUTES, unsaved changes guard

### 7. Screen-by-Screen Breakdown
For each major screen, document:
- Component tree and sub-components
- Key UI elements and interactions
- Lazy-loaded dialogs/sheets
- Data hooks used

Screens covered:
1. **Landing Page (Index)**: Hero, features grid, comparison table, portfolio demo, editor demo, footer, space background
2. **Auth Page**: Email entry, login form, signup form, magic link, verify email, password reset, social auth (Google/Apple), cooldown/rate limiting
3. **Dashboard**: Profile header with popover, DashboardStats, QuickActionChips, ResumeFilters (search, sort, category, score), ResumeGroup/ResumeListCard, WhatsNextCard, FeatureDiscoveryCard, FloatingCreateButton, CreateResumeDialog, AnalyzeJobSheet, OnboardingCarousel, pull-to-refresh
4. **Editor**: StepperNav tabs (Contact, Summary, Experience, Education, Skills + optional sections), SectionCard wrappers, inline AI actions, ATS suggestions, ProgressBar, cloud sync status, undo/redo, KeyboardToolbar, LivePreviewPanel (desktop split) / LivePreviewSheet (mobile), toolbar actions (Template, Customize, Share, Export, ATS Scan, Proofread, Version History, Content Library, AI tools)
5. **Preview**: Template rendering, PDF export, page break controls, export options
6. **Upload**: UploadZone (drag & drop), FileTypeSelector, UploadProgressSteps, OCRPromptDialog, ImportReviewSheet, ATSScorePreview
7. **AI Studio**: Tool grid (18 AI tools), chat input with suggestions, AIEngineBadge, AICreditsIndicator, lazy-loaded sheets for each tool
8. **Interview**: InterviewSetup (mode selection), InterviewPreview (question categories), voice conversation UI (TranscriptBubble, audio visualization), InterviewSummary (scores), InterviewHistorySheet, CompanyBriefingSheet
9. **Applications**: StatusFilter, ApplicationCard, JobActivityStats, ActivityStreak, ActivityTimeline, AddApplicationSheet, SaveJobSheet, JobSearchSheet
10. **Portfolio Editor**: Portfolio customization, theme selection, section arrangement, QR code generation, VisitorsPanel analytics
11. **Public Portfolio**: Public-facing portfolio view
12. **Settings**: Section chips (Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About), EditProfileSheet, ThemeToggle, BiometricSetupSheet, ElevenLabsKeySheet, AISettingsSheet, DataExportSheet, DeleteDataDialog, DeveloperCreditCard
13. **Cover Letters**: CoverLetterCard list, create/edit flow
14. **Resignation Letters**: ResignationChecklist, create/edit flow
15. **Career**: CareerQuizSheet, CareerRoadmap, SkillGapAnalyzer
16. **Templates**: 30 template gallery with previews
17. **Onboarding**: 4-step carousel

### 8. Resume Templates (30 templates)
Complete list with names: Modern, Classic, Minimal, Professional, Developer, Creative, Executive, Compact, Academic, Healthcare, Sales, Elegant, Corporate, Banking, Consulting, Federal, Legal, Marketing, Designer, Portfolio, Startup, Infographic, DataScience, DevOps, Cyber, Product, Clean, Swiss, Mono, Zen

### 9. Data Models
- Complete TypeScript interfaces for: ResumeData, ContactInfo, Experience, Education, Certification, Award, Project, Publication, Volunteering, Hobby, Language, Reference, TemplateCustomization
- JobMatchScore, GapAnalysis, SuperTailorResult, JobIntelligence, BulletTransformation
- TemplateId union type (30 values)
- SectionId, TailorSectionId
- PDFOptions, ExportType

### 10. Database Schema (20+ tables)
- All tables with columns and types
- Self-referencing (resumes.parent_resume_id)
- JSONB columns (contact_info, experience, education, skills, certifications)
- All RPCs and database functions
- Views (user_api_keys_safe)

### 11. State Management
- All 8 Zustand stores with their key state and actions
- resumeStore: current resume, undo/redo (50 snapshots), job matching, tailor history, cloud sync
- settingsStore: theme, biometric, splash, shake-to-report
- React Query hook patterns

### 12. Edge Functions (39 functions)
- Categorized: AI (21), Document Processing (4), Utility (14)
- AI models used by each function
- Shared modules (_shared/): aiClient.ts (3-tier fallback), authMiddleware.ts, cors.ts, rateLimiter.ts

### 13. Hooks Reference (55+)
- Complete categorized list with brief purpose for each hook

### 14. Navigation Flow
- BACK_ROUTES map (complete mapping)
- EXIT_ROUTES
- Tab matchPaths configuration
- Unsaved changes guard on editor exit
- Swipe-back gesture support

### 15. Native Features (Capacitor)
- Biometric lock, haptic feedback, status bar theming, splash screen, deep linking, back button handling, shake-to-report

### 16. Offline and PWA
- Service worker, offline banner, sync queue, network quality detection

### 17. Security
- RLS, JWT validation, rate limiting, encrypted API keys, audit logging, session hijack prevention, share passwords

### Technical Details
- Single markdown file: `docs/APP_BLUEPRINT.md`
- Approximately 1500-2000 lines
- Uses text code blocks for diagrams
- Organized with clear heading hierarchy
- Includes component trees, data flow, and screen compositions
