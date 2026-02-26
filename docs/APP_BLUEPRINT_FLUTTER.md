# WiseResume — Complete App Blueprint (Flutter / Dart)

> **Purpose**: This document is a comprehensive reference for an AI agent to fully understand and recreate the WiseResume application **as a native mobile app using Flutter and Dart**. It covers every screen, widget tree, data model, navigation flow, design system token, and backend function in the app.

> **IMPORTANT — Native Mobile App**: This application **must** be built with **Flutter 3.x + Dart**. It is a mobile-first native app targeting Android and iOS. All screens, navigation, state, and UI described in this document must be implemented using Flutter-native patterns. The Supabase backend (database, Edge Functions, Auth, Storage) remains the same — only the client SDK changes to `supabase_flutter`.

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
9. [Data Models (Dart)](#9-data-models-dart)
10. [Database Schema](#10-database-schema-20-tables)
11. [State Management](#11-state-management)
12. [Edge Functions](#12-edge-functions-39)
13. [Services & Repositories Reference](#13-services--repositories-reference)
14. [Navigation Flow](#14-navigation-flow)
15. [Native Features](#15-native-features)
16. [Offline & Local Storage](#16-offline--local-storage)
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
| **Platform** | Native mobile app (Flutter) — Android + iOS. Mobile-first design, must feel fully native. |
| **Target Users** | Job seekers optimizing resumes, preparing for interviews |
| **Default Theme** | Dark mode (space-inspired aesthetic) |
| **Base Font Size** | 14.5 logical pixels mobile, 16 desktop/tablet (compact density) |

**Value Proposition**: All-in-one career toolkit — resume builder with 30 templates, AI tailoring for specific jobs, ATS scoring, mock interviews with voice, cover/resignation letter generation, portfolio hosting, and job application tracking.

---

## 2. Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Framework** | Flutter 3.x + Dart | Material 3 + Cupertino adaptive widgets |
| **UI Components** | Material 3 + Custom widgets | Adaptive platform styling |
| **Animation** | Flutter implicit/explicit animations + Rive/Lottie | `AnimatedContainer`, `Hero`, `AnimationController`, `PageRouteBuilder` |
| **State (client)** | Riverpod | `StateNotifierProvider`, `AsyncNotifierProvider`, persistent via Hive/SharedPreferences |
| **State (server)** | Riverpod async providers | Equivalent to React Query — caching, stale-while-revalidate, retry |
| **Routing** | GoRouter | Declarative, nested routes, `ShellRoute` for bottom nav |
| **Backend** | Supabase (Auth, Postgres, Edge Functions, Storage) | via `supabase_flutter` SDK |
| **Biometrics** | `local_auth` | Fingerprint / Face ID |
| **Haptics** | `HapticFeedback` (Flutter services) | Selection, impact, heavy feedback |
| **Status Bar** | `flutter_statusbarcolor` or `SystemChrome` | Theme-aware color sync |
| **Splash Screen** | `flutter_native_splash` | Native splash, hidden after auth resolves |
| **Deep Linking** | `uni_links` + GoRouter deep link config | Handle `wiseresume://` URLs |
| **In-App Browser** | `url_launcher` / `flutter_inappwebview` | Open external links |
| **PDF Generation** | `pdf` + `printing` packages | Build PDF from Dart models |
| **PDF Parsing** | `syncfusion_flutter_pdf` or `pdfx` | Extract text from uploaded PDFs |
| **Word Docs** | `docx_template` (write) + custom parser (read) | .docx import/export |
| **OCR** | `google_mlkit_text_recognition` | Image-to-text for resume scanning |
| **Voice** | ElevenLabs API + `speech_to_text` package | Voice interview, STT fallback |
| **QR Codes** | `qr_flutter` | Generate QR codes for portfolio |
| **Charts** | `fl_chart` | Analytics, score trends |
| **Forms** | `flutter_form_builder` + custom validators | Form management |
| **Markdown** | `flutter_markdown` | Render markdown content |
| **Local DB** | Hive / Isar | Offline persistence, caching |
| **Connectivity** | `connectivity_plus` | Online/offline detection |
| **Shake Detection** | `shake` package | Shake-to-report bug |
| **IDs** | `uuid` package | Unique ID generation |

### Flutter Architecture Notes

**Project structure**:
```
lib/
  ├── main.dart
  ├── app.dart                    # MaterialApp.router + theme + providers
  ├── core/
  │     ├── theme/                # ThemeData, ColorScheme, TextTheme, ThemeExtension
  │     ├── router/               # GoRouter configuration
  │     ├── constants/            # App constants, template IDs
  │     ├── utils/                # Helpers, formatters
  │     └── services/             # Supabase client, AI client, auth service
  ├── features/
  │     ├── auth/                 # Login, signup, email verify
  │     ├── dashboard/            # Dashboard, resume list, stats
  │     ├── editor/               # Resume editor, sections, toolbar
  │     ├── preview/              # Resume preview rendering
  │     ├── upload/               # Upload, parse, OCR
  │     ├── ai_studio/            # AI tools grid, chat
  │     ├── interview/            # Mock interview, voice
  │     ├── applications/         # Job tracking, activity
  │     ├── portfolio/            # Portfolio editor + public view
  │     ├── settings/             # Settings, profile, preferences
  │     ├── cover_letters/        # Cover letter CRUD
  │     ├── resignation_letters/  # Resignation letter CRUD
  │     ├── career/               # Career quiz, roadmap
  │     ├── templates/            # Template gallery
  │     ├── onboarding/           # Onboarding wizard
  │     └── landing/              # Landing page (marketing)
  ├── shared/
  │     ├── widgets/              # Reusable widgets (GlassSurface, ScoreRing, EmptyState, etc.)
  │     ├── models/               # Shared data models (ResumeData, etc.)
  │     └── providers/            # Shared Riverpod providers
  └── gen/                        # Generated code (freezed, json_serializable)
```

**Design translation**: The Tailwind CSS design tokens (Section 3) map to Flutter `ThemeData` as follows:
- CSS variables → `ColorScheme` + custom `ThemeExtension<WiseResumeTheme>`
- `rounded-2xl` → `BorderRadius.circular(16)`
- `rounded-3xl` → `BorderRadius.circular(24)`
- `rounded-full` → `BorderRadius.circular(999)` or `StadiumBorder`
- Glass surfaces → `ClipRRect` + `BackdropFilter` + `Container` with semi-transparent color
- `bg-gradient-to-r from-primary to-accent` → `LinearGradient(colors: [theme.primary, theme.accent])`
- Framer Motion `layoutId` → Flutter `Hero` widget with matching tags
- Framer Motion spring → `SpringSimulation` or `Curves.easeOutBack`

---

## 3. Design System

### 3.1 Breakpoints

```
xs: 375 logical px  (iPhone SE — primary target)
sm: 640
md: 768             (tablet)
lg: 1024            (desktop/tablet landscape — show side nav)
xl: 1280
2xl: 1400
```

Use `MediaQuery.of(context).size.width` or `LayoutBuilder` for responsive layouts.

### 3.2 Fonts

| Role | Font | Weight | Flutter |
|------|------|--------|---------|
| Body | Inter | 400-700 | `GoogleFonts.inter()` or bundled asset |
| Display | Space Grotesk | 600 (headings) | `GoogleFonts.spaceGrotesk()` |

### 3.3 Color System

All colors are defined as HSL values and mapped to Flutter `ColorScheme` + custom `ThemeExtension`.

#### Dark Mode (default)

| Token | HSL Value | Description | Flutter Color |
|-------|-----------|-------------|---------------|
| `background` | `240 20% 4%` | Deep space black | `ColorScheme.surface` |
| `foreground` | `0 0% 98%` | Near-white text | `ColorScheme.onSurface` |
| `card` | `240 15% 8%` | Card surfaces | `ColorScheme.surfaceContainerHighest` |
| `primary` | `355 90% 60%` | Vibrant red (brand) | `ColorScheme.primary` |
| `secondary` | `185 100% 50%` | Cyan accent | `ColorScheme.secondary` |
| `accent` | `330 100% 65%` | Hot pink | Custom `ThemeExtension` |
| `muted` | `240 15% 15%` | Subdued surfaces | `ColorScheme.surfaceContainerLow` |
| `muted-foreground` | `240 10% 68%` | Secondary text | `ColorScheme.onSurfaceVariant` |
| `destructive` | `0 84% 60%` | Error red | `ColorScheme.error` |
| `success` | `145 100% 50%` | Lime green | Custom `ThemeExtension` |
| `warning` | `45 100% 55%` | Amber | Custom `ThemeExtension` |
| `border` | `240 15% 18%` | Subtle borders | `ColorScheme.outlineVariant` |
| `input` | `240 15% 12%` | Input backgrounds | Custom `ThemeExtension` |
| `ring` | `355 90% 60%` | Focus ring (matches primary) | `ColorScheme.primary` |

#### Light Mode

| Token | HSL Value |
|-------|-----------|
| `background` | `0 0% 100%` |
| `foreground` | `240 10% 10%` |
| `card` | `0 0% 98%` |
| `primary` | `355 75% 50%` |
| `secondary` | `185 80% 45%` |
| `accent` | `330 80% 55%` |
| `muted` | `240 5% 92%` |
| `success` | `145 70% 40%` |
| `warning` | `45 90% 48%` |

#### Space Theme Tokens (dark only)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `space-deep` | `240 30% 3%` | Landing page deep background |
| `space-nebula` | `270 60% 15%` | Nebula effect |
| `space-star` | `45 100% 75%` | Star particles |
| `space-cyan` | `185 100% 60%` | Glowing cyan accents |
| `space-glow` | `270 100% 70%` | Purple glow |

#### Custom ThemeExtension

```dart
class WiseResumeTheme extends ThemeExtension<WiseResumeTheme> {
  final Color accent;
  final Color success;
  final Color warning;
  final Color input;
  final Color spaceDeep;
  final Color spaceNebula;
  final Color spaceStar;
  final Color spaceCyan;
  final Color spaceGlow;
  final Color sidebarBackground;
  final Color sidebarPrimary;
  final Color sidebarAccent;
  // ... gradients, shadows
}
```

### 3.4 Typography

```dart
TextTheme(
  displayLarge:  spaceGrotesk(fontWeight: FontWeight.bold, fontSize: clamp(24, 7vw, 32)),
  displayMedium: spaceGrotesk(fontSize: 24, fontWeight: FontWeight.bold),
  displaySmall:  spaceGrotesk(fontSize: 20, fontWeight: FontWeight.w600),
  bodyLarge:     inter(fontSize: 16, height: 1.6),
  bodyMedium:    inter(fontSize: 14.5),
  labelSmall:    inter(fontSize: 12, fontWeight: FontWeight.w500),
  // caption: uppercase, letterSpacing: 1.5
)
```

### 3.5 Spacing

```dart
const kEdgePadding = EdgeInsets.symmetric(horizontal: 12); // md: 16
const kSectionSpacing = 16.0; // md: 24
const kCardPadding = EdgeInsets.all(12); // md: 16
// Safe area: MediaQuery.of(context).padding
```

### 3.6 Glass Surface System

```dart
class GlassSurface extends StatelessWidget {
  // card.withOpacity(0.7) + BackdropFilter(sigmaX: 20, sigmaY: 20) + border(border.withOpacity(0.3))
  // On native Android: skip BackdropFilter for performance, use opaque bg
}

class GlassCard extends StatelessWidget { /* card.withOpacity(0.5) + blur(16) + primary shadow */ }
class GlassInput extends StatelessWidget { /* input.withOpacity(0.5) + blur(8) + focus glow */ }
class GlassHeader extends StatelessWidget { /* background.withOpacity(0.85) + blur(20) */ }
```

### 3.7 Gradient Utilities

```dart
const kGradientPrimary = LinearGradient(
  begin: Alignment.topLeft, end: Alignment.bottomRight,
  colors: [primary, accent], // 135deg
);
const kGradientSecondary = LinearGradient(colors: [secondary, primary]);
// Glow: BoxShadow(color: primary.withOpacity(0.4), blurRadius: 24, spreadRadius: -4)
```

### 3.8 Animations

| Name | Duration | Flutter Implementation |
|------|----------|----------------------|
| `fadeIn` | 500ms | `FadeTransition` + `SlideTransition(offset: Offset(0, 0.05))` |
| `slideUp` | 600ms | `SlideTransition(offset: Offset(0, 0.1))` |
| `scaleIn` | 300ms | `ScaleTransition(scale: CurvedAnimation(curve: Curves.easeOut))` |
| `shimmer` | 2s repeat | `Shimmer` widget or animated `LinearGradient` |
| `gradientShift` | 20s repeat | Animated gradient `alignment` |
| `float` | 3s repeat | `AnimatedBuilder` with `sin()` translateY |
| `glowPulse` | 2s repeat | Animated `BoxShadow` intensity |
| `twinkle` | 3s repeat | Animated opacity + scale (star particles) |
| `orbit` | 20s linear repeat | `RotationTransition` |
| `shootingStar` | 3s repeat | `SlideTransition` diagonal + `FadeTransition` |

### 3.9 Dark Mode Toggle

- `ThemeMode.dark` / `ThemeMode.light` / `ThemeMode.system` in `MaterialApp`
- Stored in Riverpod `settingsProvider` persisted via Hive/SharedPreferences
- Smooth transitions via `AnimatedTheme` or `ThemeMode` switching

---

## 4. App Entry & Provider Tree

```text
main.dart
  ├── WidgetsFlutterBinding.ensureInitialized()
  ├── Supabase.initialize(url, anonKey)
  ├── Hive.initFlutter() (local persistence)
  ├── SystemChrome.setPreferredOrientations([portrait])
  └── runApp(ProviderScope(child: WiseResumeApp()))

WiseResumeApp (ConsumerWidget)
  └── MaterialApp.router(
        routerConfig: goRouter,
        theme: lightTheme,
        darkTheme: darkTheme,
        themeMode: ref.watch(themeProvider),
      )
        └── GoRouter with ShellRoute
              ├── AnimatedSplash (first launch only)
              ├── BiometricLockScreen (when locked)
              └── Routes (all page routes)
```

### Auth Setup
- `supabase_flutter` handles session persistence automatically
- `AuthStateChangeListener` widget at top level monitors auth state
- Tracks active user ID to prevent session hijacking
- Updates `profiles.last_active_at` on login
- Runs API key migration and daily cleanup on auth

---

## 5. Complete Routing Map

### GoRouter Configuration

```dart
final goRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) => authRedirectLogic(state),
  routes: [
    // Public routes
    GoRoute(path: '/', builder: (_, __) => const LandingPage()),
    GoRoute(path: '/auth', builder: (_, __) => const AuthPage()),
    GoRoute(path: '/auth/callback', builder: (_, __) => const AuthCallbackPage()),
    GoRoute(path: '/privacy', builder: (_, __) => const PrivacyPage()),
    GoRoute(path: '/terms', builder: (_, __) => const TermsPage()),
    GoRoute(path: '/reset-password', builder: (_, __) => const ResetPasswordPage()),
    GoRoute(path: '/share/:token', builder: (_, state) => SharePage(token: state.pathParameters['token']!)),
    GoRoute(path: '/p/:username', builder: (_, state) => PublicPortfolioPage(username: state.pathParameters['username']!)),
    GoRoute(path: '/l/:linkId', builder: (_, state) => ShortLinkPage(linkId: state.pathParameters['linkId']!)),

    // Protected routes (wrapped in ShellRoute with AppShell)
    ShellRoute(
      builder: (_, __, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/dashboard', builder: (_, __) => const DashboardPage()),
        GoRoute(path: '/editor', builder: (_, __) => const EditorPage()),
        GoRoute(path: '/preview', builder: (_, __) => const PreviewPage()),
        GoRoute(path: '/upload', builder: (_, __) => const UploadPage()),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsPage()),
        GoRoute(path: '/interview', builder: (_, __) => const InterviewPage()),
        GoRoute(path: '/applications', builder: (_, __) => const ApplicationsPage()),
        GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingPage()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
        GoRoute(path: '/templates', builder: (_, __) => const TemplatesPage()),
        GoRoute(path: '/resume/:id', builder: (_, state) => ResumeDetailPage(id: state.pathParameters['id']!)),
        GoRoute(path: '/job/:id', builder: (_, state) => JobDetailPage(id: state.pathParameters['id']!)),
        GoRoute(path: '/application/:id', builder: (_, state) => ApplicationTrackerPage(id: state.pathParameters['id']!)),
        GoRoute(path: '/notifications', builder: (_, __) => const NotificationsPage()),
        GoRoute(path: '/portfolio', builder: (_, __) => const PortfolioEditorPage()),
        GoRoute(path: '/cover-letters', builder: (_, __) => const CoverLettersPage()),
        GoRoute(path: '/cover-letter/new', builder: (_, __) => const CoverLetterNewPage()),
        GoRoute(path: '/cover-letter/edit/:id', builder: (_, state) => CoverLetterEditPage(id: state.pathParameters['id']!)),
        GoRoute(path: '/examples', builder: (_, __) => const ExamplesPage()),
        GoRoute(path: '/career', builder: (_, __) => const CareerPage()),
        GoRoute(path: '/resignation-letters', builder: (_, __) => const ResignationLettersPage()),
        GoRoute(path: '/resignation-letter/new', builder: (_, __) => const ResignationLetterNewPage()),
        GoRoute(path: '/resignation-letter/edit/:id', builder: (_, state) => ResignationLetterEditPage(id: state.pathParameters['id']!)),
        GoRoute(path: '/guides', builder: (_, __) => const GuidesPage()),
        GoRoute(path: '/guides/:slug', builder: (_, state) => GuidePage(slug: state.pathParameters['slug']!)),
        GoRoute(path: '/ai-studio', builder: (_, __) => const AIStudioPage()),
      ],
    ),
  ],
);
```

### Redirects

| From | To |
|------|----|
| `/activity` | `/applications` |
| `/jobs` | `/applications` |

---

## 6. Layout Architecture

### AppShell Widget Tree

```text
AppShell(child)
  ├── WillPopScope / PopScope (Android back button handling)
  ├── Scaffold(
  │     appBar: (mobile only, hidden on editor)
  │     │     └── GlassHeader("WiseResume / PageTitle")
  │     body: Column(
  │       ├── OfflineBanner (when offline)
  │       ├── SlowConnectionBanner (when slow)
  │       ├── Expanded(child) ← page content with fade transition
  │     ),
  │     bottomNavigationBar: BottomTabBar (mobile only),
  │   )
  └── SyncConflictDialog (when detected)
```

### BottomTabBar (5 tabs)

| Tab | Icon | Path | Match Paths |
|-----|------|------|-------------|
| **Home** | `Icons.home` | `/dashboard` | `/dashboard`, `/settings`, `/profile`, `/notifications`, `/templates`, `/examples`, `/guides`, `/resume`, `/onboarding` |
| **Editor** | `Icons.description` | `/editor` | `/editor`, `/preview` |
| **AI Tools** | `Icons.auto_awesome` | `/ai-studio` | `/ai-studio`, `/career`, `/cover-letter*`, `/resignation-letter*`, `/interview` |
| **Activity** | `Icons.bar_chart` | `/applications` | `/applications`, `/application`, `/job` |
| **Portfolio** | `Icons.language` | `/portfolio` | `/portfolio` |

**Tab Features**:
- Animated pill indicator (`Hero` widget with spring-like curve or custom `AnimatedPositioned`)
- Discovery dots for first-time users (AI Tools, Portfolio)
- Changelog badge on Home tab
- Offline sync pending count on Home tab
- `HapticFeedback.selectionClick()` on tap
- Editor tab is "guarded" — auto-loads latest resume or prompts creation
- Glass surface background with rounded top corners

### Header (Mobile)

- Height: 40 logical px
- Content: "WiseResume" brand text + "/ Page Title"
- Uses GlassSurface background with border
- Hidden on editor routes

---

## 7. Screen-by-Screen Breakdown

### 7.1 Landing Page (`/`)

```text
LandingPage
  ├── Space-themed animated background (CustomPainter: stars, nebula, shooting stars)
  ├── HeroSection
  │     ├── Gradient headline (ShaderMask)
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
  └── Animated gradient orbs (AnimatedBuilder with sin/cos)
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
- Email/password via `supabase_flutter`
- Magic link option
- OAuth (Google, Apple) via `supabase_flutter` social auth
- Email verification required
- Cooldown after failed attempts
- Auto-redirect to `/dashboard` on success via GoRouter redirect

### 7.3 Dashboard (`/dashboard`)

```text
DashboardPage
  ├── Profile Header
  │     ├── CircleAvatar (radius: 20, border: 2 primary)
  │     ├── Greeting ("Good morning, [Name]")
  │     ├── Gear icon → /settings
  │     └── ProfilePopover (edit profile, sign out)
  ├── DashboardStats (resume count, avg ATS score, applications)
  ├── QuickActionChips (Create, Upload, Tailor, Templates) — horizontal ListView
  ├── OnboardingCarousel (first-time users)
  ├── ResumeFilters
  │     ├── Search TextField
  │     ├── Sort dropdown
  │     ├── Category filter
  │     └── Score range filter
  ├── ResumeGroup → ResumeListCard (for each resume)
  │     ├── Template preview thumbnail
  │     ├── Title, target job, score badge
  │     ├── Last modified timestamp
  │     └── Actions (edit, duplicate, delete, share)
  ├── WhatsNextCard, DailyTipCard, FeatureDiscoveryCard
  ├── ATSScoreBreakdown + ATSScoreTrendChart (fl_chart)
  ├── FloatingActionButton (fixed, pink gradient, Plus icon)
  │     └── SpeedDial: New, Tailor, Analyze
  ├── CreateResumeDialog
  ├── AnalyzeJobSheet (showModalBottomSheet)
  └── HiredCelebrationModal (confetti animation)
```

### 7.4 Editor (`/editor`)

**The core feature — most complex screen.**

```text
EditorPage
  ├── Custom AppBar (back button with unsaved guard, title, save status)
  ├── ProgressBar (LinearProgressIndicator with gradient)
  ├── StepperNav (horizontal scrollable chips)
  │     └── Contact | Summary | Experience | Education | Skills | [Optional]
  ├── Section Content (one active section at a time)
  │     ├── ContactSection (form fields)
  │     ├── SummarySection (TextFormField + AI enhance button)
  │     ├── ExperienceSection
  │     │     ├── ExperienceTimeline (CustomPaint)
  │     │     ├── Experience cards (company, position, dates, achievements)
  │     │     ├── InlineAIButton (sparkle icon per bullet)
  │     │     ├── GapFiller + GapExplainer
  │     ├── EducationSection, SkillsSection, CertificationsSection, etc.
  ├── KeyboardToolbar (OverlayEntry above keyboard)
  ├── Undo/Redo buttons (50-step history)
  ├── Cloud sync status indicator
  │
  ├── Toolbar Actions (bottom bar / sheet triggers)
  │     ├── TemplateSelector → showModalBottomSheet
  │     ├── CustomizeSheet → colors, fonts, spacing, margins
  │     ├── ShareSheet, ExportOptionsSheet, ATSScanSheet
  │     ├── ProofreadSheet, VersionHistorySheet
  │     ├── TailorSheet, AgenticChatSheet, etc.
  │
  ├── Desktop: Row with Expanded editor + Expanded LivePreviewPanel
  └── Mobile: showBottomSheet for LivePreview
```

### 7.5 Preview (`/preview`)

```text
PreviewPage
  ├── Template rendering (CustomPaint or pdf widget rendering)
  ├── PageView for multi-page resumes
  ├── InteractiveViewer (pinch-to-zoom)
  ├── Page break indicators
  ├── Export button → ExportOptionsSheet
  └── Template switch shortcut
```

### 7.6 Upload (`/upload`)

```text
UploadPage
  ├── UploadZone (DottedBorder + GestureDetector)
  │     ├── Accepts: PDF, DOCX, DOC, images (PNG, JPG)
  │     └── File size limit indicator
  ├── FileTypeSelector (ListTile rows: PDF, Word, Image)
  ├── UploadProgressSteps (Stepper or custom animated stepper)
  ├── OCRPromptDialog (for image uploads)
  ├── ImportReviewSheet (review parsed data)
  ├── ATSScorePreview (ScoreRing + category bars)
  └── ATSValidationChecklist
```

### 7.7 AI Studio (`/ai-studio`)

```text
AIStudioPage
  ├── AIEngineBadge (Chip showing provider)
  ├── AICreditsIndicator (usage / limit text)
  ├── Tool Grid (GridView.count crossAxisCount: 2)
  │     ├── Resume Tools: Tailor, Score, Enhance, Proofread, One-Page Optimizer
  │     ├── Career Tools: Career Path, Career Assessment, Company Briefing
  │     ├── Documents: Cover Letter, Resignation Letter
  │     ├── Interview: Mock Interview, Recruiter Simulation
  │     ├── Optimization: LinkedIn Optimizer, Detect & Humanize
  │     ├── Content: Fill Gap, Explain Gap, Portfolio Bio
  │     └── Advanced: Agentic Chat
  ├── Chat input (rounded TextField with send button)
  ├── Suggestion chips (horizontal Wrap or ListView)
  └── Lazy-loaded bottom sheets for each tool
```

### 7.8 Interview (`/interview`)

```text
InterviewPage
  ├── InterviewSetup
  │     ├── Mode selection cards (Behavioral, Technical, Case Study, Mixed)
  │     ├── Job title input
  │     └── Start button
  ├── Voice Conversation UI
  │     ├── TranscriptBubble (Align left=AI, right=User)
  │     ├── Audio visualization (CustomPaint waveform)
  │     ├── Voice recording controls (start/stop/pause)
  │     ├── Timer display
  │     └── speech_to_text fallback
  ├── InterviewSummary
  │     ├── ScoreRing (CustomPaint circular)
  │     ├── Category scores (LinearProgressIndicator bars)
  │     ├── Strengths list
  │     └── Improvements list
  └── InterviewHistorySheet, CompanyBriefingSheet
```

### 7.9 Applications (`/applications`)

```text
ApplicationsPage
  ├── TabBarView (Applications / Jobs)
  ├── StatusFilter (horizontal chips with counts)
  ├── ApplicationCard (for each application)
  │     ├── Company + job title
  │     ├── Status badge (color-coded Container)
  │     ├── Applied date, deadline
  │     └── Actions (update status, notes, delete)
  ├── JobActivityStats, ActivityStreak, ActivityTimeline
  ├── AddApplicationSheet, SaveJobSheet, JobSearchSheet
```

### 7.10 Portfolio Editor (`/portfolio`)

```text
PortfolioEditorPage
  ├── Switch toggle (enable/disable)
  ├── Username input (/p/ prefix)
  ├── Theme picker (horizontal circle ListView)
  ├── Section arrangement (ReorderableListView)
  ├── Color picker, font selector
  ├── QR code card (qr_flutter)
  ├── Short link manager
  ├── VisitorsPanel (analytics with fl_chart)
  └── Preview button
```

### 7.11 Public Portfolio (`/p/:username`)

```text
PublicPortfolioPage (no AppShell, standalone)
  ├── Theme applied from portfolio settings
  ├── Profile header (CircleAvatar, name, title, social icons)
  ├── Bio section
  ├── Experience timeline
  ├── Education, Skills, Projects, Contact
  ├── "Ask AI" FloatingActionButton
  └── "Built with WiseResume" footer
```

### 7.12 Settings (`/settings`)

```text
SettingsPage
  ├── Section Chips (horizontal scrollable)
  │     ├── Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About
  ├── Account: EditProfile, ChangeEmail, DeleteAccount
  ├── Appearance: ThemeToggle (Light/Dark/System), ReducedMotion
  ├── AI & Voice: Provider selection, API key management, usage display
  ├── Editor: Default template, PDF defaults, auto-save
  ├── Notifications: Toast mode, tip frequency, quiet hours, push toggle
  ├── Privacy: Biometric lock, shake-to-report, local-only mode, analytics, data export
  ├── About: Version, DeveloperCreditCard, Privacy/Terms links, DeleteDataDialog
  └── Sign Out button (destructive)
```

### 7.13 Cover Letters

```text
CoverLettersPage → CoverLetterCard list or EmptyState
CoverLetterNewPage / CoverLetterEditPage
  ├── Job title + company inputs
  ├── Tone selector (ChoiceChip: Professional, Friendly, Enthusiastic, Formal)
  ├── Template style selector
  ├── Resume selector
  ├── AI generation button (gradient)
  ├── Rich text area
  └── Export options row
```

### 7.14 Resignation Letters

```text
ResignationLettersPage → Similar to Cover Letters
ResignationLetterNewPage / ResignationLetterEditPage
  ├── Company, position, recipient inputs
  ├── Date picker (last working day)
  ├── Notice period, reason, tone selectors
  ├── AI generation
  ├── ResignationChecklist (CheckboxListTile with progress)
  └── Export options
```

### 7.15 Career (`/career`)

```text
CareerPage
  ├── CareerQuizSheet (showModalBottomSheet, multi-step, progress dots)
  ├── CareerRoadmap (vertical timeline with CustomPaint)
  └── SkillGapAnalyzer (two-column DataTable or custom layout)
```

### 7.16 Templates (`/templates`)

```text
TemplatesPage
  ├── Category filter chips (horizontal Wrap/ListView)
  ├── ATS compatibility filter
  ├── GridView.count(crossAxisCount: 2) of template cards
  │     ├── AspectRatio(3/4) preview thumbnail
  │     ├── Template name
  │     ├── ATS badge overlay (Positioned)
  │     └── Tap → preview / select
```

### 7.17 Onboarding (`/onboarding`)

```text
OnboardingPage (full-screen overlay)
  ├── PageView with 4 steps + dot indicators (SmoothPageIndicator)
  ├── Step 1: Welcome + name entry
  ├── Step 2: Career level selection
  ├── Step 3: Primary goal
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

---

## 9. Data Models (Dart)

### Core Resume Types

```dart
@freezed
class ContactInfo with _$ContactInfo {
  const factory ContactInfo({
    required String fullName,
    required String email,
    required String phone,
    required String location,
    String? linkedin,
    String? portfolio,
    String? photoUrl,
  }) = _ContactInfo;
  factory ContactInfo.fromJson(Map<String, dynamic> json) => _$ContactInfoFromJson(json);
}

@freezed
class Experience with _$Experience {
  const factory Experience({
    required String id,
    required String company,
    required String position,
    required String startDate,
    required String endDate,
    required bool current,
    required String description,
    required List<String> achievements,
    List<String>? responsibilities,
    bool? isProject,
  }) = _Experience;
  factory Experience.fromJson(Map<String, dynamic> json) => _$ExperienceFromJson(json);
}

@freezed
class Education with _$Education {
  const factory Education({
    required String id,
    required String institution,
    required String degree,
    required String field,
    required String startDate,
    required String endDate,
    String? gpa,
  }) = _Education;
  factory Education.fromJson(Map<String, dynamic> json) => _$EducationFromJson(json);
}

@freezed
class Certification with _$Certification {
  const factory Certification({
    required String id,
    required String name,
    required String issuer,
    required String date,
    String? expiryDate,
    String? credentialId,
  }) = _Certification;
  factory Certification.fromJson(Map<String, dynamic> json) => _$CertificationFromJson(json);
}

@freezed
class Award with _$Award {
  const factory Award({
    required String id,
    required String title,
    required String issuer,
    required String date,
    String? description,
  }) = _Award;
  factory Award.fromJson(Map<String, dynamic> json) => _$AwardFromJson(json);
}

@freezed
class Project with _$Project {
  const factory Project({
    required String id,
    required String name,
    required String role,
    required String startDate,
    required String endDate,
    required List<String> technologies,
    required String description,
    String? url,
    String? githubUrl,
  }) = _Project;
  factory Project.fromJson(Map<String, dynamic> json) => _$ProjectFromJson(json);
}

@freezed
class Publication with _$Publication {
  const factory Publication({
    required String id,
    required String title,
    required String publisher,
    required String date,
    String? coAuthors,
    String? url,
  }) = _Publication;
  factory Publication.fromJson(Map<String, dynamic> json) => _$PublicationFromJson(json);
}

@freezed
class Volunteering with _$Volunteering {
  const factory Volunteering({
    required String id,
    required String organization,
    required String role,
    required String startDate,
    required String endDate,
    required String description,
    String? hours,
  }) = _Volunteering;
  factory Volunteering.fromJson(Map<String, dynamic> json) => _$VolunteeringFromJson(json);
}

@freezed
class Hobby with _$Hobby {
  const factory Hobby({
    required String id,
    required String name,
    String? description,
    required bool visible,
  }) = _Hobby;
  factory Hobby.fromJson(Map<String, dynamic> json) => _$HobbyFromJson(json);
}

@freezed
class Language with _$Language {
  const factory Language({
    required String id,
    required String name,
    required String proficiency, // 'native' | 'fluent' | 'professional' | 'basic'
  }) = _Language;
  factory Language.fromJson(Map<String, dynamic> json) => _$LanguageFromJson(json);
}

@freezed
class Reference with _$Reference {
  const factory Reference({
    required String id,
    required String name,
    required String title,
    required String company,
    required String email,
    required String phone,
    required String relationship,
    bool? availableOnRequest,
  }) = _Reference;
  factory Reference.fromJson(Map<String, dynamic> json) => _$ReferenceFromJson(json);
}

@freezed
class TemplateCustomization with _$TemplateCustomization {
  const factory TemplateCustomization({
    required String accentColor,
    required String fontHeading,
    required String fontBody,
    required String fontSize,    // 'small' | 'medium' | 'large'
    required String layout,      // 'single' | 'two-column'
    required String spacing,     // 'compact' | 'normal' | 'spacious'
    required String margins,     // 'narrow' | 'normal' | 'wide'
    required String lineHeight,  // 'single' | '1.15' | '1.5' | 'double'
    required String pageFormat,  // 'a4' | 'letter'
  }) = _TemplateCustomization;
  factory TemplateCustomization.fromJson(Map<String, dynamic> json) => _$TemplateCustomizationFromJson(json);
}

@freezed
class ResumeData with _$ResumeData {
  const factory ResumeData({
    String? id,
    required ContactInfo contactInfo,
    required String summary,
    required List<Experience> experience,
    required List<Education> education,
    required List<String> skills,
    required List<Certification> certifications,
    List<Award>? awards,
    List<Project>? projects,
    List<Publication>? publications,
    List<Volunteering>? volunteering,
    List<Hobby>? hobbies,
    List<Reference>? references,
    List<Language>? languages,
    required String templateId,
    TemplateCustomization? customization,
    String? createdAt,
    String? updatedAt,
  }) = _ResumeData;
  factory ResumeData.fromJson(Map<String, dynamic> json) => _$ResumeDataFromJson(json);
}
```

### AI Analysis Types

```dart
@freezed
class JobMatchScore with _$JobMatchScore {
  const factory JobMatchScore({
    required double overallScore,
    required double skillsMatch,
    required double experienceRelevance,
    required double keywordAlignment,
    required double atsCompatibility,
    required List<String> strengths,
    required List<String> improvements,
  }) = _JobMatchScore;
  factory JobMatchScore.fromJson(Map<String, dynamic> json) => _$JobMatchScoreFromJson(json);
}

@freezed
class GapAnalysis with _$GapAnalysis {
  const factory GapAnalysis({
    required List<String> missingKeywords,
    required List<String> missingSkills,
    required List<String> suggestedSections,
    required List<String> recommendedPhrases,
    required List<PriorityImprovement> priorityImprovements,
  }) = _GapAnalysis;
  factory GapAnalysis.fromJson(Map<String, dynamic> json) => _$GapAnalysisFromJson(json);
}

@freezed
class PriorityImprovement with _$PriorityImprovement {
  const factory PriorityImprovement({
    required String priority, // 'high' | 'medium' | 'low'
    required String suggestion,
    required String impact,
  }) = _PriorityImprovement;
  factory PriorityImprovement.fromJson(Map<String, dynamic> json) => _$PriorityImprovementFromJson(json);
}
```

### Enums & Type Aliases

```dart
enum SectionId { summary, experience, education, skills, certifications, awards, projects, publications, volunteering, hobbies, references, languages }

enum ExportType { resume, coverLetter, combined, onePage, docx, atsPdf, linkedin, plainText, shareLink, interviewPrep }

@freezed
class PDFOptions with _$PDFOptions {
  const factory PDFOptions({
    @Default(true) bool showPageNumbers,
    @Default('simple') String pageNumberFormat,
    @Default(false) bool showBranding,
  }) = _PDFOptions;
  factory PDFOptions.fromJson(Map<String, dynamic> json) => _$PDFOptionsFromJson(json);
}
```

---

## 10. Database Schema (20+ Tables)

> The database schema is **identical** to the React version — same Supabase project, same tables, same RPCs. Only the client SDK changes to `supabase_flutter`.

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
| **push_subscriptions** | `user_id`, `endpoint`, `p256dh`, `auth` | Web push (for companion web app) |
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

### Riverpod Providers (mirroring 8 Zustand stores)

| Provider | Purpose | Persistence |
|----------|---------|-------------|
| **resumeProvider** | `currentResume`, `currentResumeId`, `jobDescription`, `matchScore`, `gapAnalysis`, `selectedTemplate`, `tailorHistory` | Hive box `resume-storage` |
| **settingsProvider** | `theme`, `aiProvider`, `biometricLockEnabled`, `hasSeenSplash`, `autoProofread`, `shakeToReportEnabled`, quiet hours | SharedPreferences `wiseresume-settings` |
| **offlineSyncProvider** | `pendingChanges` queue | Hive box |
| **proofreadProvider** | Proofread session state | In-memory |
| **aiHealthProvider** | AI service health status | In-memory |
| **atsScoreHistoryProvider** | ATS score trend data | Hive box |
| **contentLibraryProvider** | Reusable content snippets | Hive box |
| **guidesProvider** | Guide read progress | SharedPreferences |

### Supabase Query Patterns (Riverpod Async)

```dart
final resumesProvider = FutureProvider.autoDispose<List<Resume>>((ref) async {
  final userId = ref.watch(authProvider).userId;
  final response = await Supabase.instance.client
    .from('resumes')
    .select()
    .eq('user_id', userId)
    .order('updated_at', ascending: false);
  return response.map((e) => Resume.fromJson(e)).toList();
});
```

Providers for: `resumesProvider`, `jobsProvider`, `jobApplicationsProvider`, `coverLettersProvider`, `resignationLettersProvider`, `profileProvider`, `notificationsProvider`, `portfolioAnalyticsProvider`, `interviewHistoryProvider`, `resumeVersionsProvider`, `resumeSharesProvider`, etc.

---

## 12. Edge Functions (39)

> **Identical** to the React version. The same Supabase Edge Functions are called — only the HTTP client changes to Dart's `http` package or `supabase_flutter` functions invoke.

### Shared Modules (`supabase/functions/_shared/`)

| Module | Purpose |
|--------|---------|
| `aiClient.ts` | 3-tier AI provider fallback: User BYOK key → `GEMINI_API_KEY` → `EMERGENT_LLM_KEY` |
| `authMiddleware.ts` | JWT validation for authenticated endpoints |
| `cors.ts` | CORS headers for cross-origin requests |
| `rateLimiter.ts` | Rate limiting per user |

### AI-Powered Functions (21)

| Function | Purpose |
|----------|---------|
| `analyze-resume` | Job match scoring + gap analysis |
| `tailor-resume` | AI resume tailoring for specific jobs |
| `enhance-section` | AI rewrite of individual sections |
| `score-resume` | ATS compatibility scoring |
| `proofread-resume` | Grammar/style checking |
| `generate-cover-letter` | Cover letter generation |
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

### Calling Edge Functions from Flutter

```dart
final response = await Supabase.instance.client.functions.invoke(
  'analyze-resume',
  body: {'resumeData': resume.toJson(), 'jobDescription': jobDesc},
);
final result = response.data as Map<String, dynamic>;
```

---

## 13. Services & Repositories Reference

### Services (singleton, injected via Riverpod)

| Service | Purpose |
|---------|---------|
| `AuthService` | Wraps `supabase_flutter` auth (signIn, signUp, signOut, onAuthStateChange) |
| `ResumeRepository` | CRUD for resumes table |
| `ProfileRepository` | CRUD for profiles table |
| `JobRepository` | CRUD for jobs + job_applications tables |
| `CoverLetterRepository` | CRUD for cover_letters table |
| `ResignationLetterRepository` | CRUD for resignation_letters table |
| `InterviewRepository` | CRUD for interview_sessions table |
| `AIService` | Invoke AI edge functions, manage credits |
| `ExportService` | PDF/DOCX generation using `pdf` + `printing` packages |
| `UploadService` | File picking, parsing, OCR |
| `BiometricService` | `local_auth` wrapper |
| `NotificationService` | In-app + push notification management |
| `PortfolioService` | Portfolio RPCs + analytics |
| `ShareService` | Resume share link management |
| `OfflineSyncService` | Queue + flush mutations |
| `StorageService` | Supabase Storage for avatars, uploads |

### Platform Services

| Service | Purpose |
|---------|---------|
| `BackButtonService` | Android back button handling via `PopScope` / `WillPopScope` |
| `DeepLinkService` | `uni_links` handler → GoRouter navigation |
| `ShakeDetectService` | `shake` package → bug report dialog |
| `StatusBarService` | `SystemChrome.setSystemUIOverlayStyle()` for theme sync |
| `HapticService` | `HapticFeedback.selectionClick()`, `.mediumImpact()` |
| `ConnectivityService` | `connectivity_plus` stream for online/offline |

---

## 14. Navigation Flow

### Back Routes Map

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
/cover-letter/new  → /cover-letters
/cover-letter/edit → /cover-letters
/cover-letters     → /ai-studio
/resignation-letter/new  → /resignation-letters
/resignation-letter/edit → /resignation-letters
/resignation-letters     → /ai-studio
/examples          → /dashboard
/guides            → /dashboard
/guide             → /guides
/ai-studio         → /dashboard
```

### Exit Routes

Routes where Android back button exits the app:
```
/ (landing page)
/dashboard
```

Implemented via `PopScope(canPop: true)` on these routes, `canPop: false` + custom handling on others.

### Navigation Rules

1. **Editor exit**: Always passes through unsaved changes guard → shows `AlertDialog` if dirty
2. **AI sub-features** (Interview, Career, Cover Letters, Resignation Letters) → back to `/ai-studio`
3. **Job-related pages** (Job Detail, Application) → back to `/applications`
4. **BottomTabBar Editor tab**: Guarded — auto-loads latest resume or redirects to `/dashboard?action=create`
5. **Swipe-back gesture**: Enabled on all tab routes except editor and exit routes (use `CupertinoPageRoute` for iOS-style swipe)
6. **Dynamic routes** (e.g., `/resume/abc123`): Matched by prefix, backs to the base route

---

## 15. Native Features

| Feature | Package | Usage |
|---------|---------|-------|
| **Biometric Lock** | `local_auth` | Fingerprint/Face ID lock with configurable timeout (0s, 30s, 60s, 5min) |
| **Haptic Feedback** | `HapticFeedback` (Flutter) | Selection feedback on tab press, button interactions |
| **Status Bar** | `SystemChrome` | Theme-aware color sync (dark/light) |
| **Splash Screen** | `flutter_native_splash` | Native splash, hidden after auth resolves |
| **Deep Linking** | `uni_links` + GoRouter | Handle `wiseresume://` URLs, resume/portfolio links |
| **In-App Browser** | `url_launcher` / `flutter_inappwebview` | Open external links |
| **Back Button** | `PopScope` / `WillPopScope` | Android hardware back with back routes mapping |
| **Shake Detect** | `shake` package | Shake-to-report bug (toggleable in settings) |
| **Camera/Gallery** | `image_picker` | Profile photo, resume image upload |
| **File Picker** | `file_picker` | PDF/DOCX file selection for upload |
| **Share** | `share_plus` | Native share sheet for resume links, exports |
| **Path Provider** | `path_provider` | Local file storage for exports |

### Native Optimizations
- `BackdropFilter` used cautiously — disable on low-end devices via `Platform.isAndroid` check
- Use `RepaintBoundary` around expensive widgets
- `AutomaticKeepAliveClientMixin` on tab pages to preserve state
- `const` constructors everywhere possible
- Image caching via `cached_network_image`

---

## 16. Offline & Local Storage

| Feature | Implementation |
|---------|----------------|
| **Local DB** | Hive / Isar for structured offline data |
| **Offline Banner** | `StreamBuilder` on `connectivity_plus` stream → show `MaterialBanner` |
| **Slow Connection** | Connection quality detection → warning banner |
| **Sync Queue** | `offlineSyncProvider` queues mutations in Hive, flushes on reconnect |
| **Network Detection** | `connectivity_plus` (online/offline), custom quality detection |
| **Local Persistence** | All Riverpod state persisted to Hive boxes / SharedPreferences |
| **Background Save** | `WidgetsBindingObserver.didChangeAppLifecycleState` → save draft on pause/inactive |

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
| **Session Protection** | Active user ID tracked to prevent session hijacking |
| **Expired Session Detection** | `onAuthStateChange` stream detects sign-out → re-auth flow |
| **Share Passwords** | Hashed via `hash_share_password` RPC, verified via `verify_share_password` |
| **Biometric Lock** | `local_auth` with configurable auto-lock timeout |
| **Security Curtain** | `WidgetsBindingObserver` → blur screen in app switcher via `SecureApplication` or custom overlay |
| **Secure Storage** | `flutter_secure_storage` for sensitive tokens/keys on device |

---

## 18. Visual Screen Mockups

> This section provides ASCII wireframes and detailed visual descriptions for every major screen so a receiving agent can match the exact layout, spacing, color, and widget placement.

### 18.1 Visual Patterns Reference

These reusable visual building blocks appear across multiple screens. Implement as custom Flutter widgets:

| Pattern | Flutter Implementation |
|---|---|
| **Glass surface** | `ClipRRect` + `BackdropFilter(sigmaX: 20)` + `Container(color: card.withOpacity(0.7), border: Border.all(color: border.withOpacity(0.3)))` — skip blur on low-end Android |
| **Gradient primary button** | `Container(decoration: BoxDecoration(gradient: kGradientPrimary, borderRadius: 16, boxShadow: [glowShadow]))` height 56, `InkWell` child |
| **Card** | `Container(decoration: BoxDecoration(borderRadius: 16, border: Border.all(color: border), color: card.withOpacity(0.6)), padding: 16)` + optional `BackdropFilter` |
| **Score ring** | `CustomPainter` with `drawArc`, color by score: `>=80` → success, `>=50` → warning, `<50` → destructive |
| **Bottom sheet** | `showModalBottomSheet(shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))))`, grab handle = `Container(w:32, h:4, borderRadius:2, color:muted)` |
| **Empty state** | Column: 64px gradient circle icon, bold heading, muted description `TextAlign.center maxWidth: 260`, gradient CTA button |
| **BottomTabBar pill** | `AnimatedPositioned` or `Hero` with spring curve behind active tab, `Container(color: primary.withOpacity(0.05), border: Border.all(color: primary.withOpacity(0.1)), borderRadius: 16)` |
| **Section header** | `Row`: `Container(w:4, h:20, borderRadius:99, color:primary)` + Icon + Text label |
| **Settings row** | `InkWell` full-width `padding: EdgeInsets.symmetric(vertical: 14, horizontal: 16)`, `minHeight: 56`, icon in `Container(w:32, h:32, borderRadius:8)`, label + description, trailing = `Icon(Icons.chevron_right)` or `Switch` |

---

### 18.2 Landing Page

```text
┌─────────────────────────────────┐
│ ▓ SpaceBackground (CustomPaint) │
│   gradient nebula orbs + stars  │
├─────────────────────────────────┤
│ [Logo 28px]  WiseResume   [Sign In] │  ← SliverAppBar glass, pinned
├─────────────────────────────────┤
│                                 │
│      ┌──────────────┐           │
│      │  Logo 120×120 │          │  ← glowPulse animation, red shadow
│      └──────────────┘           │
│   "Build Your Perfect Resume"   │  ← displayLarge, Space Grotesk
│   subtitle with **bold** words  │  ← bodyMedium, muted color
│                                 │
│  ┌─────────────────────────┐    │
│  │  Get Started Free →     │    │  ← gradient button h-56 borderRadius-16
│  └─────────────────────────┘    │
│                                 │
│  ✓ Free  ✓ No card  ✓ ATS      │  ← trust bar, labelSmall, Check icons
├─────────────────────────────────┤
│  ~~Other tools~~  │  **Us**     │  ← comparison strip
│  ~~Generic~~      │  **AI-Pow** │     left=TextDecoration.lineThrough
│  ~~No ATS~~       │  **98%**    │     right=FontWeight.bold primary
├─────────────────────────────────┤
│  How It Works (3 steps)         │
│  ①──────── ②──────── ③────────  │  ← pink circle number icons
├─────────────────────────────────┤
│  Feature cards (GridView)       │
│  ┌────┐ ┌────┐ ┌────┐          │  ← Card pattern widgets
│  └────┘ └────┘ └────┘          │
├─────────────────────────────────┤
│  PortfolioDemo (phone frame)    │  ← AspectRatio(9/16), border 8, borderRadius 20
│  EditorDemo (interactive)       │
├─────────────────────────────────┤
│  Footer: logo + nav links      │
│  © 2025 WiseUniverse            │
└─────────────────────────────────┘
```

---

### 18.3 Auth Page

```text
┌─────────────────────────────────┐
│ ← (back)                       │  ← AppBar leading, SafeArea
│                                 │
│         ┌────────┐              │
│         │AppIcon │              │  ← 48×48, purple shadow
│         │ 48×48  │              │
│         └────────┘              │
│      "Welcome Back"             │  ← displayMedium
│   "Sign in to continue"        │  ← bodyMedium, muted
│                                 │
│  ┌─ 📧 ─────────────────────┐  │  ← TextFormField with prefixIcon: Icon(Icons.mail)
│  │  Email                    │  │
│  └───────────────────────────┘  │
│  ┌─ 🔒 ──────────────── 👁 ─┐  │  ← prefixIcon: Lock, suffixIcon: eye toggle
│  │  Password                 │  │
│  └───────────────────────────┘  │
│                                 │
│  "Sign in with email link"      │  ← TextButton, primary color
│  "Forgot password?"             │  ← TextButton, muted
│                                 │
│  ┌─────────────────────────┐    │
│  │      Sign In             │   │  ← gradient button h-56
│  └─────────────────────────┘    │
│                                 │
│  ─────────── or ────────────    │  ← Row: Divider, "or", Divider
│                                 │
│  ┌─────────────────────────┐    │
│  │ G  Continue with Google  │   │  ← OutlinedButton, Google icon
│  └─────────────────────────┘    │
│                                 │
│  "Don't have an account?"       │
│  "Sign up" ← primary TextButton │
└─────────────────────────────────┘
```

---

### 18.4 Dashboard

```text
┌─────────────────────────────────┐
│ 🏠 WiseResume          ⚙       │  ← GlassHeader, gear → /settings
├─────────────────────────────────┤
│ (●) Good morning, Name    ⚙    │  ← CircleAvatar r:20 border:2 primary
│     Software Engineer           │
├─────────────────────────────────┤
│ ┌─ DashboardStats ────────────┐ │
│ │ gradient-border card         │ │  ← Container with gradient BoxDecoration
│ │ 🔥 3-day streak    📝 5 CVs │ │
│ │ 💡 "Tip: quantify impact"   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [+ Create] [📄 Upload] [🎯 T] │  ← horizontal ListView, Chip widgets
│ [📋 Templates]                  │     rounded-full, motion fade-in
├─────────────────────────────────┤
│ ┌─ My CVs ─┬─ Tailored ──────┐ │  ← TabBar + TabBarView
│ ├───────────┴──────────────────┤ │
│ │ 🔍 Search...    [Sort ▼]    │ │  ← TextField + DropdownButton
│ ├──────────────────────────────┤ │
│ │ ┌────────────────────────┐   │ │
│ │ │ [thumb] Title      [92]│   │ │  ← ResumeListCard borderRadius:16
│ │ │         Target Job     │   │ │     ScoreRing widget right
│ │ │         2 days ago     │   │ │
│ │ └────────────────────────┘   │ │
│ └──────────────────────────────┘ │
│                            (+)   │  ← FloatingActionButton
│                          pink    │     gradient, Plus icon
│                          FAB     │     Positioned bottom:80 right:16
├─────────────────────────────────┤
│ Home  Editor  AI  Activity Port │  ← BottomTabBar
│  ●                              │     animated pill under Home
└─────────────────────────────────┘
```

---

### 18.5 Editor

```text
┌─────────────────────────────────┐
│ ← Title (overflow: ellipsis) ☁↶↷│  ← custom AppBar
├─────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 65%      │  ← LinearProgressIndicator gradient
├─────────────────────────────────┤
│ [Contact] [Summary] [Exp] →    │  ← horizontal ListView of ChoiceChip
│  ●active                        │     selected = primary bg
├─────────────────────────────────┤
│ ┌─ SectionCard ───────────────┐ │
│ │ Section Title          ✨   │ │  ← IconButton sparkle top-right
│ │  Form fields for active     │ │  ← Container borderRadius:16 border
│ │  section...                  │ │
│ └──────────────────────────────┘ │
├─────────────────────────────────┤
│ 📋 🎨 🔗 📤 🔍 ✅ 📜 📚 ✨  │  ← horizontal ListView of Column(icon, label)
│ Template Customize Share Export │
└─────────────────────────────────┘

Desktop/Tablet (≥1024):
┌──────────────────┬──────────────┐
│  Editor panel    │ LivePreview  │  ← Row with Expanded children
│  (as above)      │ panel        │     VerticalDivider in center
│                  │ (template    │
│                  │  rendering)  │
└──────────────────┴──────────────┘
```

---

### 18.6 Preview

```text
┌─────────────────────────────────┐
│ ← Preview          [🔍+] [🔍-]│  ← AppBar with zoom IconButtons
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │   Full-bleed template   │    │  ← InteractiveViewer (pinch zoom)
│  │   rendering             │    │     pdf widget or CustomPaint
│  └─────────────────────────┘    │
│         ‹  1/2  ›               │  ← Row: IconButton, Text, IconButton
├─────────────────────────────────┤
│  [📤 Export PDF]                │  ← gradient button
└─────────────────────────────────┘
```

---

### 18.7 Upload

```text
┌─────────────────────────────────┐
│ ← Upload Resume                │
├─────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  ╎       📄 (icon 48px)     ╎  │  ← DottedBorder + GestureDetector
│  ╎  "Drag & drop or tap     ╎  │     minHeight: 280
│  ╎   to upload your resume" ╎  │     border: primary.withOpacity(0.3)
│  ╎  Supports PDF, DOCX, IMG ╎  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ 🔴 PDF   "Upload PDF"   │    │  ← ListTile, leading: CircleAvatar
│ │ 🔵 DOCX  "Upload Word"  │    │
│ │ 🟢 IMG   "Scan Image"   │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│  ① Upload  ──→  ② Parse  ──→  ③ Review │  ← custom Stepper
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ (92%) │ Format    ▓▓▓▓░  │    │  ← ScoreRing + LinearProgressIndicator
│ │       │ Content   ▓▓▓░░  │    │
│ │       │ Keywords  ▓▓░░░  │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

---

### 18.8 AI Studio

```text
┌─────────────────────────────────┐
│ ← AI Studio                    │
│    [GPT-4o ▾]  [12/50 credits] │  ← Chip + Text widgets
├─────────────────────────────────┤
│ ┌─ Resume Context ────────────┐ │
│ │ 📄 "Software Engineer CV"   │ │  ← GlassSurface container
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌─ Wise AI Chat ──────────────┐ │
│ │ (●) Wise AI                  │ │  ← CircleAvatar gradient, Sparkles
│ │     "How can I help?"        │ │
│ │ [Improve summary] [Fix gaps] │ │  ← Wrap of ActionChip
│ └──────────────────────────────┘ │
├─────────────────────────────────┤
│ ✍️ Writing Tools                │  ← Text, section header
│ ┌──────────┐ ┌──────────┐      │
│ │ (🎯)     │ │ (✨)     │      │  ← GridView.count(crossAxisCount: 2)
│ │ Tailor   │ │ Enhance  │      │     Card with icon CircleAvatar
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ [💬 Ask Wise AI...         🔄] │  ← TextField, bottom, rounded-16
└─────────────────────────────────┘
```

---

### 18.9 Interview

```text
Setup Phase:
┌─────────────────────────────────┐
│ ← Interview Prep               │
│ ┌──────────────────────────┐    │
│ │ 🧠 Behavioral            │    │  ← InkWell Card borderRadius:16
│ │ "STAR method questions"   │    │
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ 💻 Technical              │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘

Active Phase:
┌─────────────────────────────────┐
│ ← Interview    ⏱ 03:24         │
│  ┌─────────────────────┐        │
│  │ AI: "Tell me..."    │        │  ← Align.centerLeft, muted bg, borderRadius:16
│  └─────────────────────┘        │
│        ┌─────────────────────┐  │
│        │ You: "In my last..." │  │  ← Align.centerRight, primary bg
│        └─────────────────────┘  │
│     ▁▂▃▅▃▂▁▂▃▅▇▅▃▂▁           │  ← CustomPaint waveform
│           [🎤]    [⏹]          │  ← FAB mic (56), stop button (48)
└─────────────────────────────────┘

Summary Phase:
┌─────────────────────────────────┐
│       ┌────────┐                │
│       │  78%   │                │  ← ScoreRing CustomPainter 80px
│       └────────┘                │
│ Communication  ▓▓▓▓▓▓▓░░░ 72%  │  ← LinearProgressIndicator
│ Technical      ▓▓▓▓▓▓▓▓░░ 85%  │
│ ✅ Strengths: • Clear comm      │
│ 📈 Improvements: • More metrics │
└─────────────────────────────────┘
```

---

### 18.10 Applications

```text
┌─────────────────────────────────┐
│ ← Applications                 │
│ [Applications] [Jobs]           │  ← TabBar
│ [All 12] [Applied 5] [Int 3]→  │  ← horizontal ListView of FilterChip
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ **Google**          🟢   │    │  ← Card borderRadius:16
│ │ Software Engineer        │    │     status = Container with color
│ │ Applied · Jan 15         │    │     green=success, blue=primary
│ └──────────────────────────┘    │     red=error
├─────────────────────────────────┤
│ ┌─ Stats ─────────────────────┐ │
│ │ 12 total │ 3 this week │ 8% │ │
│ └─────────────────────────────┘ │
│ 🔥 3-day streak                │
│ ● Applied to Google             │  ← vertical timeline CustomPaint
│ ● Interview at Meta             │
└─────────────────────────────────┘
```

---

### 18.11 Portfolio Editor

```text
┌─────────────────────────────────┐
│ ← Portfolio                    │
│ Enable Portfolio  [━━━●]        │  ← Switch widget
│ Username: /p/ [__________]      │  ← TextFormField with prefix
│ Theme: ● ● ● ● ● ● ●  →       │  ← horizontal ListView CircleAvatar
│ Sections:                       │
│ ☰ About          [✓]           │  ← ReorderableListView + Checkbox
│ ☰ Experience     [✓]           │
│ ┌─ QR Code ──────────────────┐  │
│ │  [████████]  Share link    │  │  ← qr_flutter QrImageView
│ └────────────────────────────┘  │
│ 👁 142 views  👤 89 visitors   │  ← stat Row
└─────────────────────────────────┘
```

---

### 18.12 Public Portfolio

```text
┌─────────────────────────────────┐
│ (standalone, no AppShell)       │
│         ┌────────┐              │
│         │ Avatar │              │  ← CircleAvatar r:48 border:4 accent
│         └────────┘              │
│      "John Doe"                 │  ← displayMedium
│   "Software Engineer"           │
│   [🔗] [💼] [🐙] [🐦]         │  ← Row of IconButton
├─────────────────────────────────┤
│ ▌ About                        │  ← Container(border: Border(left: BorderSide(width:2, color:accent)))
│ │ Bio text...                  │
│ ▌ Experience                   │
│ │ Company — Role — Dates       │
├─────────────────────────────────┤
│                       [✨ Ask] │  ← FloatingActionButton gradient
│ Built with WiseResume           │  ← footer, labelSmall, muted
└─────────────────────────────────┘
```

---

### 18.13 Settings

```text
┌─────────────────────────────────┐
│ ← Settings                     │
│ [👤 Account] [🎨 Look] [🤖 AI]│  ← horizontal ListView of ChoiceChip
│ [✏️ Editor] [🔔 Notif] [🔒] → │
├─────────────────────────────────┤
│ ┌──────────────────────────┐    │
│ │ (●)  John Doe            │    │  ← CircleAvatar r:32
│ │      john@email.com      │    │     profile completion indicator
│ │      [72% complete]      │    │
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ ▌🔐 Account                    │  ← Section header widget
│ │ 👤 Edit Profile      ›  │    │  ← SettingsRow InkWell
│ │ ✉️ Change Email       ›  │    │
│ │ 🔐 Biometric Lock   [━] │    │  ← trailing: Switch
├─────────────────────────────────┤
│ ▌🎨 Appearance                 │
│ │ 🌙 Theme          Dark › │    │
├─────────────────────────────────┤
│ 🚪 Sign Out                    │  ← SettingsRow destructive: red text
├─────────────────────────────────┤
│ ┌─ DeveloperCreditCard ───────┐ │
│ │ animated gradient card       │ │  ← AnimatedContainer + ShaderMask
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### 18.14 Cover Letters

```text
┌─────────────────────────────────┐
│ ← Cover Letters                │
│ ┌──────────────────────────┐    │
│ │ "Software Eng @ Google"  │    │  ← Card borderRadius:16
│ │ Google · Professional    │    │
│ │ "Dear Hiring Manager..." │    │     snippet, overflow: ellipsis
│ │ Jan 15, 2025       [⋯]  │    │     PopupMenuButton
│ └──────────────────────────┘    │
│         OR (empty state):       │
│         ┌────────┐              │
│         │ 📝     │              │  ← EmptyState widget
│         └────────┘              │
│   "No cover letters yet"       │
│  [✨ Create Cover Letter]      │  ← gradient button
├─────────────────────────────────┤
│ Create/Edit Form:               │
│ Tone: [Professional] [Friendly] │  ← Wrap of ChoiceChip
│ [✨ Generate with AI]           │
│ ┌──────────────────────────┐    │
│ │ Generated letter content │    │  ← TextFormField maxLines: null
│ └──────────────────────────┘    │
│ [📄 PDF] [📋 Copy] [📤 Share] │  ← Row of IconButton/TextButton
└─────────────────────────────────┘
```

---

### 18.15 Resignation Letters

```text
┌─────────────────────────────────┐
│ ← Resignation Letters          │
│ (Similar card list)             │
├─────────────────────────────────┤
│ ResignationChecklist:           │
│ ┌──────────────────────────┐    │
│ │ Progress: ▓▓▓▓▓░░░ 60%  │    │  ← LinearProgressIndicator gradient
│ │ ☑ Review contract        │    │  ← CheckboxListTile, completed = lineThrough
│ │ ☑ Set last working day   │    │
│ │ ☐ Prepare handover docs  │    │
│ │ ☐ Schedule exit meeting  │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

---

### 18.16 Career

```text
┌─────────────────────────────────┐
│ ← Career Tools                 │
│ CareerQuizSheet:                │
│ ┌──────────────────────────┐    │
│ │ ─── (grab handle)        │    │  ← showModalBottomSheet
│ │ Step 2 of 5   ● ● ○ ○ ○ │    │     SmoothPageIndicator
│ │ "What's your experience  │    │
│ │  level?"                 │    │
│ │ ○ Entry Level            │    │  ← RadioListTile
│ │ ● Mid-Level              │    │     selected = primary ring
│ │ [Next →]                 │    │  ← gradient button
│ └──────────────────────────┘    │
├─────────────────────────────────┤
│ CareerRoadmap:                  │
│ │ ● Current: Jr Developer  │    │  ← CustomPaint vertical timeline
│ │ ◎ Next: Mid Developer    │    │
│ │ ○ Sr Developer           │    │
│ │ ○ Tech Lead              │    │
├─────────────────────────────────┤
│ SkillGapAnalyzer:               │
│ │ Your Skills│ Required    │    │  ← DataTable or custom Row layout
│ │ ✅ React   │ ✅ React    │    │     ✅=match, ⚠️=partial, ❌=missing
│ │ ❌ —       │ ✅ AWS      │    │
└─────────────────────────────────┘
```

---

### 18.17 Templates

```text
┌─────────────────────────────────┐
│ ← Templates                    │
│ [All] [Professional] [Creative]│  ← horizontal Wrap/ListView of FilterChip
│ [Academic] [Technical] →       │
├─────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐    │
│ │ ┌───────┐ │ │ ┌───────┐ │    │  ← GridView.count(crossAxisCount: 2)
│ │ │preview│ │ │ │preview│ │    │     AspectRatio(3/4) ClipRRect
│ │ └───────┘ │ │ └───────┘ │    │
│ │ Modern    │ │ Classic   │    │  ← Text below
│ │ [ATS ✓]   │ │ [ATS ✓]   │    │  ← Positioned badge
│ └───────────┘ └───────────┘    │
└─────────────────────────────────┘
```

---

### 18.18 Onboarding

```text
┌─────────────────────────────────┐
│ (full-screen, no AppBar)        │
│      ┌──────────────┐           │
│      │  Illustration │          │  ← centered per step
│      └──────────────┘           │
│   "Welcome to WiseResume"       │  ← displayMedium
│   "Build professional           │  ← bodyMedium, muted, center
│    resumes with AI"             │     maxWidth: 280
│   [Get Started]                 │  ← gradient button
│      ● ● ○ ○                    │  ← SmoothPageIndicator
│                                 │
│ Final step (step 4):            │
│ "Choose a Template"             │
│ ┌──────┐ ┌──────┐ ┌──────┐     │  ← GridView(crossAxisCount: 3)
│ │Modern│ │Clean │ │Prof. │     │     selected = Border.all(primary, 2)
│ └──────┘ └──────┘ └──────┘     │
│ [Start Building →]              │  ← final CTA, navigates to /editor
└─────────────────────────────────┘
```

---

## Component Directory Structure

```
lib/
  ├── core/
  │     ├── theme/          # ThemeData, ColorScheme, WiseResumeTheme extension
  │     ├── router/         # GoRouter config, guards, redirects
  │     ├── constants/      # Template IDs, page titles, back routes
  │     ├── utils/          # Formatters, validators, helpers
  │     └── services/       # Supabase client, AI client, auth, storage
  ├── features/
  │     ├── ai_studio/      # AI tools grid, chat, credits widgets
  │     ├── applications/   # Job application tracking widgets
  │     ├── auth/           # Login, signup, email verify widgets
  │     ├── career/         # Career assessment, roadmap widgets
  │     ├── cover_letters/  # Cover letter editor widgets
  │     ├── dashboard/      # Dashboard cards, stats, filters, FAB
  │     ├── editor/         # Resume editor sections, toolbar, sheets
  │     ├── interview/      # Interview setup, voice UI, summary
  │     ├── landing/        # Landing page hero, features, footer
  │     ├── onboarding/     # Onboarding wizard steps
  │     ├── portfolio/      # Portfolio editor, public view, QR
  │     ├── preview/        # Resume preview rendering
  │     ├── resignation_letters/ # Resignation letter widgets
  │     ├── settings/       # Settings sections, profile editor
  │     ├── templates/      # Template gallery, previews
  │     └── upload/         # Upload zone, progress, OCR, review
  ├── shared/
  │     ├── widgets/        # GlassSurface, ScoreRing, EmptyState, GradientButton,
  │     │                   # BottomTabBar, GlassHeader, SectionHeader, SettingsRow,
  │     │                   # AnimatedSplash, BiometricLockScreen, ErrorWidget
  │     ├── models/         # Shared freezed data models
  │     └── providers/      # Shared Riverpod providers
  └── gen/                  # Generated code (freezed, json_serializable)
```

---

*This blueprint is generated from the WiseResume codebase and adapted for Flutter/Dart. It represents the complete application architecture to be implemented as a native mobile app.*
