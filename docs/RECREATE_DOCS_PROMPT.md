# Master Recreation Prompt for WiseResume

> **System Instruction**: This file contains a master prompt that can be pasted into a new Lovable project to instruct it to recreate all 13 documentation files for the "WiseResume" project. The files are large, so they must be created one by one.

---

## MASTER SYSTEM PROMPT (Paste this first)

```
You are an expert technical writer and software architect. Your task is to recreate the complete documentation suite for "WiseResume", an AI-powered resume builder project.

Because the documentation is extensive (~10,000 lines across 13 files), you will create these files sequentially, one by one.

### INSTRUCTIONS:
1. I will provide the specification for each file below.
2. You will create the file exactly as specified at the correct path.
3. Use the exact file paths provided.
4. After creating a file, confirm completion and ask to proceed to the next one.
5. Do NOT create all files at once. Wait for my confirmation between files if needed, or process them in logical chunks if you can handle multiple.

### FILE LIST (In order of dependency):
1. `docs/PROJECT_OVERVIEW.md` (High-level summary)
2. `docs/APP_BLUEPRINT.md` (Web app specs)
3. `docs/APP_BLUEPRINT_FLUTTER.md` (Mobile app specs)
4. `docs/DB_FEATURE_MAP.md` (Database logic)
5. `docs/MOBILE_RESPONSIVENESS_PLAN.md` (Responsive rules)
6. `docs/perf-checklist.md` (QA checklist)
7. `docs/PROGRESS_TILL_NOW.md` (Status report)
8. `docs/INSPIRATION_WEB.md` (Web design sources)
9. `docs/INSPIRATION_FLUTTER.md` (Mobile design sources)
10. `docs/STITCH_PROMPTS_WEB.md` (Web UI prompts)
11. `docs/STITCH_PROMPTS_FLUTTER.md` (Mobile UI prompts)
12. `docs/REBUILD_PROMPTS.md` (Web build instructions)
13. `docs/REBUILD_PROMPTS_FLUTTER.md` (Mobile build instructions)

Wait for the first file specification.
```

---

## FILE 1: `docs/PROJECT_OVERVIEW.md`

**Create this file with the following content structure:**

1.  **Title**: `# WiseResume - Project Overview`
2.  **Summary**: "AI-Powered Resume Builder & Interview Coach. A mobile-first Progressive Web App..."
3.  **Table of Contents**: 10 sections (Overview, Tech Stack, Architecture, Core Features, AI, Models, User Flows, DB Schema, Current State, Future Ideas).
4.  **Project Overview**:
    *   App Identity: WiseResume, "Your AI career companion", "Wise AI" mascot.
    *   Value Prop: Instant AI feedback, one-click optimization, mock interviews.
    *   Target Users: Job seekers, career changers.
5.  **Technology Stack**:
    *   Frontend: React 18, TS, Vite, Tailwind, Framer Motion, shadcn/ui.
    *   State: Zustand, TanStack Query.
    *   Backend: Supabase (Auth, DB, Edge Functions).
    *   Native: Capacitor.
    *   PDF: html2canvas, pdf-lib, pdfjs-dist.
    *   Voice: ElevenLabs Scribe, Web Speech API.
6.  **Application Architecture**:
    *   Tree: `src/components/{dashboard, editor, interview...}`, `supabase/functions/{analyze-resume, tailor-resume...}`.
    *   State: `resumeStore` (resume data), `settingsStore` (preferences).
7.  **Core Features** (16 items):
    *   Resume Management, Editor (Tabs: Contact, Summary, Exp, Edu, Skills), Templates (12 types: Modern, Classic, etc.).
    *   PDF Upload & Parsing (pdfjs, mammoth, tesseract).
    *   AI Analysis (`analyze-resume`), Tailoring (`tailor-resume` - Gemini 2.5 Pro).
    *   Cover Letter (`generate-cover-letter`), Recruiter Sim (4 personas).
    *   Mock Interview (Voice-based, ElevenLabs, STAR scoring).
    *   Multi-Job Compare, PDF Export, Auth, Cloud Sync, Biometric Lock, Settings.
8.  **AI Capabilities** (11 Edge Functions):
    *   `analyze-resume`, `tailor-resume`, `enhance-section`, `generate-cover-letter`, `generate-headshot`, `interview-chat`, `parse-job-url`, `parse-linkedin`, `parse-resume`, `recruiter-simulation`, `elevenlabs-scribe-token`.
    *   Models: Gemini 2.5 Pro, Gemini 3 Flash, GPT-5 Mini.
9.  **Data Models**: `ResumeData`, `Experience`, `JobMatchScore`.
10. **Database Schema**: `profiles`, `resumes`, `ai_usage_logs` tables.
11. **Current State**: Works well (Editor, Templates, AI, Voice). Issues: iOS voice support, PDF page breaks.
12. **Future Ideas**: LinkedIn Easy Apply, Salary Negotiator, Video Interview.

---

## FILE 2: `docs/APP_BLUEPRINT.md`

**Create this file containing the detailed Web App specifications:**

1.  **Title**: `# WiseResume — Complete App Blueprint`
2.  **Table of Contents**: 18 sections covering Identity, Stack, Design, Routing, Layout, Screens, Templates, Data, DB, State, Edge Functions, Hooks, Nav, Native, Offline, Security, Visuals.
3.  **App Identity**: Mobile-first PWA, Dark mode default.
4.  **Tech Stack**: React 18, Vite 5, Tailwind, Zustand, Supabase, Capacitor v8.
5.  **Design System**:
    *   Breakpoints: xs: 375px (iPhone SE), sm: 640, md: 768, lg: 1024, xl: 1280.
    *   Fonts: Inter (body), Space Grotesk (display).
    *   Colors (HSL): Background `240 20% 4%`, Primary `355 90% 60%` (Red), Secondary `185 100% 50%` (Cyan), Accent `330 100% 65%` (Pink).
    *   Utilities: `.glass`, `.gradient-primary`, `.animate-float`.
6.  **App Entry**: `main.tsx` → `AuthProvider` → `AppRoutes`.
7.  **Routing**:
    *   Public: `/`, `/auth`, `/share/:token`, `/p/:username`.
    *   Protected: `/dashboard`, `/editor`, `/preview`, `/upload`, `/settings`, `/interview`, `/applications`, `/ai-studio`, `/portfolio`, `/cover-letters`.
8.  **Layout**: `AppShell` with `BottomTabBar` (mobile) and `DesktopNav` (desktop).
    *   Tabs: Home, Editor, AI Tools, Activity, Portfolio.
9.  **Screens**: Detailed breakdown of Landing, Auth, Dashboard, Editor (stepper, sections), Preview, Upload, AI Studio, Interview, Applications, Portfolio, Settings.
10. **Templates**: 30 IDs (modern, classic, minimal, professional, developer, creative, etc.).
11. **Data Models**: TS Interfaces for `ResumeData`, `ContactInfo`, `Experience`, `Education`, `JobMatchScore`.
12. **Database Schema**: 22 tables (`profiles`, `resumes`, `jobs`, `job_applications`, `interview_sessions`, `ai_credits`, `notifications`, `portfolio_visits`, etc.).
13. **State**: 8 Zustand stores (`resumeStore`, `settingsStore`, `offlineSyncStore`, etc.).
14. **Edge Functions**: 39 functions listed by category (Resume AI, Document Gen, Career AI, Parsing, etc.).
15. **Hooks**: 56 hooks (`useResumes`, `useAIAction`, `useVoiceInterview`).
16. **Navigation**: Back routes map and exit routes.
17. **Native**: Capacitor config (Biometrics, Status Bar, Deep Links).
18. **Visual Mockups**: ASCII wireframes for Landing, Auth, Dashboard, Editor, Preview, AI Studio.

---

## FILE 3: `docs/APP_BLUEPRINT_FLUTTER.md`

**Create this file containing the detailed Flutter App specifications:**

1.  **Title**: `# WiseResume — Complete App Blueprint (Flutter / Dart)`
2.  **Instruction**: "Must be built with Flutter 3.x + Dart. Mobile-first native app."
3.  **Tech Stack**: Flutter 3.x, Material 3, Riverpod, GoRouter, Supabase Flutter, Hive (local DB), flutter_animate.
4.  **Design System**: Maps Tailwind HSL to `ColorScheme`.
    *   Primary: `Color(0xFFE63946)`, Background: `Color(0xFF0B0D17)`.
    *   Widgets: `GlassSurface`, `GradientButton`, `ScoreRing`.
5.  **Routing**: GoRouter with `ShellRoute` for bottom nav.
    *   Routes match web: `/dashboard`, `/editor`, `/ai-studio`.
6.  **Architecture**:
    *   `lib/core`: Theme, Router, Services.
    *   `lib/features`: Feature-based folders (auth, dashboard, editor...).
    *   `lib/shared`: Widgets, Models, Providers.
7.  **Screen Breakdown**:
    *   Splash Screen (Native).
    *   Auth (Email/Pass, Social).
    *   Dashboard (Stats, Resume List, FAB).
    *   Editor (Custom AppBar, StepperNav, Form Sections).
    *   Preview (InteractiveViewer for zoom).
    *   AI Studio (Grid of tools).
    *   Interview (Voice recording, waveform).
8.  **Data Models**: Dart `@freezed` classes mirroring TS interfaces.
9.  **State**: Riverpod providers (`resumeProvider`, `settingsProvider`) with Hive persistence.
10. **Services**: `AuthService`, `AIService` (calls Edge Functions), `UploadService`.
11. **Native Features**: `local_auth` (Biometrics), `uni_links` (Deep linking), `flutter_native_splash`.

---

## FILE 4: `docs/DB_FEATURE_MAP.md`

**Create this file containing the database feature mapping:**

1.  **Title**: `# WiseResume — Database Feature Map & Data Flow Audit`
2.  **Feature → Tables Map**:
    *   Auth & Profiles → `profiles`
    *   Resumes → `resumes`, `resume_versions`
    *   Sharing → `resume_shares`, `share_comments`
    *   Applications → `job_applications`, `jobs`
    *   Portfolio → `profiles`, `portfolio_visits`, `short_links`
    *   AI → `ai_usage_logs`, `ai_credits`
    *   Interview → `interview_sessions`
3.  **Data Flow Traces**:
    *   **Flow A (Editor)**: UI → `resumeStore` → `useResumes` → `supabase.from('resumes').update`.
    *   **Flow B (Applications)**: UI → `useJobApplications` → `supabase.from('job_applications')`.
    *   **Flow C (Portfolio)**: `get_public_portfolio` RPC (SECURITY DEFINER).
4.  **Verification**: RLS policies enforce `auth.uid() = user_id`.

---

## FILE 5: `docs/MOBILE_RESPONSIVENESS_PLAN.md`

**Create this file containing responsive design rules:**

1.  **Title**: `# Mobile Responsiveness Enhancement Plan`
2.  **Breakpoints**: `xs: 375px` (Primary), `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.
3.  **Fluid Typography**: `clamp()` based font sizes (`text-fluid-sm` to `text-fluid-4xl`).
4.  **Touch Targets**: Minimum 44x44px.
5.  **Safe Areas**: `p-safe`, `pb-safe` utilities for notches/home bars.
6.  **Component Adaptation**:
    *   Dialogs: Full-screen on mobile, centered modal on desktop.
    *   Sheets: Bottom sheet on mobile, side sheet on desktop.
    *   Grid: 1 col mobile, 2 col tablet, 3-4 col desktop.
7.  **Scroll**: `scroll-container-mobile` with snap points.

---

## FILE 6: `docs/perf-checklist.md`

**Create this file containing the QA checklist:**

1.  **Title**: `# Mobile Performance & Responsiveness QA Checklist`
2.  **Test Widths**: 320px, 375px, 390px, 414px, 768px.
3.  **Flows to Verify**: Onboarding, Editor (drag handles), Export, Settings, Tab Nav.
4.  **Checks**: No horizontal scroll, text clipping, white flashes, touch target size.

---

## FILE 7: `docs/PROGRESS_TILL_NOW.md`

**Create this file containing the project status:**

1.  **Title**: `# Project Status & Documentation Report`
2.  **Screen Map**: List of 41 screens (Landing, Auth, Dashboard... to Achievements).
3.  **Missing Screens**: Paywall/Upgrade, Email Verification Pending.
4.  **Features**:
    *   **Functional**: Auth, Resume CRUD, AI Tools, Portfolio, Sharing, PWA.
    *   **Placeholder**: Payments (UI only), Referral tracking, Gamification DB.
5.  **Database**: 21 tables, 39 edge functions.
6.  **Lifecycle**: "Deep in Core Features phase".
7.  **Top Priorities**: 1. Stripe Payments, 2. AI Credit Enforcement, 3. E2E Testing.

---

## FILE 8: `docs/INSPIRATION_WEB.md`

**Create this file containing web design sources:**

1.  **Title**: `# WiseResume — Web App Design Inspiration Sources`
2.  **Categories**:
    *   **Resume Builders**: Teal, Rezi, Kickresume, FlowCV (Study: dashboards, editors).
    *   **AI Tools**: Jobscan, VMock (Study: score visualization).
    *   **SaaS Design**: Linear, Raycast, Vercel (Study: dark mode, glassmorphism).
    *   **Portfolio**: Read.cv, Bento.

---

## FILE 9: `docs/INSPIRATION_FLUTTER.md`

**Create this file containing mobile design sources:**

1.  **Title**: `# WiseResume — Mobile App (Flutter) Design Inspiration Sources`
2.  **Categories**:
    *   **Apps**: Canva (gestures), LinkedIn (feed), Glassdoor, CV Engineer.
    *   **Flutter Showcases**: Google Pay (M3), Reflectly (animations), Hamilton (glass).
    *   **Patterns**: Material 3 Gallery, Flutter Gallery.

---

## FILE 10: `docs/STITCH_PROMPTS_WEB.md`

**Create this file containing the 28 Stitch prompts for Web:**

1.  **Title**: `# WiseResume — Google Stitch Prompts (Web App)`
2.  **System Block**: Standard "DESIGN SYSTEM" block with colors (`#0B0D17` bg, `#6366F1` primary), fonts (Space Grotesk/Inter), and 375px viewport.
3.  **Prompts**:
    *   1: Auth (Email/Login).
    *   2: Auth (Signup/Reset).
    *   3: Dashboard Main.
    *   4: Dashboard FAB/Empty.
    *   5: Editor Stepper.
    *   ... through ...
    *   28: Resignation Letters.
    *   Each prompt describes layout, components, and specific UI elements for 1-2 screens.

---

## FILE 11: `docs/STITCH_PROMPTS_FLUTTER.md`

**Create this file containing the 30 Stitch prompts for Flutter:**

1.  **Title**: `# WiseResume — Google Stitch Prompts (Flutter / Mobile App)`
2.  **System Block**: "DESIGN SYSTEM (Mobile Native)" block. Includes status bar, safe areas, Material 3 conventions.
3.  **Prompts**:
    *   1: Splash Screen (Stars + Logo).
    *   2-3: Auth.
    *   4-5: Dashboard.
    *   6-7: Editor (Native toolbar/sheets).
    *   ... through ...
    *   30: Guides.
    *   Differences: Uses `NavigationBar`, `BottomSheet`, `SliverAppBar` terminology.

---

## FILE 12: `docs/REBUILD_PROMPTS.md`

**Create this file containing the 52-step Web build instructions:**

1.  **Title**: `# WiseResume — Sequential Rebuild Prompts`
2.  **Master Prompt**: "You are an expert full-stack developer..." with 10 rules (Progress Tracker, Tech Stack, Mobile-First).
3.  **Phases**:
    *   **Phase 1 Foundation**: Setup, Auth, DB Schema (23 tables), State (Zustand), Layout (AppShell).
    *   **Phase 2 Core Screens**: Landing, Dashboard, Editor, Preview, Upload, Templates (30), Onboarding, Settings.
    *   **Phase 3 AI Features**: AI Client, Studio, Analyze, Tailor, Enhance, Proofread, Documents (Cover/Resignation), Interview (Voice).
    *   **Phase 4 Job Tracking**: Applications, Details, Notifications.
    *   **Phase 5 Portfolio**: Editor, Public Page, Analytics.
    *   **Phase 6 Sharing**: Share Links, Comments, Versions, Export.
    *   **Phase 7 Advanced**: Help, Analytics, Subscription (UI), Referral, Badges.
    *   **Phase 8 Native**: PWA, Capacitor, Offline Sync, Push.
    *   **Phase 9 Launch**: Stripe, Credit Enforcement, QA.

---

## FILE 13: `docs/REBUILD_PROMPTS_FLUTTER.md`

**Create this file containing the 55-step Flutter build instructions:**

1.  **Title**: `# WiseResume — Sequential Rebuild Prompts (Flutter / Dart)`
2.  **Master Prompt**: "You are an expert Flutter developer..." with rules.
3.  **Phases**:
    *   **Phase 1 Foundation**: Project Setup, Theme (M3), Supabase Auth, Data Models (freezed), Riverpod/Hive, GoRouter/AppShell.
    *   **Phase 2 Core Screens**: Landing, Dashboard, Editor, Bottom Sheets, Preview, Upload, Templates (Rendering System), Onboarding, Profile, Settings.
    *   **Phase 3 AI Features**: AI Service, Studio, Tools, Documents, Mock Interview (Speech-to-Text), Career Path.
    *   **Phase 4 Job Tracking**: Applications, Details, Parsing, Notifications.
    *   **Phase 5 Portfolio**: Editor, Public View, Analytics.
    *   **Phase 6 Sharing**: Sharing, Versions, Export (PDF package).
    *   **Phase 7 Advanced**: Help, Stats, Subscription, Referral, Badges.
    *   **Phase 8 Native**: Biometric Lock, Deep Links, Offline Sync, Push.
    *   **Phase 9 Launch**: In-App Purchase/Stripe, Credit Enforcement, Platform Opts.

---

## FINAL VALIDATION CHECKLIST

After creating all files, verify:
1.  All 13 files exist in `docs/`.
2.  `APP_BLUEPRINT.md` and `APP_BLUEPRINT_FLUTTER.md` contain the exact color tokens (`--primary: 355 90% 60%`).
3.  Database schema in `DB_FEATURE_MAP` matches `REBUILD_PROMPTS` (21-23 tables).
4.  Route paths are consistent (e.g., `/dashboard`, `/editor`).
