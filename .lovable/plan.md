

# Add pubspec.yaml Reference & Screens List to Flutter Blueprint

## Overview
Add two new sections to `docs/APP_BLUEPRINT_FLUTTER.md`:
1. **Section 19: pubspec.yaml Reference** -- A complete, copy-paste-ready `pubspec.yaml` with all required dependencies, version-pinned, organized by category.
2. **Section 20: Complete Screen Registry** -- A flat table listing every screen/page widget, its route, and its feature module location.

## Changes

### 1. Update Table of Contents (line 9-28)
Add entries 19 and 20:
```
19. [pubspec.yaml Reference](#19-pubspecyaml-reference)
20. [Complete Screen Registry](#20-complete-screen-registry)
```

### 2. Append Section 19: pubspec.yaml Reference (after line 1907)

A full `pubspec.yaml` code block with all dependencies organized into categories:

**Core Flutter**
- `flutter` SDK
- `flutter_localizations` SDK
- `cupertino_icons: ^1.0.8`

**State Management & DI**
- `flutter_riverpod: ^2.6.1`
- `riverpod_annotation: ^2.6.1`

**Routing**
- `go_router: ^14.8.1`

**Backend (Supabase)**
- `supabase_flutter: ^2.10.0`

**Code Generation (Freezed + JSON)**
- `freezed_annotation: ^2.4.4`
- `json_annotation: ^4.9.0`
- (dev) `freezed: ^2.5.8`, `json_serializable: ^6.9.4`, `build_runner: ^2.4.14`, `riverpod_generator: ^2.6.3`

**Local Storage**
- `hive_flutter: ^1.1.0`
- `hive: ^2.2.3`
- `shared_preferences: ^2.3.5`
- `isar: ^3.1.0+1` (optional)
- `isar_flutter_libs: ^3.1.0+1` (optional)
- (dev) `hive_generator: ^2.0.1`

**UI & Design**
- `google_fonts: ^6.2.1`
- `flutter_svg: ^2.0.17`
- `shimmer: ^3.0.0`
- `smooth_page_indicator: ^1.2.0+3`
- `dotted_border: ^2.1.0`
- `flutter_animate: ^4.5.2`
- `rive: ^0.13.20` (optional)
- `lottie: ^3.3.1`

**Charts & Visualization**
- `fl_chart: ^0.71.0`

**PDF & Documents**
- `pdf: ^3.11.2`
- `printing: ^5.13.5`
- `syncfusion_flutter_pdf: ^27.2.5` (or `pdfx: ^2.8.0`)
- `docx_template: ^0.3.2`

**OCR & ML**
- `google_mlkit_text_recognition: ^0.14.0`

**Camera & Image**
- `image_picker: ^1.1.2`
- `image_cropper: ^8.0.2`
- `cached_network_image: ^3.4.1`

**QR Code**
- `qr_flutter: ^4.1.0`

**Auth & Security**
- `local_auth: ^2.3.0`
- `flutter_secure_storage: ^9.2.4`

**Voice & Audio**
- `speech_to_text: ^7.0.0`
- `record: ^5.2.1`

**Connectivity & Network**
- `connectivity_plus: ^6.1.4`
- `dio: ^5.8.0+1`
- `url_launcher: ^6.3.1`

**Utilities**
- `uuid: ^4.5.1`
- `intl: ^0.19.0`
- `path_provider: ^2.1.5`
- `share_plus: ^10.1.4`
- `flutter_markdown: ^0.7.7`
- `shake: ^3.2.0`
- `package_info_plus: ^8.1.3`
- `permission_handler: ^11.3.1`

**Flutter/Dev**
- `flutter_test` SDK
- `flutter_lints: ^5.0.0`
- `integration_test` SDK

Also includes the `flutter:` section with `uses-material-design: true` and asset paths.

### 3. Append Section 20: Complete Screen Registry

A table mapping every screen to its route, feature module, and description:

| Screen Widget | Route | Feature Module | Description |
|---|---|---|---|
| `LandingPage` | `/` | `landing/` | Marketing hero, comparison strip, features |
| `AuthPage` | `/auth` | `auth/` | Login, signup, magic link, OAuth |
| `AuthCallbackPage` | `/auth/callback` | `auth/` | OAuth callback handler |
| `ResetPasswordPage` | `/reset-password` | `auth/` | Password reset form |
| `DashboardPage` | `/dashboard` | `dashboard/` | Resume list, stats, FAB, quick actions |
| `EditorPage` | `/editor` | `editor/` | Resume editor with stepper nav |
| `PreviewPage` | `/preview` | `preview/` | Full-bleed template preview |
| `UploadPage` | `/upload` | `upload/` | File upload, parse, OCR, review |
| `AIStudioPage` | `/ai-studio` | `ai_studio/` | AI tools grid, chat, credits |
| `InterviewPage` | `/interview` | `interview/` | Mock interview setup, voice, summary |
| `ApplicationsPage` | `/applications` | `applications/` | Job tracking, status filters |
| `PortfolioEditorPage` | `/portfolio` | `portfolio/` | Portfolio settings, theme, QR |
| `PublicPortfolioPage` | `/p/:username` | `portfolio/` | Public themed portfolio view |
| `SettingsPage` | `/settings` | `settings/` | All settings sections |
| `ProfilePage` | `/profile` | `settings/` | Profile editor |
| `TemplatesPage` | `/templates` | `templates/` | Template gallery grid |
| `OnboardingPage` | `/onboarding` | `onboarding/` | 4-step wizard |
| `CoverLettersPage` | `/cover-letters` | `cover_letters/` | Cover letter list |
| `CoverLetterNewPage` | `/cover-letter/new` | `cover_letters/` | Create cover letter |
| `CoverLetterEditPage` | `/cover-letter/edit/:id` | `cover_letters/` | Edit cover letter |
| `ResignationLettersPage` | `/resignation-letters` | `resignation_letters/` | Resignation letter list |
| `ResignationLetterNewPage` | `/resignation-letter/new` | `resignation_letters/` | Create resignation letter |
| `ResignationLetterEditPage` | `/resignation-letter/edit/:id` | `resignation_letters/` | Edit resignation letter |
| `CareerPage` | `/career` | `career/` | Quiz, roadmap, skill gap |
| `NotificationsPage` | `/notifications` | `dashboard/` | Notification center |
| `ResumeDetailPage` | `/resume/:id` | `dashboard/` | Single resume detail view |
| `JobDetailPage` | `/job/:id` | `applications/` | Job detail view |
| `ApplicationTrackerPage` | `/application/:id` | `applications/` | Application detail tracker |
| `SharePage` | `/share/:token` | `shared/` | Shared resume viewer |
| `ShortLinkPage` | `/l/:linkId` | `portfolio/` | Short link redirect |
| `PrivacyPage` | `/privacy` | `landing/` | Privacy policy |
| `TermsPage` | `/terms` | `landing/` | Terms of service |
| `GuidesPage` | `/guides` | `dashboard/` | Career guides list |
| `GuidePage` | `/guides/:slug` | `dashboard/` | Single guide view |
| `ExamplesPage` | `/examples` | `dashboard/` | Resume examples |

Total: **35 screens** across 16 feature modules.

## Technical Details
- File: `docs/APP_BLUEPRINT_FLUTTER.md`
- Adds ~250 lines (pubspec block + screen table)
- Version numbers pinned to latest stable as of February 2026
- Closing italic line moved after new sections
