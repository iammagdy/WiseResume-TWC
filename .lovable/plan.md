

# Create Flutter App Rebuild Prompts File

## Overview
Create a new file `docs/REBUILD_PROMPTS_FLUTTER.md` containing a complete, ordered set of 55+ prompts that an AI tool (like Cursor, Windsurf, or similar) can follow step-by-step to build the entire WiseResume app as a native Flutter application from scratch. The file will also include Google Stitch prompts for generating screen designs.

## What the File Will Contain

### Structure
1. **Master System Prompt** -- A meta-instruction block telling the receiving AI how to behave: track progress ("Prompt 12/55"), ask clarifying questions, suggest improvements, and show remaining work. Adapted for Flutter/Dart context.
2. **Google Stitch Prompts (Part A)** -- Same 12 design prompts from the web version (screen designs are platform-agnostic).
3. **Flutter App Build Prompts (Part B)** -- 55 sequential prompts ordered by dependency, adapted for Flutter 3.x + Dart, Riverpod, GoRouter, freezed, supabase_flutter, and native packages.

### Key Differences from Web Version
The Flutter prompts differ from the web prompts in these critical areas:

| Aspect | Web (React) | Flutter |
|--------|-------------|---------|
| Framework | React 18 + Vite | Flutter 3.x + Dart |
| UI Components | shadcn/ui (Radix) | Material 3 + custom widgets |
| State | Zustand + React Query | Riverpod + FutureProvider |
| Routing | React Router v6 | GoRouter with ShellRoute |
| Animations | Framer Motion | Implicit/explicit Flutter animations |
| Styling | Tailwind CSS + HSL vars | ThemeData + ThemeExtension |
| Data Models | TypeScript interfaces | freezed + json_serializable |
| Local Storage | localStorage + Zustand persist | Hive + SharedPreferences |
| PDF Generation | pdf-lib + html2canvas | pdf + printing packages |
| PDF Parsing | pdfjs-dist | syncfusion_flutter_pdf / pdfx |
| OCR | tesseract.js | google_mlkit_text_recognition |
| Voice | Web Speech API | speech_to_text package |
| Charts | recharts | fl_chart |
| QR Codes | qr-code-styling | qr_flutter |
| Forms | react-hook-form | flutter_form_builder |
| Markdown | react-markdown | flutter_markdown |
| Native Features | Capacitor plugins | Flutter native (local_auth, share_plus, etc.) |
| Back Button | Custom hook | PopScope / WillPopScope |
| Glass Effects | CSS backdrop-filter | ClipRRect + BackdropFilter (skip on low-end Android) |

### Prompt Ordering Strategy (Part B -- 55 Prompts)

```text
Phase 1: Foundation (Prompts 1-6)
  - Flutter project setup, pubspec.yaml, folder structure
  - Design system (ThemeData, ColorScheme, WiseResumeTheme extension, fonts)
  - Supabase initialization (supabase_flutter)
  - Auth system (email/password, OAuth, magic link via supabase_flutter)
  - Data models (all freezed classes + code generation)
  - Riverpod providers + Hive/SharedPreferences persistence
  - GoRouter config + AppShell + BottomTabBar

Phase 2: Core Screens (Prompts 7-17)
  - Landing page with CustomPainter space theme
  - Dashboard with stats, resume list, FAB
  - Resume Editor (13 sections, stepper, toolbar)
  - Editor sheets (template selector, customize, share, export, etc.)
  - Preview page with InteractiveViewer + PageView
  - Upload page (file_picker, PDF/DOCX/OCR parsing)
  - Templates gallery (30 templates, GridView)
  - Template rendering (30 CustomPaint/Widget templates)
  - Onboarding wizard (PageView + SmoothPageIndicator)
  - Profile editor
  - Settings page (all sections)

Phase 3: AI Features (Prompts 18-27)
  - AI service layer (supabase_flutter functions.invoke)
  - AI Studio page (tool grid)
  - Resume analysis + scoring
  - Resume tailoring + diff UI
  - Section enhancement + proofreading
  - Cover letter generation + CRUD pages
  - Resignation letter generation + CRUD pages
  - Mock interview (speech_to_text + ElevenLabs)
  - Career path + quiz
  - Agentic chat + gap tools

Phase 4: Job Tracking (Prompts 28-31)
  - Applications page + filters
  - Application detail + job detail pages
  - Job parsing edge functions (shared with web)
  - Notifications page + in-app notifications

Phase 5: Portfolio (Prompts 32-36)
  - Portfolio editor page
  - Public portfolio page (standalone, no AppShell)
  - QR codes (qr_flutter) + short links
  - Portfolio analytics (fl_chart)
  - Ask AI widget

Phase 6: Sharing and Documents (Prompts 37-40)
  - Resume sharing (password, expiry, viewer page)
  - Share comments
  - Resume versions
  - PDF export (pdf + printing) + DOCX export

Phase 7: Advanced Features (Prompts 41-47)
  - Help and FAQ page
  - Analytics / Insights page (fl_chart)
  - Subscription / Pricing page
  - Referral page (qr_flutter + share_plus)
  - Achievements / Badges page
  - Guides and Examples pages
  - Command palette (custom search overlay) + bug report (shake package)

Phase 8: Native Platform (Prompts 48-51)
  - Biometric lock (local_auth)
  - Deep linking (uni_links + GoRouter)
  - Offline support (connectivity_plus + Hive sync queue)
  - Push notifications (firebase_messaging or custom)

Phase 9: Polish and Launch (Prompts 52-55)
  - Stripe / in-app purchase integration
  - AI credit enforcement
  - Platform-specific optimizations (Android + iOS)
  - Final QA checklist (responsive, dark/light, accessibility, performance)
```

### Each Prompt Will Include
- Clear prompt number and title (e.g., "PROMPT 7/55 -- Dashboard Page")
- Flutter-specific instructions (widgets, packages, patterns)
- Reference to APP_BLUEPRINT_FLUTTER.md for design specs and widget trees
- Database tables/RPCs needed (same Supabase backend as web)
- Riverpod providers to create
- freezed models needed (if any)
- Reminder for the AI to report progress and ask questions

### Google Stitch Section
Identical 12 prompts from the web version (screen designs are visual references, platform-agnostic).

## Technical Details
- **File**: `docs/REBUILD_PROMPTS_FLUTTER.md`
- **Estimated size**: ~3,500-4,500 lines
- **No other files modified**
- **All prompts reference `docs/APP_BLUEPRINT_FLUTTER.md` as the source of truth**
- Same Supabase backend (database, edge functions, RPCs) -- only the client SDK changes
- Master prompt includes Flutter-specific rules (const constructors, RepaintBoundary, AutomaticKeepAliveClientMixin, etc.)
- Each prompt is self-contained enough to execute independently but follows the dependency order

