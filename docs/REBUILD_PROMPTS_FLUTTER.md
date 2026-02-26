# WiseResume — Sequential Rebuild Prompts (Flutter / Dart)

> **Purpose**: This file contains a complete, ordered set of prompts that an AI tool (Cursor, Windsurf, or similar) can follow step-by-step to recreate the entire WiseResume app **as a native Flutter application** from scratch. It also includes Google Stitch prompts for generating screen designs.
>
> **Source of Truth**: All prompts reference `docs/APP_BLUEPRINT_FLUTTER.md` for design specs, widget trees, data models, and navigation flows.

---

## MASTER SYSTEM PROMPT

> **Paste this at the start of your AI conversation before sending any build prompt.**

```
You are an expert Flutter/Dart developer building "WiseResume" — an AI-powered resume builder native mobile app. You are following a sequential build plan of 55 prompts.

RULES YOU MUST FOLLOW IN EVERY RESPONSE:

1. PROGRESS TRACKER: Start every response with:
   "✅ PROMPT [X/55] — [Title]"
   Then list:
   - ✅ Completed prompts (numbers only)
   - 🔄 Current prompt
   - 📋 Remaining prompts (numbers only, grouped by phase)

2. ASK QUESTIONS: If any instruction is unclear or you need credentials/keys/choices from me, ASK before proceeding. Never guess.

3. SUGGEST IMPROVEMENTS: After completing each prompt, suggest 1-3 improvements or optimizations you noticed. Label them as "[💡 SUGGESTION]".

4. CONFIRM COMPLETION: End each response with:
   "Ready for PROMPT [X+1]? Or do you want me to adjust anything?"

5. REFERENCE THE BLUEPRINT: The file `docs/APP_BLUEPRINT_FLUTTER.md` is your design bible. Follow its color tokens, widget trees, spacing utilities, and data models exactly.

6. TECH STACK:
   - Flutter 3.x + Dart
   - Material 3 + custom widgets (adaptive for iOS via Cupertino)
   - Riverpod for state management (StateNotifierProvider, AsyncNotifierProvider)
   - GoRouter for navigation (ShellRoute for bottom nav)
   - freezed + json_serializable for data models
   - supabase_flutter for backend (Auth, Postgres, Edge Functions, Storage)
   - Hive + SharedPreferences for local persistence
   - fl_chart for charts
   - pdf + printing for PDF generation
   - speech_to_text for voice features

7. MOBILE-FIRST: Always design for xs (375 logical px, iPhone SE) first, then scale up with LayoutBuilder / MediaQuery. Use the BottomTabBar for primary nav, not desktop navbars.

8. DESIGN SYSTEM: Never use raw hex/rgb colors. Always use the ColorScheme + WiseResumeTheme extension defined in Section 3 of the blueprint. Map every color to a semantic token.

9. SKELETONS: Every page that fetches data MUST have a matching Shimmer/Skeleton widget shown during loading. Never show a blank screen.

10. FLUTTER BEST PRACTICES:
    - Use `const` constructors everywhere possible
    - Wrap expensive widgets in `RepaintBoundary`
    - Use `AutomaticKeepAliveClientMixin` on tab pages to preserve state
    - Skip `BackdropFilter` on low-end Android (check `Platform.isAndroid`)
    - Use `Hero` widgets for shared-element transitions between screens
    - Always dispose controllers in `dispose()`

11. NO SPAGHETTI: Keep widgets small and focused. Extract reusable patterns into shared widgets. Use proper Dart types and freezed models.

12. CODE GENERATION: After creating/modifying freezed models, remind me to run:
    `dart run build_runner build --delete-conflicting-outputs`
```

---

---

# PART A — GOOGLE STITCH SCREEN DESIGN PROMPTS

> Use these prompts in [Google Stitch](https://stitch.withgoogle.com/) to generate UI mockups for each screen group. Feed the generated designs to the build AI as visual references. These prompts are platform-agnostic — the designs serve as reference for the Flutter implementation.

---

### STITCH PROMPT 1 — Auth Screens (4 screens)

```
Design a mobile-first (375px wide) authentication flow for "WiseResume", a dark-themed AI resume builder app. The design language is space-inspired with deep blacks, vibrant red primary (#E63946 equivalent), cyan accents, and glass morphism surfaces.

Create these 4 screens:

1. EMAIL ENTRY SCREEN:
   - Dark background (near-black #0A0A12)
   - Centered app icon (48x48) with purple glow drop-shadow
   - "Welcome to WiseResume" heading in Space Grotesk bold
   - "Sign in or create an account" subtitle in muted gray
   - Email input field with Mail icon prefix, glass surface background
   - "Continue" gradient button (red-to-pink gradient, full width, h-14, rounded-2xl)
   - Divider with "or" text
   - "Continue with Google" outlined button with Google icon
   - Bottom text: "Don't have an account? Sign up" with red link

2. LOGIN SCREEN:
   - Same layout as email entry but with:
   - Email field (pre-filled, muted)
   - Password field with Lock icon prefix and Eye toggle suffix
   - "Sign in with email link" small link in red
   - "Forgot password?" link in muted gray
   - Same gradient CTA button "Sign In"

3. SIGNUP SCREEN:
   - Same layout with:
   - Email field (pre-filled)
   - Password field with strength indicator below
   - Confirm password field
   - Terms checkbox: "I agree to Terms and Privacy Policy"
   - "Create Account" gradient button

4. RESET PASSWORD SCREEN:
   - Minimal layout
   - Back arrow top-left
   - Lock icon centered (large, 64px, muted)
   - "Reset Password" heading
   - "Enter your email to receive a reset link" subtitle
   - Email input
   - "Send Reset Link" gradient button

Style: All inputs have rounded-xl borders, subtle border-border color, glass-input background. Buttons have glow shadow. Font: Inter for body, Space Grotesk for headings.
```

---

### STITCH PROMPT 2 — Dashboard + FAB

```
Design a mobile dashboard screen (375px wide) for "WiseResume" resume builder app. Dark theme, space-inspired aesthetic.

Layout top to bottom:
1. HEADER BAR (h-14): Glass surface background, "WiseResume" brand text left, gear icon right. Subtle bottom border.

2. PROFILE ROW: Round avatar (40x40) with red border-2, "Good morning, Sarah" greeting, "Software Engineer" subtitle, gear icon navigates to settings.

3. STATS CARD: Rounded-2xl card with gradient border glow. Inside: flame emoji "5-day streak", document icon "3 Resumes", lightbulb "Tip: Quantify your achievements". Glass card background.

4. QUICK ACTION CHIPS: Horizontal scroll row of pill buttons — "+ Create", "📄 Upload", "🎯 Tailor", "📋 Templates". Each is rounded-full with muted background and subtle border.

5. RESUME TABS: Two tabs "My CVs" and "Tailored" with swipeable content area.

6. SEARCH + FILTERS: Search input with magnifier icon, sort dropdown.

7. RESUME CARDS (list): Each card is rounded-2xl with border. Left: template thumbnail (48x64). Center: resume title (bold), target job subtitle, "2 days ago" timestamp. Right: circular score ring showing "92" in green (>=80 = green, >=50 = yellow, <50 = red).

8. FLOATING ACTION BUTTON: Fixed bottom-right (bottom-20 right-4), 56x56 rounded-full, red-to-pink gradient, white Plus icon, glow shadow.

9. BOTTOM TAB BAR: 5 tabs — Home (active, with animated pill indicator), Editor, AI Tools (sparkle), Activity (chart), Portfolio (globe). Glass surface background, rounded top corners.

Colors: Background #0A0A12, cards rgba(20,20,35,0.7) with blur, primary red #E63946, cyan accent, success green for high scores.
```

---

### STITCH PROMPT 3 — Resume Editor

```
Design a mobile resume editor screen (375px wide) for "WiseResume". Dark theme.

Layout:
1. TOP BAR: Back arrow, truncated resume title center, cloud sync icon (✓ or spinner), undo/redo arrows right. h-10.

2. PROGRESS BAR: Thin gradient bar (red-to-pink) showing 65% completion. Below header, full width.

3. STEPPER NAV: Horizontal scrollable pills — [Contact] [Summary] [Experience] [Education] [Skills] → more. Active pill has primary background, others are muted with border. Each pill has small icon + label.

4. ACTIVE SECTION (Experience shown): Rounded-2xl card with border. Header row: "💼 Experience" with sparkle AI button right. Below: Experience entries as sub-cards. Each entry: Company name bold, position, date range, bullet points. "+" button to add entry.

5. AI FLOATING BUTTON: Small circular button (w-10 h-10) at bottom-right of section, gradient background, sparkle icon. Triggers AI enhancement sheet.

6. BOTTOM TOOLBAR: Glass surface bar with icon buttons — Template (grid), Customize (palette), Share (link), Export (download), More (dots). Each icon in small rounded container.

7. BOTTOM TAB BAR: Same as dashboard but "Editor" tab active.

Typography: Section titles in Space Grotesk semibold. Field labels in xs muted. Input text in sm regular Inter.
```

---

### STITCH PROMPT 4 — Preview + Upload

```
Design 2 mobile screens (375px wide) for "WiseResume". Dark theme.

SCREEN 1 — RESUME PREVIEW:
- Back arrow + "Preview" title in header
- Large rendered resume preview centered (white page on dark background)
- Zoom controls (+ / - buttons) floating top-right of preview area
- Page navigation at bottom of preview: "Page 1 of 2" with left/right arrows
- Bottom bar with actions: "Template" button, "Export" gradient button
- Bottom tab bar with Editor tab active

SCREEN 2 — UPLOAD / IMPORT:
- Back arrow + "Import Resume" title
- Upload zone: Large dashed-border rectangle (rounded-2xl), centered cloud-upload icon (48px, muted), "Drag & drop or tap to upload" text, "PDF, DOCX, or Image" subtitle in muted text
- File type tabs below: [PDF] [Word] [Image] [LinkedIn] — horizontal pills
- Below upload zone: 3-step progress indicator (Upload → Parse → Review) with connecting lines, step circles numbered, active step highlighted in primary
- Tips card at bottom: rounded-2xl card, lightbulb icon, "For best results, use a text-based PDF" tip text

Colors: Same dark theme, dashed border in muted color, progress steps use primary for active/completed.
```

---

### STITCH PROMPT 5 — AI Studio + Interview

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme, space-inspired.

SCREEN 1 — AI STUDIO:
- Header with back arrow + "AI Tools"
- AI Engine badge: small pill "Powered by Gemini" in muted rounded-full
- AI Credits: "12/20 credits today" text-xs muted
- WISE AI CHAT CARD: Rounded-2xl card at top. Left: gradient circle avatar (red-to-pink) with sparkles icon. Right: "How can I help with your resume?" text. Below: suggestion chips in rounded-full pills.
- TOOL GRID: 2-column grid of tool cards. Each card: rounded-2xl border bg-card, colored icon circle (w-10 h-10 rounded-xl) top-left, tool name bold, one-line description muted. Tools: Tailor, Enhance, ATS Scan, Proofread, Cover Letter, Interview Prep, Career Path, Detect AI.
- Category headers between groups: "✍️ Writing Tools", "📊 Analysis", "🎯 Career"
- Bottom: chat input bar, rounded-2xl, placeholder "Ask Wise AI...", send button right

SCREEN 2 — MOCK INTERVIEW (Active):
- Header: back arrow + "Interview" + timer "03:24" right
- Chat transcript: AI messages left-aligned (bg-muted rounded-2xl), user messages right-aligned (bg-primary rounded-2xl)
- Audio waveform visualization in center (horizontal bar segments of varying height)
- Bottom controls: Large mic button (w-16 h-16 rounded-full bg-primary) center, stop button (w-12 h-12 bg-destructive) right
```

---

### STITCH PROMPT 6 — Applications + Job Detail

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — APPLICATIONS:
- Header: back arrow + "Activity"
- Tabs: [Applications] [Jobs] — horizontal, active has bottom border
- Status filter: Horizontal scroll pills — [All 12] [Applied 5] [Interviewing 3] [Offered 1] [Rejected 2]. Active pill = primary filled, others = outlined
- Application cards (list): Each rounded-2xl card. Company name bold, job title below, status badge (small colored pill: green=offered, blue=interviewing, red=rejected, gray=applied), applied date. Action buttons row: Notes, Edit, overflow menu.
- Stats card: "12 total | 3 this week | 8% response rate" in rounded card
- Streak: flame icon "3-day streak"
- Timeline: Vertical line with dots, events listed chronologically

SCREEN 2 — JOB DETAIL:
- Header: back arrow + "Job Details"
- Company header: Company logo placeholder (w-12 h-12 rounded-xl), company name, job title large
- Info pills: Location, Job type, Salary range — horizontal row of outlined pills
- Tabs: [Description] [Requirements] [Company]
- Description text content area
- Bottom: "Apply" gradient button full-width, "Save" outlined button
```

---

### STITCH PROMPT 7 — Portfolio Editor + Public Portfolio

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — PORTFOLIO EDITOR:
- Header: back arrow + "Portfolio"
- Toggle row: "Enable Portfolio" label + Switch toggle right
- Username field: "/p/" prefix label + text input for username
- Theme picker: horizontal scroll of color circles (w-8 h-8), active has ring-2 primary
- Sections list: Draggable rows with grip handle, section name, checkbox toggle. Sections: About, Experience, Education, Skills, Projects
- QR Code card: Rounded card with QR code image (120x120), "Share" copy button
- Analytics mini stats: Eye icon "142 views", person icon "89 visitors"

SCREEN 2 — PUBLIC PORTFOLIO:
- Standalone page (no app shell/bottom nav)
- Centered avatar (96x96 rounded-full border-4 accent)
- Name "John Doe" large heading
- Title "Software Engineer" muted
- Social icons row: LinkedIn, GitHub, Twitter, Website — small icon buttons
- Sections with accent left border (w-1 rounded-full):
  - About: paragraph text
  - Experience: company/role/dates + bullets
  - Education: university/degree
  - Skills: tag pills
- Floating "Ask AI ✨" button bottom-right (gradient, rounded-full)
- Footer: "Built with WiseResume" muted text centered
```

---

### STITCH PROMPT 8 — Settings + Profile

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — SETTINGS:
- Header: back arrow + "Settings"
- Category chips: horizontal scroll pills with icons — [👤 Account] [🎨 Appearance] [🤖 AI] [✏️ Editor] [🔔 Notifications] [🔒 Privacy]. Active = filled primary.
- Profile card: Large avatar (h-16 w-16) with progress ring overlay showing "72% complete", name, email
- Settings rows grouped by section. Each row: h-[56px] min, icon in colored rounded-lg (w-8 h-8), label text, right side = chevron / Switch toggle / value text. Examples:
  - 🔐 Account: Edit Profile ›, Change Email ›, Biometric Lock [toggle]
  - 🎨 Appearance: Theme "Dark" ›, Accent Color ›
  - 🤖 AI: AI Provider "WiseResume" ›, Usage "12/20" ›
- Section headers: Vertical primary bar (w-1 h-5 rounded-full bg-primary) + icon + label
- Sign Out row: destructive red text
- Developer Credit Card at bottom: animated gradient holographic card

SCREEN 2 — PROFILE EDITOR (Sheet/Page):
- Header: back arrow + "Edit Profile"
- Avatar section: Large avatar centered (h-20 w-20), camera icon overlay button
- Form fields stacked: Full Name, Job Title, Industry (select), Career Level (select), Location, LinkedIn URL, GitHub URL, Website, Phone
- "Save Changes" gradient button at bottom
```

---

### STITCH PROMPT 9 — Cover Letters + Resignation Letters

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — COVER LETTERS LIST:
- Header: back arrow + "Cover Letters"
- Empty state (if no letters): Large gradient circle icon (FileText), "No cover letters yet" heading, "Create your first AI-powered cover letter" subtitle muted, "Create Cover Letter" gradient button
- List view: Cards for each letter. Each card rounded-2xl: Title bold, company name, job title, preview snippet (2 lines, muted), created date, action buttons (edit, duplicate, delete, export)
- FAB or top-right "+" button to create new

SCREEN 2 — COVER LETTER EDITOR:
- Header: back arrow + "Cover Letter"
- Form fields: Job Title input, Company input
- Tone selector: Horizontal pills — [Professional] [Friendly] [Enthusiastic] [Formal]. Active = primary filled.
- Template style selector: Similar pills
- Resume selector: Dropdown to pick which resume to base it on
- "Generate with AI ✨" gradient button
- Content area: Rich text editor (textarea with formatting hints), editable content
- Bottom actions: "Save" gradient button, "Export" outlined button
```

---

### STITCH PROMPT 10 — Onboarding + Templates

```
Design 2 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — ONBOARDING WIZARD:
- Step indicator at top: 4 dots, current filled primary, others muted
- Step 1 shown: 
  - Large welcome illustration or gradient icon
  - "Welcome to WiseResume!" heading large
  - "Let's set up your profile" subtitle muted
  - Name input field (glass input style)
  - "Continue" gradient button full-width at bottom
- Design should feel inviting, clean, spacious with generous padding

SCREEN 2 — TEMPLATES GALLERY:
- Header: back arrow + "Templates"
- Category filter: horizontal pills — [All] [Professional] [Tech] [Creative] [Minimalist]
- ATS filter: small toggle "ATS Optimized"
- Template grid: 2-column grid of template preview cards. Each card: 
  - Template thumbnail (aspect ratio ~0.7, white page preview on dark card)
  - Template name below
  - Small ATS badge (green "High ATS" / yellow "Medium")
  - Tap to select
- Active/selected template has primary border ring
```

---

### STITCH PROMPT 11 — Help, Analytics, Subscription, Referral, Achievements

```
Design 5 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — HELP & FAQ:
- Header: back arrow + "Help"
- Search input at top: glass input with magnifier icon
- FAQ categories: Accordion sections — Getting Started, Resume Editor, AI Features, Account, Billing
- Each FAQ item: Collapsible with chevron, question text bold, answer text muted when expanded
- Bottom: "Contact Support" card with email/chat options

SCREEN 2 — ANALYTICS / INSIGHTS:
- Header: back arrow + "Insights"
- Stats overview cards: Resume count, application count, average ATS score (in score ring)
- ATS Score Trend Chart: Line chart showing score over time, primary color line, muted grid
- Activity chart: Bar chart showing applications per week
- Section breakdown: Which resume sections need improvement

SCREEN 3 — SUBSCRIPTION / PRICING:
- Header: back arrow + "Upgrade"
- Plan cards (stacked): Free (current, muted outline), Pro ($9.99/mo, primary border glow), Premium ($19.99/mo, accent border glow)
- Each card: Plan name, price, feature bullet list with check icons, CTA button
- Free card: "Current Plan" muted badge
- Pro card: "Most Popular" accent badge, gradient CTA
- Feature comparison table below

SCREEN 4 — REFERRAL:
- Header: back arrow + "Invite Friends"
- Referral code card: Large code display, copy button, share button
- QR code for referral link
- Stats: "3 friends invited", "1 reward earned"
- Reward tiers: Visual progress bar showing reward milestones

SCREEN 5 — ACHIEVEMENTS:
- Header: back arrow + "Achievements"
- Badge grid: 3-column grid of circular badge icons
- Earned badges: Full color with glow
- Locked badges: Muted/grayscale with lock overlay
- Each badge: Icon, name below, progress bar for partially complete
- Categories: Resume Master, AI Explorer, Career Builder, Social Butterfly
```

---

### STITCH PROMPT 12 — Career Path + Notifications + 404

```
Design 3 mobile screens (375px) for "WiseResume". Dark theme.

SCREEN 1 — CAREER PATH:
- Header: back arrow + "Career Path"
- Current role card: Rounded card with user's current job title
- Career roadmap visualization: Vertical tree/flowchart showing:
  - Current position (highlighted node)
  - 2-3 suggested next roles (branching paths)
  - Required skills for each path (tag pills)
  - Timeline estimate ("2-3 years")
- "Take Career Quiz" button at top or bottom
- Skill gap section: List of skills needed vs current, with progress bars

SCREEN 2 — NOTIFICATIONS:
- Header: back arrow + "Notifications"
- Notification list: Each item = rounded card, icon left (type-specific: bell, briefcase, star), title bold, message text muted, timestamp right, unread indicator (primary dot)
- Empty state: Bell icon large, "No notifications" heading, "You're all caught up!" subtitle
- Mark all read button at top

SCREEN 3 — 404 NOT FOUND:
- Centered layout, full page
- Large "404" text in gradient (primary to accent), very bold, text-6xl
- Space-themed illustration or floating astronaut icon
- "Page not found" heading
- "The page you're looking for doesn't exist" subtitle muted
- "Go Home" gradient button
- Animated floating particles/stars in background
```

---

---

# PART B — FLUTTER APP BUILD PROMPTS (55 Prompts)

---

## Phase 1: Foundation (Prompts 1–6)

---

### PROMPT 1/55 — Flutter Project Setup + Folder Structure

```
Create a new Flutter project for "WiseResume", an AI-powered resume builder native mobile app targeting Android and iOS.

PROJECT SETUP:
- Run: flutter create wise_resume
- Minimum SDK: >=3.6.0 <4.0.0
- Package name: com.wiseuniverse.wiseresume

PUBSPEC.YAML — Install ALL dependencies listed in APP_BLUEPRINT_FLUTTER.md Section 19. Key packages:
- flutter_riverpod, riverpod_annotation
- go_router
- supabase_flutter
- freezed_annotation, json_annotation
- hive_flutter, hive, shared_preferences
- google_fonts, flutter_svg, shimmer, smooth_page_indicator, dotted_border, flutter_animate, lottie
- fl_chart
- pdf, printing, syncfusion_flutter_pdf, docx_template
- google_mlkit_text_recognition
- image_picker, image_cropper, cached_network_image
- qr_flutter
- local_auth, flutter_secure_storage
- speech_to_text, record
- connectivity_plus, dio, url_launcher
- uuid, intl, path_provider, share_plus, flutter_markdown, shake, package_info_plus, permission_handler

Dev dependencies:
- freezed, json_serializable, build_runner, riverpod_generator, hive_generator

FOLDER STRUCTURE — Create the exact structure from APP_BLUEPRINT_FLUTTER.md Section 2:

lib/
  ├── main.dart
  ├── app.dart
  ├── core/
  │     ├── theme/
  │     ├── router/
  │     ├── constants/
  │     ├── utils/
  │     └── services/
  ├── features/
  │     ├── auth/
  │     ├── dashboard/
  │     ├── editor/
  │     ├── preview/
  │     ├── upload/
  │     ├── ai_studio/
  │     ├── interview/
  │     ├── applications/
  │     ├── portfolio/
  │     ├── settings/
  │     ├── cover_letters/
  │     ├── resignation_letters/
  │     ├── career/
  │     ├── templates/
  │     ├── onboarding/
  │     ├── landing/
  │     ├── help/
  │     ├── analytics/
  │     └── subscription/
  ├── shared/
  │     ├── widgets/
  │     ├── models/
  │     └── providers/
  └── gen/

Also create: assets/images/, assets/icons/, assets/lottie/, assets/fonts/

MAIN.DART:
- WidgetsFlutterBinding.ensureInitialized()
- SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp])
- Placeholder for Supabase.initialize() (will be configured in Prompt 3)
- Placeholder for Hive.initFlutter() (will be configured in Prompt 5)
- runApp(ProviderScope(child: WiseResumeApp()))

APP.DART:
- Create WiseResumeApp as ConsumerWidget
- MaterialApp.router with placeholder router, light/dark themes, themeMode
- Deliver: Compilable project with all folders created and empty placeholder files.
```

---

### PROMPT 2/55 — Design System (ThemeData + Colors + Fonts)

```
Implement the complete design system for WiseResume Flutter app.

Reference: APP_BLUEPRINT_FLUTTER.md Section 3 (Design System).

1. THEME EXTENSION — Create lib/core/theme/wise_resume_theme.dart:
   class WiseResumeTheme extends ThemeExtension<WiseResumeTheme> with all custom tokens:
   - accent, success, warning, input
   - spaceDeep, spaceNebula, spaceStar, spaceCyan, spaceGlow
   - sidebarBackground, sidebarPrimary, sidebarAccent
   - gradientPrimary, gradientSecondary (LinearGradient)
   - glowShadow (BoxShadow)

2. COLOR SCHEME — Create dark and light ColorScheme:
   Dark mode (default):
   - surface: HSL(240, 20%, 4%) — deep space black
   - onSurface: HSL(0, 0%, 98%) — near-white
   - surfaceContainerHighest: HSL(240, 15%, 8%) — cards
   - primary: HSL(355, 90%, 60%) — vibrant red
   - secondary: HSL(185, 100%, 50%) — cyan
   - error: HSL(0, 84%, 60%)
   - outlineVariant: HSL(240, 15%, 18%) — borders
   (See blueprint Section 3.3 for ALL dark mode values)

   Light mode:
   - surface: HSL(0, 0%, 100%)
   - onSurface: HSL(240, 10%, 10%)
   - primary: HSL(355, 75%, 50%)
   (See blueprint Section 3.3 for ALL light mode values)

3. TEXT THEME — Create lib/core/theme/text_theme.dart:
   - displayLarge: Space Grotesk, bold, fontSize 28-32
   - displayMedium: Space Grotesk, bold, fontSize 24
   - displaySmall: Space Grotesk, semibold, fontSize 20
   - bodyLarge: Inter, fontSize 16, height 1.6
   - bodyMedium: Inter, fontSize 14.5
   - labelSmall: Inter, fontSize 12, weight 500
   Use GoogleFonts.inter() and GoogleFonts.spaceGrotesk()

4. SPACING CONSTANTS — Create lib/core/constants/spacing.dart:
   - kEdgePadding = EdgeInsets.symmetric(horizontal: 12) // md: 16
   - kSectionSpacing = 16.0 // md: 24
   - kCardPadding = EdgeInsets.all(12) // md: 16

5. GRADIENT CONSTANTS — Create lib/core/constants/gradients.dart:
   - kGradientPrimary: LinearGradient from primary to accent (135deg)
   - kGradientSecondary: LinearGradient from secondary to primary
   - kGlowShadow: BoxShadow(color: primary.withOpacity(0.4), blurRadius: 24, spreadRadius: -4)

6. SHARED WIDGETS — Create initial reusable widgets in lib/shared/widgets/:
   a. GlassSurface: ClipRRect + BackdropFilter(sigmaX:20, sigmaY:20) + Container with semi-transparent card color. Skip BackdropFilter on Android for performance.
   b. GlassCard: Similar, lighter blur (16)
   c. GlassInput: Input field with glass background
   d. GlassHeader: AppBar-style glass surface
   e. GradientButton: Container with gradient decoration, InkWell child, glow shadow
   f. ScoreRing: CustomPainter drawing arc, color by score (>=80 success, >=50 warning, <50 destructive)
   g. EmptyState: Column with gradient icon circle + heading + subtitle + CTA button
   h. SectionHeader: Row with vertical primary bar + icon + label text

7. ANIMATION DURATIONS — Create lib/core/constants/animations.dart:
   - kFadeInDuration = Duration(milliseconds: 500)
   - kSlideUpDuration = Duration(milliseconds: 600)
   - kScaleInDuration = Duration(milliseconds: 300)
   - Curves: Curves.easeOut, Curves.easeOutBack for spring-like

8. Wire themes into app.dart: MaterialApp.router with theme: lightTheme, darkTheme: darkTheme, themeMode from a placeholder settingsProvider.

Deliver: Fully themed app that compiles with all color tokens, fonts, and reusable shared widgets.
```

---

### PROMPT 3/55 — Supabase Initialization + Auth System

```
Set up Supabase and the complete authentication system.

SUPABASE SETUP:
- Initialize supabase_flutter in main.dart:
  await Supabase.initialize(
    url: '<SUPABASE_URL>',      // ASK ME for this
    anonKey: '<SUPABASE_ANON_KEY>', // ASK ME for this
  );
- Create lib/core/services/supabase_service.dart:
  - Singleton access to Supabase.instance.client
  - Helper for functions.invoke()

AUTH SYSTEM — Create lib/features/auth/:

1. AuthService (lib/core/services/auth_service.dart):
   - signInWithEmail(email, password)
   - signUpWithEmail(email, password)
   - signInWithMagicLink(email)
   - signInWithOAuth(provider) — Google, Apple
   - signOut()
   - resetPassword(email)
   - updatePassword(newPassword)
   - onAuthStateChange stream
   - Get current user/session

2. Auth Riverpod Providers (lib/shared/providers/auth_provider.dart):
   - authStateProvider: StreamProvider listening to onAuthStateChange
   - currentUserProvider: Provider derived from authStateProvider
   - isAuthenticatedProvider: Provider<bool>

3. AuthPage (lib/features/auth/auth_page.dart):
   Multi-step flow using PageView or state machine:
   a. EmailEntryStep: Email input → determine login vs signup
   b. LoginForm: Password input, "Forgot password?" link, "Sign in with email link" option
   c. SignupForm: Password + confirm, terms checkbox, password strength indicator
   d. MagicLinkSent: Confirmation UI
   e. VerifyEmail: Post-signup verification prompt
   f. Social Auth Buttons: Google, Apple (use supabase_flutter OAuth)
   g. Rate limiting / cooldown UI after failed attempts

4. AuthCallbackPage: Handle OAuth redirect + PKCE exchange

5. ResetPasswordPage: New password form

6. AuthGuard: GoRouter redirect logic — if not authenticated, redirect to /auth

DESIGN: Follow APP_BLUEPRINT_FLUTTER.md Section 18.3 for exact widget tree layout:
- GradientButton for CTAs (h-56, borderRadius 16)
- GlassInput for text fields
- Space Grotesk headings
- Purple glow on app icon

SKELETON: AuthSkeleton with Shimmer widgets matching the form layout.

DATABASE TRIGGER: The profiles table auto-creation trigger should already exist from the web version. If not, note that it needs to be created (same Supabase project).
```

---

### PROMPT 4/55 — Data Models (All freezed Classes)

```
Create ALL data models for WiseResume using freezed + json_serializable.

Reference: APP_BLUEPRINT_FLUTTER.md Section 9 (Data Models).

Create all models in lib/shared/models/:

1. contact_info.dart — ContactInfo: fullName, email, phone, location, linkedin?, portfolio?, photoUrl?
2. experience.dart — Experience: id, company, position, startDate, endDate, current, description, achievements[], responsibilities?[], isProject?
3. education.dart — Education: id, institution, degree, field, startDate, endDate, gpa?
4. certification.dart — Certification: id, name, issuer, date, expiryDate?, credentialId?
5. award.dart — Award: id, title, issuer, date, description?
6. project.dart — Project: id, name, role, startDate, endDate, technologies[], description, url?, githubUrl?
7. publication.dart — Publication: id, title, publisher, date, coAuthors?, url?
8. volunteering.dart — Volunteering: id, organization, role, startDate, endDate, description, hours?
9. hobby.dart — Hobby: id, name, description?, visible
10. language.dart — Language: id, name, proficiency (String: 'native'|'fluent'|'professional'|'basic')
11. reference.dart — Reference: id, name, title, company, email, phone, relationship, availableOnRequest?
12. template_customization.dart — TemplateCustomization: accentColor, fontHeading, fontBody, fontSize, layout, spacing, margins, lineHeight, pageFormat
13. resume_data.dart — ResumeData: id?, contactInfo, summary, experience[], education[], skills[], certifications[], awards?[], projects?[], publications?[], volunteering?[], hobbies?[], references?[], languages?[], templateId, customization?, createdAt?, updatedAt?

14. job_match_score.dart — JobMatchScore: overallScore, skillsMatch, experienceRelevance, keywordAlignment, atsCompatibility, strengths[], improvements[]
15. gap_analysis.dart — GapAnalysis: missingKeywords[], missingSkills[], suggestedSections[], recommendedPhrases[], priorityImprovements (List<PriorityImprovement>)
    PriorityImprovement: priority, suggestion, impact
16. pdf_options.dart — PDFOptions: showPageNumbers (default true), pageNumberFormat (default 'simple'), showBranding (default false)

17. job_intelligence.dart — JobIntelligence: experienceLevel, salaryRange?, workMode, mustHaveSkills[], niceToHaveSkills[], companyCultureSignals[], applicationDeadline?, redFlags[], industryDetected
18. super_tailor_result.dart — SuperTailorResult: summary, skills[], experience[], education[], keyChanges[], sectionScores?, overallScore?, missingSkills[], boostableSkills[], jobParsed, jobIntelligence?, interviewTalkingPoints?[], atsAnalysis?, bulletTransformations?[], strengthsAnalysis?[], projects?[], certifications?[], awards?[]

19. Enums in lib/core/constants/enums.dart:
    - SectionId enum
    - TailorSectionId enum
    - ExportType enum
    - TemplateId (30 template IDs as enum or String typedef)

All models MUST use @freezed annotation with proper fromJson factory.

After creating all files, remind me to run:
dart run build_runner build --delete-conflicting-outputs
```

---

### PROMPT 5/55 — Riverpod Providers + Local Persistence

```
Set up the complete state management layer with Riverpod and local persistence.

Reference: APP_BLUEPRINT_FLUTTER.md Section 11 (State Management).

HIVE SETUP (lib/core/services/hive_service.dart):
- Initialize Hive in main.dart: await Hive.initFlutter()
- Register Hive adapters for complex types (or store as JSON strings)
- Open boxes: 'resume-storage', 'offline-sync', 'ats-score-history', 'content-library'

RIVERPOD PROVIDERS — Create in lib/shared/providers/:

1. resume_provider.dart — ResumeNotifier (StateNotifier):
   State: currentResume, currentResumeId, jobDescription, matchScore, gapAnalysis, selectedTemplate, tailorHistory, tailorHistoryByResume, coverLetterHistory, pageBreakSettings
   Actions: updateResume(), setCurrentResume(), setCurrentResumeId(), addTailorHistory(), restoreTailorVersion()
   Persistence: Hive box 'resume-storage' — persist currentResume, currentResumeId, selectedTemplate, pageBreakSettings, tailorHistory

2. settings_provider.dart — SettingsNotifier:
   State: themeMode (ThemeMode), aiProvider, biometricLockEnabled, hasSeenSplash, hasSeenAIIntro, autoProofread, shakeToReportEnabled, quietHoursStart, quietHoursEnd
   Actions: setTheme(), setAIProvider(), toggleBiometric(), resetSettings()
   Persistence: SharedPreferences 'wiseresume-settings'
   Wire themeMode into app.dart MaterialApp.router

3. offline_sync_provider.dart — OfflineSyncNotifier:
   State: List<PendingChange> pendingChanges
   Actions: queueChange(), flushQueue(), clearQueue()
   Persistence: Hive box 'offline-sync'

4. proofread_provider.dart — ProofreadNotifier: in-memory session state
5. ai_health_provider.dart — AIHealthNotifier: in-memory service status
6. ats_score_history_provider.dart: Hive persisted score trend
7. content_library_provider.dart: Hive persisted content snippets
8. guides_provider.dart: SharedPreferences guide read progress

SUPABASE ASYNC PROVIDERS — Create stubs for data fetching:

- resumesProvider: FutureProvider.autoDispose fetching from 'resumes' table
- profileProvider: FutureProvider fetching from 'profiles' table
- jobsProvider, jobApplicationsProvider
- coverLettersProvider, resignationLettersProvider
- notificationsProvider
- interviewHistoryProvider, resumeVersionsProvider, resumeSharesProvider
- portfolioAnalyticsProvider

Each follows the pattern:
```dart
final resumesProvider = FutureProvider.autoDispose<List<ResumeData>>((ref) async {
  final userId = ref.watch(currentUserProvider)?.id;
  if (userId == null) return [];
  final response = await Supabase.instance.client
    .from('resumes').select().eq('user_id', userId).order('updated_at', ascending: false);
  return response.map((e) => ResumeData.fromJson(e)).toList();
});
```

Deliver: All providers wired, persistence working, theme switching functional.
```

---

### PROMPT 6/55 — GoRouter + AppShell + BottomTabBar

```
Build the routing system and app layout shell.

Reference: APP_BLUEPRINT_FLUTTER.md Section 5 (Routing) and Section 6 (Layout).

GOROUTER — Create lib/core/router/app_router.dart:

Full route configuration from blueprint Section 5:

Public routes (no auth required):
- / → LandingPage
- /auth → AuthPage
- /auth/callback → AuthCallbackPage
- /privacy → PrivacyPage
- /terms → TermsPage
- /reset-password → ResetPasswordPage
- /share/:token → SharePage
- /p/:username → PublicPortfolioPage
- /l/:linkId → ShortLinkPage

Protected routes (wrapped in ShellRoute with AppShell):
- /dashboard, /editor, /preview, /upload, /settings, /interview
- /applications, /onboarding, /profile, /templates
- /resume/:id, /job/:id, /application/:id
- /notifications, /portfolio, /cover-letters, /cover-letter/new, /cover-letter/edit/:id
- /examples, /career, /resignation-letters, /resignation-letter/new, /resignation-letter/edit/:id
- /guides, /guides/:slug, /ai-studio, /help, /analytics, /subscription, /referral, /achievements

Redirects:
- /activity → /applications
- /jobs → /applications
- /jobs/:id → /job/:id

Auth redirect: If not authenticated → /auth (except public routes)
Error builder: NotFoundPage

APPSHELL — Create lib/shared/widgets/app_shell.dart:
Widget tree (from blueprint Section 6):
- PopScope / WillPopScope (Android back button handling)
- Scaffold(
    appBar: (mobile only, hidden on editor) → GlassHeader("WiseResume / PageTitle")
    body: Column(
      OfflineBanner (when offline),
      SlowConnectionBanner (when slow),
      Expanded(child) ← page with fade transition
    ),
    bottomNavigationBar: BottomTabBar (mobile only),
  )
- SyncConflictDialog (overlay, when detected)

BOTTOMTABBAR — Create lib/shared/widgets/bottom_tab_bar.dart:
5 tabs from blueprint Section 6:
| Tab | Icon | Path | Match Paths |
|-----|------|------|-------------|
| Home | Icons.home | /dashboard | /dashboard, /settings, /profile, /notifications, /templates, /examples, /guides, /resume, /onboarding, /help, /analytics, /achievements, /subscription, /referral |
| Editor | Icons.description | /editor | /editor, /preview |
| AI Tools | Icons.auto_awesome | /ai-studio | /ai-studio, /career, /cover-letter*, /resignation-letter*, /interview |
| Activity | Icons.bar_chart | /applications | /applications, /application, /job |
| Portfolio | Icons.language | /portfolio | /portfolio |

Features:
- Animated pill indicator (AnimatedPositioned or Hero with spring-like curve)
- HapticFeedback.selectionClick() on tap
- Discovery dots for first-time users (AI Tools, Portfolio) via SharedPreferences
- Editor tab is "guarded" — auto-loads latest resume or prompts creation
- Glass surface background with rounded top corners
- Badge on Home tab for changelog/sync count

BACK ROUTES — Create lib/core/constants/back_routes.dart:
Map from blueprint Section 14. Key mappings:
- /editor → /dashboard
- /preview → /editor
- /interview → /ai-studio
- etc.

Exit routes (where back button exits app): /, /dashboard

NAVIGATION HELPER — lib/core/utils/navigation_helper.dart:
- handleBackButton(context) using back routes map
- shouldExitOnBack(path) check

Deliver: Full navigation working, AppShell rendering with bottom tab bar, back button handling.
```

---

## Phase 2: Core Screens (Prompts 7–17)

---

### PROMPT 7/55 — Landing Page

```
Build the Landing Page (/) for WiseResume.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.1 + 18.2.

This is a PUBLIC page (no auth required, no AppShell/BottomTabBar).

WIDGET TREE:
1. Space-themed animated background (CustomPainter):
   - Star particles (animated twinkle — opacity + scale)
   - Gradient nebula orbs (animated floating — sin/cos translateY)
   - Shooting star animations (diagonal slide + fade)
   - Colors: spaceDeep, spaceNebula, spaceStar, spaceCyan, spaceGlow

2. HeroSection:
   - App logo (120x120) with glowPulse animation (animated BoxShadow)
   - ShaderMask gradient headline: "Build Your Perfect Resume"
   - Subtitle with body text
   - GradientButton "Get Started Free →" (h-56, borderRadius 16)
   - Trust bar: Row of "✓ Free", "✓ No card", "✓ ATS Ready" chips

3. ComparisonStrip: Left column with strikethrough text (competitors), right column with bold primary text (WiseResume advantages)

4. HowItWorks: 3 numbered steps with pink circle icons

5. FeaturesGrid: GridView of feature cards (AI Tailor, ATS Score, Interview Prep, etc.)

6. PortfolioDemo: Phone frame mockup (AspectRatio 9/16, border 8, borderRadius 20)

7. EditorDemo: Interactive preview section

8. Footer: Brand, Privacy/Terms links, © 2025 WiseUniverse

Navigation: "Get Started" → /auth, "Sign In" → /auth

SKELETON: Not needed (static content page).
```

---

### PROMPT 8/55 — Dashboard Page

```
Build the Dashboard Page (/dashboard).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.3 + 18.4.

WIDGET TREE:
1. ProfileHeader: CircleAvatar(radius:20, border:2 primary), greeting "Good morning, [Name]", job title subtitle, gear icon → /settings

2. DashboardStats: GlassCard with gradient border. Streak flame, resume count, daily tip.

3. QuickActionChips: Horizontal ListView of ActionChip widgets — Create, Upload, Tailor, Templates. Rounded-full, muted bg, fade-in animation.

4. OnboardingCarousel: Show for first-time users (check onboarding_completed). Dismissible.

5. ResumeFilters: Row with SearchTextField + Sort DropdownButton + Category FilterChip

6. Resume Tabs: TabBar + TabBarView — "My CVs" / "Tailored"

7. Resume List: ListView.builder with ResumeListCard for each resume:
   - Template preview thumbnail (48x64)
   - Title (bold), target job, score badge (ScoreRing widget)
   - Last modified timestamp
   - PopupMenuButton: Edit, Duplicate, Delete, Share

8. FloatingActionButton: Positioned(bottom:80, right:16), gradient Container(56x56, borderRadius:28), Plus icon. Tap → SpeedDial (New, Tailor, Analyze) or CreateResumeDialog.

9. CreateResumeDialog: AlertDialog with title input, template quick-select, create button → navigate to /editor

10. WhatsNextCard, DailyTipCard, FeatureDiscoveryCard — contextual cards

11. ATSScoreBreakdown + ATSScoreTrendChart (fl_chart LineChart)

DATA: Use resumesProvider, profileProvider. Show Shimmer skeleton during loading.

SKELETON: DashboardSkeleton — matching the layout with shimmer blocks.
```

---

### PROMPT 9/55 — Resume Editor (Core Structure + 13 Sections)

```
Build the Resume Editor Page (/editor) — the most complex screen.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.4 + 18.5.

CORE STRUCTURE:

1. Custom AppBar:
   - Leading: back button with unsaved changes guard (showDialog if dirty)
   - Title: resume title (overflow: ellipsis)
   - Actions: cloud sync status icon, undo button, redo button

2. LinearProgressIndicator: Gradient (primary → accent), shows section completion %

3. StepperNav: Horizontal ListView of ChoiceChip widgets for each section:
   Contact | Summary | Experience | Education | Skills | Certifications | Awards | Projects | Publications | Volunteering | Hobbies | References | Languages
   Active chip = primary background, others = muted with border, icon + label

4. Section Content: Active section rendered based on stepper selection

5. Undo/Redo: Implement 50-step history stack in a local StateNotifier

6. Auto-save: Debounced save to Supabase (2 second delay after last edit)

7. Cloud sync status: Icon showing saved/saving/error state

SECTIONS TO BUILD (each as its own widget in lib/features/editor/sections/):

a. ContactSection: Form fields for fullName, email, phone, location, linkedin, portfolio, photoUrl (image_picker for photo)
b. SummarySection: TextFormField (multiline) + AI enhance IconButton (sparkle)
c. ExperienceSection: List of experience cards. Each: company, position, startDate, endDate, current toggle, description, achievements list (add/remove bullets). InlineAIButton per bullet. Gap detection between entries.
d. EducationSection: List of education entries. institution, degree, field, dates, gpa
e. SkillsSection: Chip input — type skill → add as Chip. Remove on tap. AI suggest button.
f. CertificationsSection: List of cert entries
g. AwardsSection: List of award entries
h. ProjectsSection: List with name, role, dates, technologies[], description, url, githubUrl
i. PublicationsSection: List entries
j. VolunteeringSection: List entries
k. HobbiesSection: List entries with visibility toggle
l. ReferencesSection: List entries with "Available on request" toggle
m. LanguagesSection: List with proficiency dropdown

TOOLBAR — Bottom bar with icon buttons (see blueprint 18.5):
Template, Customize, Share, Export, More (each triggers a showModalBottomSheet)

DESKTOP LAYOUT (≥1024px):
Row: Expanded(editor) | VerticalDivider | Expanded(LivePreviewPanel)

DATA: Load from resumeProvider.currentResume, auto-save via ResumeRepository

SKELETON: EditorSkeleton.
```

---

### PROMPT 10/55 — Editor Bottom Sheets (Template, Customize, Share, Export)

```
Build the bottom sheet actions triggered from the Editor toolbar.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.4 toolbar actions.

Each sheet uses showModalBottomSheet with:
- shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24)))
- Grab handle: Container(w:32, h:4, borderRadius:2, color:muted) centered at top
- Glass surface background

SHEETS TO BUILD:

1. TemplateSelector Sheet:
   - GridView.count(crossAxisCount: 2) of template preview cards
   - Category filter chips at top
   - ATS badge on each card
   - Tap to apply template (updates resumeProvider.currentResume.templateId)

2. CustomizeSheet:
   - Accent color picker (horizontal color circles)
   - Font heading selector (dropdown)
   - Font body selector (dropdown)
   - Font size selector (small/medium/large chips)
   - Layout toggle (single/two-column)
   - Spacing selector (compact/normal/spacious)
   - Margins selector (narrow/normal/wide)
   - Line height selector
   - Page format toggle (A4/Letter)
   All changes update resumeProvider.currentResume.customization

3. ShareSheet:
   - Generate share link (create resume_shares record)
   - Optional password protection (TextFormField)
   - Optional expiry date (date picker)
   - Copy link button → Clipboard + toast
   - Share via share_plus native sheet

4. ExportOptionsSheet:
   - List of export formats with icons + descriptions:
     PDF, ATS-Optimized PDF, DOCX, Plain Text, LinkedIn Format, One-Page PDF
   - Each option: ListTile with leading icon, title, subtitle description
   - Tap → trigger export flow (implementation in later prompts)

5. ATSScanSheet:
   - ScoreRing showing ATS score
   - Category breakdown bars (LinearProgressIndicator)
   - Improvement suggestions list
   - "Re-scan" button

6. ProofreadSheet: Display proofread issues with accept/reject
7. VersionHistorySheet: List of versions with restore option
8. TailorSheet placeholder: Will be fully built in Prompt 21

Deliver: All sheets functional and styled per blueprint.
```

---

### PROMPT 11/55 — Preview Page

```
Build the Resume Preview Page (/preview).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.5 + 18.6.

WIDGET TREE:
1. AppBar: Back arrow + "Preview" title + zoom controls (IconButtons for +/-)

2. Preview Area:
   - InteractiveViewer (pinch-to-zoom enabled)
   - Inside: Rendered resume template (initially a simple placeholder widget that shows the resume data in a formatted layout)
   - White page on dark background
   - Page break indicators for multi-page

3. Page Navigation: Row at bottom of preview area:
   - IconButton(Icons.chevron_left)
   - Text("Page 1 of 2")
   - IconButton(Icons.chevron_right)
   - Use PageView.builder for swiping between pages

4. Bottom Actions:
   - "Template" TextButton → TemplateSelector sheet
   - "Export PDF" GradientButton → ExportOptionsSheet

DATA: Read from resumeProvider.currentResume

NOTE: The actual template rendering (30 templates as CustomPaint/Widget) comes in Prompt 14. For now, create a simple formatted layout that displays all resume sections in a clean, printable format.
```

---

### PROMPT 12/55 — Upload Page

```
Build the Upload / Import Resume Page (/upload).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.6 + 18.7.

WIDGET TREE:
1. AppBar: Back arrow + "Upload Resume"

2. UploadZone: GestureDetector + DottedBorder container (minHeight: 280):
   - Cloud upload icon (48px, muted)
   - "Tap to upload your resume" text
   - "Supports PDF, DOCX, IMG" subtitle
   - Tap → file_picker (FileType.custom, allowedExtensions: ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'])
   - File size limit display

3. FileTypeSelector: Column of ListTile rows:
   - PDF (red CircleAvatar): "Upload PDF file"
   - DOCX (blue CircleAvatar): "Upload Word document"
   - Image (green CircleAvatar): "Scan image with OCR"
   Each triggers file_picker with specific type filter

4. UploadProgressSteps: Custom animated stepper:
   ① Upload → ② Parse → ③ Review
   Active step highlighted in primary, completed in success

5. PARSING LOGIC:
   - PDF: Call parse-resume edge function (sends file content)
   - DOCX: Extract text client-side or via edge function
   - Image: Use google_mlkit_text_recognition for OCR → parse extracted text

6. ImportReviewSheet (showModalBottomSheet):
   - Show parsed resume data section by section
   - User can edit/confirm each section
   - "Import" GradientButton → creates new resume in Supabase

7. ATSScorePreview: ScoreRing + category bars after import

HOOKS: Create UploadService in lib/core/services/upload_service.dart

SKELETON: UploadSkeleton.
```

---

### PROMPT 13/55 — Templates Gallery

```
Build the Templates Gallery Page (/templates).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.16 + 18.17.

WIDGET TREE:
1. AppBar: Back arrow + "Templates"

2. Category Filters: Horizontal Wrap or ListView of FilterChip:
   All | Professional | Tech | Creative | Minimalist
   Active chip = primary filled

3. ATS Filter: Small ToggleSwitch "ATS Optimized" to filter high-ATS templates

4. Template Grid: GridView.count(crossAxisCount: 2) of template cards:
   Each card:
   - AspectRatio(3/4) with ClipRRect
   - Template preview thumbnail (placeholder colored containers for now — actual rendering in Prompt 14)
   - Template name Text below
   - Positioned ATS badge overlay: green "High ATS" / yellow "Medium" / red "Low"
   - Selected template has Border.all(color: primary, width: 2)
   - onTap → update resumeProvider selectedTemplate + navigate to /editor

TEMPLATE DATA: Create lib/core/constants/templates.dart:
Define all 30 templates as a List<TemplateInfo>:
| ID | Name | Category | ATS Score |
(Full list from APP_BLUEPRINT_FLUTTER.md Section 8)

Each TemplateInfo: id, name, description, atsScore ('high'|'medium'|'low'), category ('professional'|'tech'|'creative'|'minimalist')

SKELETON: TemplatesSkeleton with shimmer grid.
```

---

### PROMPT 14/55 — Template Rendering (30 Templates)

```
Build the actual resume template rendering system.

This is a LARGE prompt. Create a rendering system that can produce PDF-ready layouts for all 30 templates.

APPROACH:
Create lib/features/preview/templates/ directory with a template rendering system.

1. TemplateRenderer (lib/features/preview/templates/template_renderer.dart):
   - Factory that takes templateId + ResumeData + TemplateCustomization
   - Returns a Widget tree for preview OR a pdf.Document for export
   - Handles both screen preview and PDF generation

2. Base Template Widget:
   - ResumeTemplateWidget(data: ResumeData, customization: TemplateCustomization)
   - Renders sections in order based on template layout
   - Applies customization (colors, fonts, spacing, margins)
   - Handles page breaks

3. Template Categories — implement at least 5 distinct layout styles:

   a. SINGLE COLUMN templates (Modern, Classic, Minimal, Professional, Clean, Swiss, Mono, Zen, Compact, Academic, Healthcare, Sales, Corporate, Banking, Consulting, Federal, Legal):
      - Full-width sections stacked vertically
      - Name/contact header at top
      - Consistent left-aligned sections

   b. TWO-COLUMN templates (Developer, Executive, Data Science, DevOps, Cyber, Product):
      - Left sidebar (30-40% width): Contact, Skills, Languages, Certifications
      - Right main area (60-70% width): Summary, Experience, Education, Projects

   c. CREATIVE templates (Creative, Marketing, Designer, Portfolio, Startup, Infographic):
      - Unique layouts with accent colors, icons, visual elements
      - More visual formatting

4. Section Renderers (shared across templates):
   - ContactHeader: Name, title, contact info row
   - SummarySection: Paragraph text
   - ExperienceSection: Timeline with company/role/dates/bullets
   - EducationSection: Institution/degree/dates
   - SkillsSection: Tag pills or bars
   - CertificationsSection, AwardsSection, ProjectsSection, etc.

5. PDF Generation:
   - Use `pdf` package to generate PDF documents
   - Map each template to pdf widgets (pdf.Widget tree)
   - Support A4 and Letter page formats
   - Handle multi-page with proper page breaks

For the preview (screen rendering), use standard Flutter widgets.
For PDF export, use the pdf package's widget system.

Start with 5 fully implemented templates (Modern, Classic, Developer, Creative, Minimal), then create the remaining 25 as variations.

Deliver: All 30 templates renderable in preview and exportable as PDF.
```

---

### PROMPT 15/55 — Onboarding Wizard

```
Build the Onboarding Wizard Page (/onboarding).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.17 + 18.18.

WIDGET TREE (full-screen, no AppShell):
1. PageView with 4 steps + SmoothPageIndicator dots at bottom

2. Step 1 — Welcome:
   - Centered gradient icon or illustration
   - "Welcome to WiseResume!" (displayMedium)
   - "Build professional resumes with AI" (bodyMedium, muted, center, maxWidth: 280)
   - GradientButton "Get Started"

3. Step 2 — Name & Job Title:
   - "What's your name?" heading
   - Full name TextFormField
   - Job title TextFormField
   - "Continue" button

4. Step 3 — Career Level:
   - "What's your career level?" heading
   - RadioListTile options: Entry Level, Mid-Level, Senior, Executive
   - Selected = primary ring

5. Step 4 — Choose Template:
   - "Choose a Template" heading
   - GridView(crossAxisCount: 3) of template mini-previews
   - Selected has Border.all(primary, 2)
   - "Start Building →" GradientButton → navigate to /editor

LOGIC:
- Save name/jobTitle to profile via profileProvider
- Save career level to profile
- Mark onboarding_completed = true in profiles table
- Set selected template in resumeProvider

Show only for users with onboarding_completed = false (redirect from /dashboard).
```

---

### PROMPT 16/55 — Profile Editor

```
Build the Profile Editor Page (/profile).

Reference: APP_BLUEPRINT_FLUTTER.md Section 18.13 (profile editor section).

WIDGET TREE:
1. AppBar: Back arrow + "Edit Profile"

2. Avatar Section:
   - Center: CircleAvatar(radius: 40)
   - Positioned camera icon overlay button
   - Tap → image_picker (gallery or camera) → upload to Supabase Storage → update avatar_url

3. Form Fields (Column of TextFormField):
   - Full Name
   - Job Title
   - Industry (DropdownButtonFormField)
   - Career Level (DropdownButtonFormField: Entry, Mid, Senior, Executive)
   - Location
   - LinkedIn URL
   - GitHub URL
   - Website URL
   - Twitter URL
   - Contact Email
   - Phone Number

4. "Save Changes" GradientButton at bottom

DATA: Load from profileProvider, save to profiles table via Supabase
VALIDATION: Email format, URL format validation

SKELETON: ProfileSkeleton with shimmer form fields.
```

---

### PROMPT 17/55 — Settings Page

```
Build the Settings Page (/settings).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.12 + 18.13.

WIDGET TREE:
1. AppBar: Back arrow + "Settings"

2. Section Category Chips: Horizontal ListView of ChoiceChip:
   👤 Account | 🎨 Appearance | 🤖 AI | ✏️ Editor | 🔔 Notifications | 🔒 Privacy | ℹ️ About
   Active = primary filled. Scroll to section on tap.

3. Profile Card: GlassCard with:
   - CircleAvatar(radius: 32) with progress ring overlay (CircularProgressIndicator showing profile completion %)
   - Name, email text
   - Tap → /profile

4. Settings Sections (each a Column of SettingsRow widgets):

   🔐 Account:
   - Edit Profile → /profile (chevron)
   - Change Email → dialog (chevron)
   - Biometric Lock → Switch toggle
   - Delete Account → destructive dialog

   🎨 Appearance:
   - Theme: "Dark" → SegmentedButton (Light/Dark/System)
   - Reduced Motion → Switch toggle

   🤖 AI & Voice:
   - AI Provider → dropdown or dialog
   - API Key management → dialog
   - Usage display ("12/20 credits")

   ✏️ Editor:
   - Default Template → template picker
   - PDF Defaults → PDFOptions dialog
   - Auto-save → Switch toggle

   🔔 Notifications:
   - Push Notifications → Switch
   - Tip Frequency → dropdown
   - Quiet Hours → time range picker

   🔒 Privacy:
   - Shake to Report → Switch
   - Local-only Mode → Switch
   - Export Data → button
   - Clear Local Data → destructive button

   ℹ️ About:
   - Version (from package_info_plus)
   - Privacy Policy → /privacy
   - Terms of Service → /terms
   - DeveloperCreditCard (animated gradient holographic card)

5. Sign Out: SettingsRow with destructive red text, confirmation dialog

SettingsRow Widget (reusable):
- InkWell, padding: EdgeInsets.symmetric(vertical: 14, horizontal: 16)
- minHeight: 56
- Leading: icon in Container(w:32, h:32, borderRadius:8, color)
- Title + optional description
- Trailing: chevron / Switch / value text

DATA: Read/write via settingsProvider, save to user_preferences table

SKELETON: SettingsSkeleton.
```

---

## Phase 3: AI Features (Prompts 18–27)

---

### PROMPT 18/55 — AI Service Layer

```
Build the client-side AI service layer for calling Supabase Edge Functions.

NOTE: The Edge Functions themselves already exist (same Supabase project as the web app). We only need the Flutter client-side service to call them.

Reference: APP_BLUEPRINT_FLUTTER.md Section 12 + 13.

1. AIService (lib/core/services/ai_service.dart):
   - Generic method for invoking edge functions:
     Future<Map<String, dynamic>> invokeAI(String functionName, Map<String, dynamic> body)
   - Auth token refresh before each call
   - Error handling: parse error responses, throw typed errors for rate limits (429), credit exhaustion (402), invalid keys (401)
   - Specific methods:
     analyzeResume(), tailorResume(), enhanceSection(), scoreResume(), proofreadResume(),
     generateCoverLetter(), generateResignationLetter(), interviewChat(),
     careerAssessment(), careerPathAdvisor(), companyBriefing(),
     detectAndHumanize(), optimizeForLinkedin(), onePageOptimizer(),
     agenticChat(), fillGap(), explainGap(), generatePortfolioBio(), askPortfolio()

2. AI Credits Provider (lib/shared/providers/ai_credits_provider.dart):
   - Fetch current daily usage from ai_credits table
   - Display remaining credits
   - Auto-refresh after AI actions
   - checkCreditsAvailable() → bool

3. AI Error Handler:
   - Parse edge function error responses
   - Show SnackBar for common errors (rate limit, credits, network)
   - "Upgrade" CTA for free users near limit

4. Calling pattern:
```dart
final response = await Supabase.instance.client.functions.invoke(
  'analyze-resume',
  body: {'resume': resume.toJson(), 'jobDescription': jobDesc},
);
if (response.status != 200) {
  throw AIServiceException.fromResponse(response);
}
return response.data as Map<String, dynamic>;
```

Deliver: Complete AI service layer ready to be used by all AI feature pages.
```

---

### PROMPT 19/55 — AI Studio Page

```
Build the AI Studio Page (/ai-studio).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.7 + 18.8.

WIDGET TREE:
1. AppBar: Back arrow + "AI Studio"

2. AIEngineBadge: Chip widget showing current AI provider name

3. AICreditsIndicator: "12/20 credits today" — color coded (green >50%, yellow 25-50%, red <25%)

4. Resume Context Card: GlassSurface showing currently selected resume title. If no resume selected, prompt to select one.

5. Wise AI Chat Card: GlassCard at top:
   - CircleAvatar with gradient (primary → accent), Sparkles icon
   - "How can I help with your resume?" text
   - Wrap of ActionChip suggestion chips: "Improve summary", "Fix gaps", "ATS tips"

6. Tool Grid: GridView.count(crossAxisCount: 2) grouped by category:

   ✍️ Writing Tools: Tailor, Enhance, Summary Writer, Proofread
   📊 Analysis: ATS Scan, Score Resume, Detect & Humanize
   🎯 Career: Career Path, Career Assessment, Company Briefing
   📄 Documents: Cover Letter, Resignation Letter
   🎤 Interview: Mock Interview, Recruiter Simulation
   🔗 Optimization: LinkedIn Optimizer, One-Page Optimizer
   💬 Advanced: Agentic Chat, Fill Gap, Explain Gap, Portfolio Bio

   Each card: Container(borderRadius:16, border, color: card.withOpacity(0.6)):
   - CircleAvatar(radius:20, borderRadius:10) with colored background + icon
   - Title (fontWeight: w500)
   - Description (text-xs, muted)
   - Optional "Featured" badge (Positioned)

   Tap → showModalBottomSheet for that tool (most sheets built in later prompts, create placeholders for now)

7. Recent Tools Row: Horizontal ListView of recently used tool chips

8. Chat Input: Container(borderRadius:16) with TextField "Ask Wise AI..." + send IconButton

SKELETON: AIStudioSkeleton with shimmer grid.
```

---

### PROMPT 20/55 — Resume Analysis + Scoring

```
Build resume analysis and scoring features (client-side only — edge functions already exist).

COMPONENTS:

1. AnalyzeJobSheet (showModalBottomSheet from Dashboard):
   - TextFormField for pasting job description OR URL
   - "Analyze" GradientButton
   - Loading state with progress animation
   - Results view:
     - ScoreRing (large, 80px) showing overallScore
     - Category bars: skillsMatch, experienceRelevance, keywordAlignment, atsCompatibility (LinearProgressIndicator)
     - Strengths list (green check icons)
     - Improvements list (orange warning icons)
     - Gap Analysis section: missing keywords, missing skills

2. ATSScanSheet (from Editor toolbar):
   - ScoreRing with ATS score
   - Category breakdown
   - Improvement suggestions
   - "Re-scan" button

3. useResumeScore pattern:
   - Provider that fetches/caches ATS score for current resume
   - Auto-refresh when resume changes

4. Dashboard integration:
   - Score badges on ResumeListCard (ScoreRing widget)
   - Score trend chart (fl_chart LineChart) using atsScoreHistoryProvider

CALLS: AIService.analyzeResume(), AIService.scoreResume()
```

---

### PROMPT 21/55 — Resume Tailoring

```
Build the AI resume tailoring feature.

COMPONENTS:

1. TailorSheet (showModalBottomSheet, large — isScrollControlled: true):
   Multi-step flow:

   Step 1 — Input:
   - TextFormField for job description (multiline)
   - OR "Paste URL" option → calls parse-job-url edge function
   - Job title input
   - Company input (optional)
   - "Tailor My Resume ✨" GradientButton

   Step 2 — Processing:
   - Animated progress indicator
   - Step labels: "Analyzing requirements...", "Matching experience...", "Rewriting sections...", etc.
   - Fun fact text that cycles

   Step 3 — Results:
   - Score improvement: Before → After bar (animated)
   - Job Intelligence card (experience level, salary range, work mode)
   - Section-by-section changes with diff highlighting:
     - Summary: original vs enhanced
     - Skills: added/removed chips
     - Experience: bullet transformations
   - "Apply" button per section OR "Apply All"
   - Interview talking points card
   - Save to tailor_history

2. TailorHistorySheet:
   - List of past tailoring results (from tailor_history table)
   - Each entry: job title, company, score before/after, date
   - Tap → view full result, "Restore" button

CALLS: AIService.tailorResume()
DATA: Save to tailor_history table, update resumeProvider

INTEGRATION: Wire into AI Studio "Tailor" card, Dashboard "Tailor" quick action, Editor toolbar.
```

---

### PROMPT 22/55 — Section Enhancement + Proofreading

```
Build AI section enhancement and proofreading features.

COMPONENTS:

1. InlineAIButton: Small IconButton(Icons.auto_awesome, size: 16) placed next to editable fields in the editor. Tap → call enhanceSection for that field.

2. AIFloatingButton: FloatingActionButton(mini: true) at bottom-right of section card in editor. Gradient background, sparkle icon. Tap → enhance entire section.

3. AIAssistantBar: Inline suggestion bar showing AI improvement tip. Appear/dismiss with animation.

4. AIContextualNudge: Context-aware tips (e.g., "Add metrics to strengthen this bullet")

5. Section Enhancement Flow:
   - User taps InlineAIButton or AIFloatingButton
   - Show loading shimmer on the field
   - Call AIService.enhanceSection(sectionId, content, resumeContext, jobDescription)
   - Show before/after diff
   - Accept/Reject buttons

6. ProofreadSheet (from Editor toolbar):
   - Call AIService.proofreadResume(resume)
   - Display issues categorized by severity (error/warning/info)
   - Each issue: section badge, original text, suggestion, type (grammar/style/clarity/consistency)
   - Accept (apply fix) / Reject buttons per issue
   - "Accept All" button

7. DetectHumanizeSheet:
   - TextFormField showing selected text
   - "Check AI Score" button → AIService.detectAndHumanize()
   - AI score display (gauge or percentage)
   - "Humanize" button → replaces with humanized version
   - Changes list

CALLS: AIService.enhanceSection(), .proofreadResume(), .detectAndHumanize()
```

---

### PROMPT 23/55 — Cover Letter Generation + CRUD

```
Build cover letter feature.

PAGES:

1. CoverLettersPage (/cover-letters):
   - ListView of CoverLetterCard widgets
   - Each card: title (bold), company, job title, preview snippet, date, PopupMenuButton (edit, duplicate, delete, export)
   - Empty state: EmptyState widget with gradient FileText icon + "Create Cover Letter" CTA
   - FAB or AppBar action button → /cover-letter/new

2. CoverLetterNewPage (/cover-letter/new):
   - Job title TextFormField
   - Company TextFormField
   - Tone selector: Wrap of ChoiceChip (Professional, Friendly, Enthusiastic, Formal)
   - Template style selector: Similar ChoiceChip
   - Resume selector: DropdownButtonFormField (pick which resume)
   - "Generate with AI ✨" GradientButton → AIService.generateCoverLetter()
   - Content area: TextFormField(maxLines: null) for manual editing
   - Bottom: Row of GradientButton("Save") + OutlinedButton("Export")

3. CoverLetterEditPage (/cover-letter/edit/:id):
   - Load existing cover letter by ID
   - Same form as new page, pre-filled
   - "Update" button

DATA: cover_letters table via Supabase
PROVIDER: coverLettersProvider (FutureProvider with CRUD methods)

SKELETON: CoverLettersSkeleton.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.13 + 18.14.
```

---

### PROMPT 24/55 — Resignation Letter Generation + CRUD

```
Build resignation letter feature.

PAGES (similar structure to Cover Letters):

1. ResignationLettersPage (/resignation-letters):
   - ListView of resignation letter cards
   - Empty state with CTA

2. ResignationLetterNewPage (/resignation-letter/new):
   - Company TextFormField
   - Position TextFormField
   - Recipient name TextFormField
   - Last working day: DatePicker
   - Notice period: DropdownButtonFormField (2 weeks, 1 month, 3 months, custom)
   - Reason: DropdownButtonFormField (new opportunity, relocation, personal, career change)
   - Tone: ChoiceChip (Professional, Friendly, Grateful, Formal)
   - "Generate with AI ✨" GradientButton
   - Content TextFormField
   - ResignationChecklist: Column of CheckboxListTile with progress LinearProgressIndicator
     Items: Review contract, Set last working day, Prepare handover docs, Schedule exit meeting, Return company property, Update benefits
   - Save + Export buttons

3. ResignationLetterEditPage (/resignation-letter/edit/:id): Pre-filled form

DATA: resignation_letters table
PROVIDER: resignationLettersProvider

SKELETON: ResignationLettersSkeleton.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.14 + 18.15.
```

---

### PROMPT 25/55 — Mock Interview (Voice + STT)

```
Build the Mock Interview feature with voice support.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.8 + 18.9.

PAGE (/interview):

1. InterviewSetup:
   - Mode selection cards (InkWell + GlassCard):
     🧠 Behavioral — "STAR method questions"
     💻 Technical — "Coding and system design"
     📊 Case Study — "Business problem solving"
     🎯 Mixed — "Combination of all types"
   - Job title TextFormField (optional)
   - Job description TextFormField (optional, multiline)
   - "Start Interview" GradientButton

2. Voice Conversation UI:
   - TranscriptBubble widgets:
     AI messages: Align.centerLeft, Container(color: muted, borderRadius: 16)
     User messages: Align.centerRight, Container(color: primary, borderRadius: 16)
   - ListView.builder for message history
   - Audio waveform: CustomPaint with animated vertical bars
   - Timer display: "03:24" in AppBar actions
   - Controls:
     Center: FloatingActionButton(radius: 28, gradient) — mic icon (start/stop recording)
     Right: IconButton(Icons.stop, destructive color) — end interview

3. Speech-to-Text:
   - Primary: speech_to_text package
   - Listen for speech → display real-time transcript
   - On speech end → send to AIService.interviewChat()
   - AI response → display as TranscriptBubble

4. InterviewSummary (after interview ends):
   - ScoreRing (80px) with overall score
   - Category scores: Communication, Technical, Problem Solving, Behavioral (LinearProgressIndicator)
   - Strengths list (green check icons)
   - Improvements list (orange arrow-up icons)
   - "Save Results" button → interview_sessions table

5. InterviewHistorySheet: List of past sessions with scores

6. CompanyBriefingSheet: Research company before interview (AIService.companyBriefing())

PROVIDERS: interviewProvider (StateNotifier for session state), interviewHistoryProvider
DATA: interview_sessions table

SKELETON: InterviewSkeleton.
```

---

### PROMPT 26/55 — Career Path + Quiz

```
Build the Career Path feature.

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.15 + 18.16.

PAGE (/career):

1. CareerQuizSheet (showModalBottomSheet, multi-step):
   - PageView with SmoothPageIndicator (5 steps)
   - Questions about skills, interests, values, experience level
   - RadioListTile for single-select, Wrap of FilterChip for multi-select
   - "Next →" / "← Back" navigation
   - Final step: "Get Results" → AIService.careerAssessment()
   - Results saved to career_assessments table

2. CareerRoadmap:
   - Vertical timeline (CustomPaint with vertical line + nodes):
     ● Current: [current job title] — highlighted, primary color
     ◎ Next: [suggested role 1] — semi-highlighted
     ○ Future: [suggested role 2]
     ○ Future: [suggested role 3]
   - Each node: role title, required skills (Wrap of Chip), timeline estimate
   - Data from AIService.careerPathAdvisor()

3. SkillGapAnalyzer:
   - Two-column layout: "Your Skills" vs "Required"
   - ✅ Match, ⚠️ Partial, ❌ Missing
   - Progress bars for skill proficiency

PROVIDERS: careerAssessmentProvider
DATA: career_assessments table
```

---

### PROMPT 27/55 — Agentic Chat + Gap Tools

```
Build remaining AI tools.

COMPONENTS:

1. AgenticChatSheet (showModalBottomSheet, full height):
   - Message list: ListView.builder with TranscriptBubble (reuse from Interview)
   - Input: TextField with send IconButton
   - Suggestion chips above input
   - Context: current resume data passed to AIService.agenticChat()
   - Accessible from: Editor toolbar, AI Studio "Agentic Chat" card

2. GapFiller (inside ExperienceSection in Editor):
   - Detect timeline gaps between experience entries (>3 months)
   - Show "Fill Gap" chip between entries
   - Tap → AIService.fillGap(gapStart, gapEnd, context)
   - Result: Suggestion card with type (freelance/education/personal/volunteer) and text
   - "Add to Resume" button

3. GapExplainer:
   - Similar to GapFiller but generates professional explanation
   - AIService.explainGap(gapStart, gapEnd, reason)
   - "Use this explanation" button

4. Wire all tools into AI Studio grid:
   - Each tool card in AI Studio opens the appropriate sheet
   - Update recent tools list after use
```

---

## Phase 4: Job Tracking (Prompts 28–31)

---

### PROMPT 28/55 — Applications Page

```
Build the Applications / Job Tracker Page (/applications).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.9 + 18.10.

WIDGET TREE:
1. AppBar: "Applications"

2. TabBar + TabBarView: [Applications] [Jobs]

3. StatusFilter: Horizontal ListView of FilterChip:
   All (count), Applied, Interviewing, Offered, Rejected, Saved
   Active = primary filled, each shows count badge
   Status badge colors:
   - Offered: success.withOpacity(0.1) + success text
   - Interviewing: primary.withOpacity(0.1) + primary text
   - Rejected: error.withOpacity(0.1) + error text
   - Applied: muted bg + muted text

4. ApplicationCard (for each application):
   GlassCard(borderRadius: 16):
   - Company name (bold), job title
   - Status badge (Container with colored bg + text)
   - Applied date, deadline indicator
   - PopupMenuButton: Update Status, Notes, Delete

5. JobActivityStats: GlassCard with "12 total | 3 this week | 8% response"

6. ActivityStreak: Row with flame icon + "3-day streak" text

7. ActivityTimeline: CustomPaint vertical line with dot nodes + event text

8. AddApplicationSheet: showModalBottomSheet with form:
   Job title, company, status dropdown, URL, notes, deadline DatePicker, resume selector, cover letter selector
   "Save" GradientButton

9. SaveJobSheet: Quick save a job listing

DATA: job_applications + jobs tables
PROVIDERS: jobApplicationsProvider, jobsProvider
SKELETON: ApplicationsSkeleton.
```

---

### PROMPT 29/55 — Application Detail + Job Detail Pages

```
Build detail pages.

1. ApplicationTrackerPage (/application/:id):
   - Load application by ID
   - Status timeline: vertical line showing status changes over time
   - Status update: DropdownButtonFormField
   - Notes: TextFormField (multiline, auto-save)
   - Linked resume preview (if resume_id set) — thumbnail + "View" button
   - Linked cover letter (if cover_letter_id set)
   - Deadline countdown: "5 days until deadline" with color coding
   - Reminder: DatePicker for remind_at
   - "Delete Application" TextButton (destructive)

2. JobDetailPage (/job/:id):
   - Load job by ID
   - Company header: Container(w:48, h:48, borderRadius:12) placeholder + company name + job title
   - Info pills: Row of Chip widgets (location, job type, salary)
   - TabBar: Description | Requirements | Company
   - Content text area
   - Bottom: GradientButton("Apply") → create job_application
   - OutlinedButton("Save") → toggle is_saved
   - TextButton("Tailor Resume") → open TailorSheet with this job's description

SKELETON: DetailSkeleton for both pages.
```

---

### PROMPT 30/55 — Job Parsing Integration

```
Build job parsing integration (client-side — edge functions already exist).

1. Parse Job URL:
   - Used in TailorSheet, AddApplicationSheet
   - User pastes URL → call AIService to invoke 'parse-job-url' edge function
   - Returns: title, company, location, description, requirements, salaryRange, jobType
   - Auto-fill form fields with parsed data

2. Parse Job Text:
   - User pastes job description text → call 'parse-job-text' edge function
   - Returns same structure
   - Used in AnalyzeJobSheet, TailorSheet

3. Integration points:
   - TailorSheet: "Paste URL" option at top → parse → auto-fill job description
   - AddApplicationSheet: "Import from URL" → parse → auto-fill fields
   - AnalyzeJobSheet: Both URL and text parsing options
```

---

### PROMPT 31/55 — Notifications Page

```
Build the Notifications Page (/notifications).

Reference: APP_BLUEPRINT_FLUTTER.md Section 18 (Stitch Prompt 12).

WIDGET TREE:
1. AppBar: Back arrow + "Notifications" + "Mark all read" TextButton

2. Notification list: ListView.builder with notification cards:
   Each card: GlassCard(borderRadius: 12):
   - Leading: CircleAvatar with type-specific icon (bell, briefcase, star)
   - Title (bold), message (muted), timestamp
   - Unread indicator: Container(w:8, h:8, borderRadius:4, color: primary) — shown if !is_read
   - Dismissible (swipe to delete)

3. Empty state: EmptyState widget with bell icon, "No notifications", "You're all caught up!"

DATA: notifications table via notificationsProvider
- Mark read: update is_read = true
- Mark all read: batch update
- Delete: remove from table

SKELETON: NotificationsSkeleton.
```

---

## Phase 5: Portfolio (Prompts 32–36)

---

### PROMPT 32/55 — Portfolio Editor Page

```
Build the Portfolio Editor Page (/portfolio).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.10 + 18.11.

WIDGET TREE:
1. AppBar: Back arrow + "Portfolio"

2. Enable toggle: Row with "Enable Portfolio" Text + Switch widget
   Saves to profiles.portfolio_enabled

3. Username picker: Row with "/p/" prefix Text + TextFormField
   Real-time availability check via check_username_available RPC
   Show ✓ available / ✗ taken status

4. Theme selection: Horizontal ListView of CircleAvatar(radius:16) color circles
   Themes: midnight, ocean, forest, sunset, lavender (define colors)
   Active = Border.all(primary, 2)

5. Section arrangement: ReorderableListView.builder:
   Each item: Row with grip handle (Icons.drag_handle) + section name Text + Checkbox
   Sections: About, Experience, Education, Skills, Projects, Contact

6. Accent color picker: Horizontal color circles

7. Font selector: DropdownButtonFormField

8. Layout options: SegmentedButton (Single / Split)

9. SEO settings: Meta title + meta description TextFormFields

10. Resume selector: DropdownButtonFormField to pick which resume

11. Bio editor: TextFormField(maxLines: 4) + "Generate with AI ✨" TextButton

12. QR Code card: GlassCard with QrImageView (qr_flutter, size: 120) + "Copy Link" + "Share" buttons

13. Short link manager section

14. Preview button: OutlinedButton("Preview") → launch /p/username via url_launcher

15. Analytics mini stats: Row with eye icon "142 views", person icon "89 visitors"

DATA: Save all to profiles table (portfolio_* columns)
```

---

### PROMPT 33/55 — Public Portfolio Page

```
Build the Public Portfolio Page (/p/:username).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.11 + 18.12.

This is a STANDALONE page — no AppShell, no auth required, no BottomTabBar.

WIDGET TREE:
1. Theme: Apply portfolio theme colors from profile settings

2. Profile header:
   - CircleAvatar(radius: 48, border: Border.all(accent, 4))
   - Name (displayMedium)
   - Job title (bodyMedium, muted)
   - Social icons: Row of IconButton (LinkedIn, GitHub, Twitter, Website) → url_launcher

3. Bio section: Container with left accent border (Border(left: BorderSide(width: 2, color: accent))) + bio text

4. Sections (rendered based on portfolio_sections order):
   - Experience timeline: company/role/dates/bullets
   - Education: institution/degree
   - Skills: Wrap of Chip widgets
   - Projects: cards with name/description/tech/links
   - Contact section

5. "Ask AI ✨" FloatingActionButton:
   - Positioned(bottom: 16, right: 16)
   - Gradient Container, sparkle icon
   - Tap → showModalBottomSheet with chat UI
   - Visitors can ask questions (AIService.askPortfolio)
   - Max 5 questions per session (client-side counter)

6. Footer: "Built with WiseResume" labelSmall, muted, center

DATA: Fetch via get_public_portfolio RPC
- On load: increment_portfolio_views RPC
- Track visit: record_portfolio_visit RPC

SEO NOTE: For native app, SEO is less critical. But ensure the page is self-contained and visually complete.
```

---

### PROMPT 34/55 — QR Codes + Short Links

```
Build QR code generation and short link management.

1. QR CODE GENERATION:
   - Use qr_flutter package
   - QrImageView(data: 'https://yourapp.com/p/username', size: 120)
   - Display in portfolio editor
   - "Save QR" button: Render QrImageView to image → save via path_provider + share_plus

2. SHORT LINKS:
   - Create branded short URLs (/l/linkId)
   - ShortLinkPage (/l/:linkId): Call resolve_short_link RPC → navigate to target URL
   - In portfolio editor: "Create Short Link" → generate custom ID, save to short_links table
   - Short link manager: ListView of existing links with label, click count, copy/delete

3. PORTFOLIO EDITOR INTEGRATION:
   - QR code card (already built in Prompt 32, wire up qr_flutter)
   - Short link section below QR code
   - "Copy Link" → Clipboard.setData + SnackBar toast
   - "Share" → share_plus native sheet
```

---

### PROMPT 35/55 — Portfolio Analytics

```
Build portfolio analytics.

COMPONENTS (inside Portfolio Editor or separate section):

1. VisitorsPanel:
   - Total views count
   - Unique visitors (from portfolio_visits)
   - Geographic distribution (country/city) — simple list
   - Referrer sources (direct, social, other)
   - Section engagement (which sections viewed most)
   - Average time spent

2. Analytics Charts (fl_chart):
   - Views over time: LineChart with primary color line, muted grid
   - Section engagement: BarChart showing which sections are most viewed
   - Geographic: Horizontal BarChart by country

DATA: Use get_portfolio_analytics RPC + portfolioAnalyticsProvider
```

---

### PROMPT 36/55 — Portfolio AI Features

```
Build portfolio AI features.

1. Generate Bio:
   - "Generate with AI ✨" button in portfolio editor bio section
   - Call AIService (invoke 'generate-portfolio-bio')
   - Loading state on button
   - Result fills bio TextFormField
   - User can edit before saving

2. AskAIWidget (on public portfolio):
   - FloatingActionButton (already positioned in Prompt 33)
   - Chat sheet (showModalBottomSheet):
     - Message list (TranscriptBubble reuse)
     - Input TextField + send button
     - "Ask anything about [Name]" placeholder
     - Call AIService (invoke 'ask-portfolio' with portfolio data as context)
     - Client-side limit: 5 questions per session
     - After limit: "Start a new session to ask more" message
```

---

## Phase 6: Sharing & Documents (Prompts 37–40)

---

### PROMPT 37/55 — Resume Sharing

```
Build the resume sharing system.

1. SHARE CREATION (from Editor's ShareSheet — enhance from Prompt 10):
   - "Create Share Link" GradientButton
   - Optional password: TextFormField (hash via hash_share_password RPC)
   - Optional expiry: DatePicker for expires_at
   - Generate unique token, save to resume_shares table
   - Copy link: Clipboard.setData(ClipboardData(text: shareUrl)) + SnackBar
   - Share: share_plus native sheet
   - List existing shares below with view counts

2. SharePage (/share/:token) — Standalone (no AppShell):
   - Call get_shared_resume RPC with token
   - If password required → show password TextFormField + "Unlock" button
   - Verify via verify_share_password
   - If expired → show "Link expired" Container with icon + message
   - If valid → render resume preview (TemplateRenderer from Prompt 14)
   - Increment view count (increment_share_view_count RPC)
   - Comments section below (Prompt 38)

DATA: resume_shares table
PROVIDER: resumeSharesProvider
```

---

### PROMPT 38/55 — Share Comments

```
Build share comments feature.

1. ON SharePage (/share/:token) — below resume preview:
   - "Leave Feedback" section header
   - Comment form: author name TextFormField + content TextFormField + optional section DropdownButton
   - "Submit" button → add_share_comment RPC
   - Comments list: ListView of comment cards (author, content, section badge, timestamp)

2. IN EDITOR (ShareFeedbackSheet):
   - showModalBottomSheet showing all comments from all shares of this resume
   - Fetch via get_share_comments RPC for each share
   - Each comment: author, content, section badge, timestamp
   - Resolve/unresolve toggle: Checkbox → update is_resolved
   - Delete comment (share owner only)
```

---

### PROMPT 39/55 — Resume Versions

```
Build resume version history.

1. VERSION CREATION:
   - Auto-create snapshot before:
     - Applying AI tailor results (in TailorSheet)
     - Importing over existing resume (in Upload)
   - Manual: "Save Version" button in Editor AppBar or toolbar
   - Data: Full resume as JSONB snapshot in resume_versions table
   - Auto-increment version_number

2. VersionHistorySheet (from Editor toolbar):
   - ListView of version entries sorted by date desc
   - Each entry: "Version [N]", date, change_summary (if provided)
   - "Preview" button → show snapshot in dialog
   - "Restore" button → replace currentResume with snapshot, confirm dialog
   - "Delete" → remove version
   - Max 50 versions per resume

DATA: resume_versions table
PROVIDER: resumeVersionsProvider
```

---

### PROMPT 40/55 — PDF + DOCX Export

```
Build the document export system.

1. PDF EXPORT (using pdf + printing packages):
   - Use the template rendering system from Prompt 14
   - Generate pdf.Document from ResumeData + TemplateCustomization
   - Support: A4, Letter page formats
   - Multi-page with proper page breaks
   - Page numbers: simple ("1") or full ("Page 1 of 2") based on PDFOptions
   - Optional branding footer: "Built with WiseResume"
   - ATS-optimized variant: Simpler layout, no graphics
   - Save: path_provider for local file + printing for print/share dialog

2. DOCX EXPORT (using docx_template or custom):
   - Convert ResumeData to structured Word document
   - Proper headings, bullet lists, formatting
   - Template-agnostic (content-focused)
   - Save locally + share via share_plus

3. PLAIN TEXT EXPORT:
   - Simple text format for copy-paste
   - Clipboard.setData() + SnackBar toast

4. LINKEDIN EXPORT:
   - Formatted for LinkedIn profile sections
   - Copy to clipboard

5. EXPORT FLOW (in ExportOptionsSheet from Prompt 10):
   - User selects format from list
   - Show CircularProgressIndicator during generation
   - On complete: Show success + open share/save dialog
   - Error handling with retry option

ExportService: lib/core/services/export_service.dart
```

---

## Phase 7: Advanced Features (Prompts 41–47)

---

### PROMPT 41/55 — Help & FAQ Page

```
Build the Help & FAQ Page (/help).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.19.

WIDGET TREE:
1. AppBar: Back arrow + "Help & Support"

2. Search: TextFormField with prefixIcon(Icons.search). Filters FAQ items in real-time.

3. FAQ Sections: SliverList with ExpansionTile for each FAQ item:
   Categories: Getting Started, Resume Editor, AI Features, Account & Billing, Portfolio, Troubleshooting
   Each item: title (bold) + expandable answer (bodyMedium, muted)
   Hardcode 20-30 FAQ items covering all major features.

4. Contact Support: GlassCard with:
   - ListTile("Email Support") → url_launcher mailto
   - ListTile("Submit Feedback") → FeatureRequestSheet

5. Video Tutorials: GlassCard with ListTile per tutorial → url_launcher

6. Quick Links: Wrap of ActionChip → /guides, /examples, /career

Accessible from Settings page as a navigation row.
```

---

### PROMPT 42/55 — Analytics / Insights Page

```
Build the Analytics / Insights Page (/analytics).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.20.

WIDGET TREE:
1. AppBar: Back arrow + "Analytics & Insights"

2. Time Period Toggle: SegmentedButton (Weekly | Monthly | All Time)

3. Resume Performance: GlassCard with LineChart (fl_chart):
   - ATS score trend over time
   - Primary color line, muted grid

4. Application Funnel: GlassCard with horizontal BarChart:
   Applied → Interview → Offer counts

5. Key Metrics: Row of stat cards:
   Total resumes, average ATS score, applications submitted, interviews scheduled

6. ATS Score Distribution: GlassCard with BarChart:
   Score buckets across all resumes

7. Activity: ActivityStreak widget (reuse from Dashboard)

8. Export: OutlinedButton("Export Report") → generate summary → share_plus

DATA: Aggregate from resumes, job_applications, ai_usage_logs tables
Some charts may use mock/cached data initially.
```

---

### PROMPT 43/55 — Subscription / Pricing Page

```
Build the Subscription / Pricing Page (/subscription).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.21.

WIDGET TREE:
1. AppBar: Back arrow + "Subscription"

2. Current Plan Card: GlassCard with gradient border:
   - Plan name + badge
   - Renewal date (placeholder)
   - Usage meters: LinearProgressIndicator for AI credits, resumes, tailors

3. Plan Cards: PageView or Column of plan cards:
   a. Free (current): Muted outline, "Current Plan" badge
      Features: 3 resumes, 20 AI credits/day, 5 templates, basic export
   b. Pro ($9.99/mo): Primary border glow, "Most Popular" Positioned badge, GradientButton CTA
      Features: Unlimited resumes, 100 AI/day, all templates, DOCX, portfolio
   c. Premium ($19.99/mo): Accent border glow
      Features: Everything + unlimited AI, priority support, custom domain

4. Feature Comparison: DataTable or custom layout comparing all tiers

5. Billing FAQ: ExpansionTile items

NOTE: This is UI-only for now. Actual payment integration comes in Prompt 52.
Link: "Invite Friends for Rewards" TextButton → /referral
```

---

### PROMPT 44/55 — Referral Page

```
Build the Referral / Invite Friends Page (/referral).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.22.

WIDGET TREE:
1. AppBar: Back arrow + "Invite Friends"

2. Invite Code Card: GlassCard:
   - "Your Invite Code" label
   - Large code text (derived from user ID substring)
   - Row: IconButton(copy) → Clipboard + SnackBar, ElevatedButton("Share") → share_plus

3. QR Code: Center(QrImageView(data: referralLink, size: 160))

4. Referral Stats: Row of stat cards:
   "Invites Sent", "Accepted", "Rewards Earned"

5. Rewards Tiers: Column of tier rows:
   "3 friends → 1 month Pro"
   "5 friends → 3 months Pro"
   "10 friends → 1 year Premium"

NOTE: UI-only, no backend referral tracking. Code derived client-side.
```

---

### PROMPT 45/55 — Achievements / Badges Page

```
Build the Achievements / Badges Page (/achievements).

Reference: APP_BLUEPRINT_FLUTTER.md Section 7.23.

WIDGET TREE:
1. AppBar: Back arrow + "Achievements"

2. Level Progress: GlassCard with:
   - CircularProgressIndicator (XP progress)
   - "Level [N]" text
   - "[X] / [Y] XP to next level"

3. Streak: ActivityStreak widget (reuse)

4. Badge Grid: GridView.count(crossAxisCount: 3):
   Each BadgeTile:
   - Earned: Full color icon/emoji + glow BoxShadow
   - Locked: ColorFiltered(grayscale) + lock icon overlay
   - Name below, progress bar for partially complete
   - Tap → BadgeDetailSheet (description, progress, share)

5. Badge Categories (hardcoded definitions):
   - Resume Master: Created first resume, Exported 5 PDFs, Scored 90+ ATS, etc.
   - AI Explorer: Used 5 AI tools, Generated cover letter, Mock interview, etc.
   - Career Builder: Applied to 10 jobs, Got first interview, etc.
   - Social Butterfly: Shared resume, Enabled portfolio, Got 100 views, etc.

6. Milestones: Column of milestone rows with progress bars:
   ✓ "First Resume Created"
   ✓ "5 Applications Submitted"
   ▓▓▓░░ "80+ ATS Score"

NOTE: Client-side tracking via SharedPreferences. No persistent DB yet.
```

---

### PROMPT 46/55 — Guides & Examples Pages

```
Build Guides and Examples pages.

1. GuidesPage (/guides):
   - ListView of guide cards
   - Each card: GlassCard with title, description snippet, reading time badge, category Chip
   - Categories: Resume Writing, Interview Prep, Career Growth, Job Search
   - Tap → /guides/:slug

2. GuidePage (/guides/:slug):
   - Full guide content rendered with flutter_markdown (MarkdownBody)
   - Progress tracking: track read position via guidesProvider
   - "Was this helpful?" Row: ThumbsUp / ThumbsDown buttons
   - "Related Guides" section at bottom

3. ExamplesPage (/examples):
   - Gallery of example resumes by industry
   - GridView(crossAxisCount: 2) of example cards
   - Each: template preview, industry label Chip
   - "Use as Template" button → create resume with sample data → /editor

CONTENT: Hardcode 10-15 guides (markdown strings) and 5-10 example resumes (ResumeData constants).

SKELETON: GuidesSkeleton.
```

---

### PROMPT 47/55 — Command Palette + Bug Report

```
Build utility features.

1. SEARCH OVERLAY (Custom Command Palette):
   - Triggered by a search button in Settings or Dashboard
   - Full-screen overlay with TextField at top
   - Search across: Pages, actions, resumes, AI tools
   - Results categorized: Navigation, Actions, Resumes, AI Tools
   - ListView of results with icons
   - Tap → navigate or execute action
   - AnimatedOpacity for show/hide

2. BUG REPORT DIALOG:
   - Triggered by: shake gesture (shake package), Settings menu item, error widget
   - AlertDialog with:
     - "Report a Bug" title
     - Error description TextFormField (multiline)
     - Optional context TextFormField
     - Auto-captures: route (GoRouter current), app version (package_info_plus), platform, user agent
   - Submit → insert into bug_reports table + invoke 'send-bug-report' edge function
   - Shake detection: Wire shake package listener in AppShell (configurable via settingsProvider.shakeToReportEnabled)

3. FEATURE REQUEST:
   - Simple dialog: Title + Description TextFormFields
   - Submit → feature_requests table + invoke 'send-feature-request'
   - Accessible from Help page and Settings
```

---

## Phase 8: Native Platform (Prompts 48–51)

---

### PROMPT 48/55 — Biometric Lock

```
Build biometric lock feature.

Reference: APP_BLUEPRINT_FLUTTER.md Section 15.

1. BiometricService (lib/core/services/biometric_service.dart):
   - Wrap local_auth package
   - checkAvailability() → bool (is biometric hardware available)
   - authenticate() → bool (prompt fingerprint/Face ID)
   - Get available biometric types

2. BiometricLockScreen:
   - Full-screen overlay shown when app is locked
   - App icon centered with lock icon
   - "Unlock with Biometrics" button → BiometricService.authenticate()
   - "Use Password" fallback → email/password re-auth
   - Shown after app resume if biometric_enabled && timeout exceeded

3. Settings Integration:
   - "Biometric Lock" Switch in Settings (Account section)
   - When enabled: prompt authentication to confirm
   - Timeout selector: 0s (always), 30s, 60s, 5min

4. App Lifecycle:
   - Use WidgetsBindingObserver.didChangeAppLifecycleState
   - On resumed: check if timeout exceeded → show BiometricLockScreen
   - Track last authenticated timestamp

5. Security Curtain:
   - On inactive/paused state: show blur overlay or solid color
   - Prevents screenshot in app switcher
```

---

### PROMPT 49/55 — Deep Linking

```
Build deep linking support.

1. Deep Link Configuration:
   - uni_links package for receiving links
   - Handle scheme: wiseresume://
   - Handle universal links: https://yourapp.com/p/*, https://yourapp.com/share/*

2. DeepLinkService (lib/core/services/deep_link_service.dart):
   - Listen to uni_links stream
   - Parse incoming URLs
   - Map to GoRouter paths:
     wiseresume://resume/abc → /resume/abc
     wiseresume://portfolio/johndoe → /p/johndoe
     https://yourapp.com/share/token → /share/token
     https://yourapp.com/p/username → /p/username
     https://yourapp.com/l/linkId → /l/linkId
   - Handle auth callback URLs (OAuth PKCE)

3. GoRouter Integration:
   - Configure GoRouter to handle deep links via routerConfig
   - Ensure auth redirect works with deep links (don't lose target URL)

4. Initialize in main.dart or AppShell
```

---

### PROMPT 50/55 — Offline Support + Sync Queue

```
Build offline support.

Reference: APP_BLUEPRINT_FLUTTER.md Section 16.

1. ConnectivityService (lib/core/services/connectivity_service.dart):
   - connectivity_plus StreamSubscription
   - isOnline stream
   - Connection quality estimation

2. OfflineBanner:
   - StreamBuilder on connectivity stream
   - When offline: MaterialBanner at top: "You're offline — changes will sync when you reconnect"
   - Dismissible
   - Shown in AppShell body Column

3. SlowConnectionBanner:
   - When connection quality is poor
   - Warning banner with different message

4. OfflineSyncStore (enhance from Prompt 5):
   - Queue mutations when offline: (tableName, operation, data, timestamp)
   - Store in Hive box
   - On reconnect: flush queue in order
   - Handle conflicts: SyncConflictDialog
   - Show pending count badge on Home tab

5. Background Save:
   - WidgetsBindingObserver.didChangeAppLifecycleState
   - On inactive/paused: auto-save current resume to local storage
   - Dispatch save event

6. Local persistence:
   - All Riverpod providers with Hive persistence can work offline
   - Resume data available without network
```

---

### PROMPT 51/55 — Push Notifications

```
Build push notifications (if applicable for native).

NOTE: For Flutter native app, use firebase_messaging or a custom solution.

1. Push Notification Setup:
   - firebase_messaging package (or custom via Supabase)
   - Request permission (permission_handler)
   - Get FCM token → save to push_subscriptions table (or a new fcm_tokens table)

2. NotificationService (lib/core/services/notification_service.dart):
   - Initialize firebase_messaging
   - Handle foreground messages → show local notification or SnackBar
   - Handle background messages → navigate to relevant page
   - Handle notification tap → deep link to target

3. Settings Integration:
   - "Push Notifications" Switch in Settings
   - Toggle subscription on/off
   - Quiet hours: Don't show notifications during configured hours

4. Notification Types:
   - Application deadline approaching (2 days before)
   - Resume shared and viewed
   - AI analysis complete
   - Weekly digest (if enabled)

5. Edge Functions: Use existing send-push-notification edge function.
   Update to support FCM if needed.
```

---

## Phase 9: Polish & Launch (Prompts 52–55)

---

### PROMPT 52/55 — Stripe / In-App Purchase Integration

```
Integrate payment system.

OPTION A — STRIPE (for web companion or Android):
1. Edge Functions (already exist, may need updates):
   - create-checkout-session: Create Stripe checkout URL → open in flutter_inappwebview
   - stripe-webhook: Handle payment events
   - create-portal-session: Manage subscription URL

2. Client-side:
   - Update Subscription page:
     "Subscribe" → call create-checkout-session → open URL in browser/webview
     "Manage Subscription" → call create-portal-session → open URL
   - useSubscription provider: Fetch current plan from subscriptions table

OPTION B — IN-APP PURCHASES (for App Store/Play Store):
   - in_app_purchase package
   - Define product IDs matching plan tiers
   - Purchase flow: Select plan → initiate purchase → verify receipt → update DB

ASK ME: Which payment method should we use? Stripe, in-app purchases, or both?

DATABASE: subscriptions table (if not exists):
- id, user_id, plan, status, stripe_customer_id (optional), current_period_start, current_period_end

SECRETS NEEDED: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (if Stripe)
```

---

### PROMPT 53/55 — AI Credit Enforcement

```
Enforce AI credit limits across all AI actions.

CHANGES:

1. AIService Enhancement:
   - Before every AI call: check credits via ai_credits table
   - Apply tier limits:
     Free: 20 credits/day
     Pro: 100 credits/day
     Premium: Unlimited
   - If over limit: throw CreditExhaustedException
   - If valid: proceed + increment usage (increment_ai_usage RPC)

2. Credit Exhaustion UI:
   - Catch CreditExhaustedException in all AI-calling widgets
   - Show SnackBar: "Daily AI credit limit reached"
   - Show upgrade CTA → /subscription
   - Prevent further AI actions until daily reset

3. AICreditsIndicator Enhancement:
   - Show tier-aware limits: "12/100" for Pro
   - Color: green (>50%), yellow (25-50%), red (<25%)
   - "Upgrade" TextButton for free users near limit

4. Feature Gating:
   - Free: 5 templates, basic export, 3 resumes max
   - Pro: All templates, DOCX export, portfolio, 100 AI/day
   - Premium: Everything unlimited
   - Implement gating checks throughout the app (template selection, export, portfolio toggle, etc.)
```

---

### PROMPT 54/55 — Platform-Specific Optimizations

```
Optimize for Android and iOS platforms.

ANDROID:
1. BackdropFilter: Skip on low-end devices
   - Check MediaQuery.of(context).devicePixelRatio or use Platform.isAndroid
   - GlassSurface: Use opaque background fallback instead of blur
2. Touch optimization: Add MaterialTapTargetSize.padded on all buttons
3. System UI: SystemChrome.setSystemUIOverlayStyle matching theme
4. Edge-to-edge: Proper SafeArea handling
5. Back button: PopScope on all pages with proper canPop logic

iOS:
1. CupertinoPageRoute for swipe-back gesture on navigation
2. Cupertino-style bottom sheet (CupertinoActionSheet for destructive actions)
3. Status bar: Light content on dark theme, dark content on light
4. Safe area: Proper top/bottom insets for notch and home indicator
5. Haptics: Use HapticFeedback.selectionClick() for native feel

BOTH:
1. Image caching: cached_network_image everywhere
2. Performance:
   - const constructors on all stateless widgets
   - RepaintBoundary around expensive widgets (charts, previews)
   - AutomaticKeepAliveClientMixin on tab pages
   - Lazy loading: Don't build off-screen content
3. Error boundaries: ErrorWidget.builder for graceful error display
4. Splash screen: flutter_native_splash configuration
```

---

### PROMPT 55/55 — Final QA Checklist

```
Final quality assurance and polish pass.

CHECKLIST:

1. RESPONSIVE TESTING:
   - Test all 41 screens at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad)
   - BottomTabBar visible on phone, hidden on tablet (show side nav)
   - Verify SafeArea insets (notch, home indicator, status bar)
   - LayoutBuilder responsive breakpoints working

2. DARK/LIGHT MODE:
   - Toggle between modes on every screen
   - Verify all colors use ColorScheme + WiseResumeTheme (no raw Color values)
   - Check contrast ratios (WCAG AA minimum)
   - Smooth theme transition

3. LOADING STATES:
   - Every data-fetching page has matching Shimmer skeleton
   - No blank screens during loading
   - Proper error states with retry buttons
   - Empty states with CTAs

4. OFFLINE:
   - Test each critical flow offline
   - Verify sync queue works on reconnect
   - Offline banner appears correctly
   - Resume editing works offline

5. ACCESSIBILITY:
   - Semantics labels on all interactive widgets
   - Proper heading hierarchy
   - Focus management on dialogs/sheets
   - Screen reader compatibility (TalkBack, VoiceOver)
   - Minimum touch target size (48x48)

6. NAVIGATION:
   - Back button works correctly on all routes
   - Deep links resolve properly
   - Auth redirect preserves target URL
   - No orphan routes (every route accessible)

7. PERFORMANCE:
   - App startup < 2 seconds
   - Smooth scrolling (60fps) on resume lists
   - PDF generation < 5 seconds
   - Image loading with proper caching
   - No memory leaks (dispose all controllers)

8. ERROR HANDLING:
   - Network errors show user-friendly messages
   - API errors show retry options
   - Auth errors redirect appropriately
   - Crash reporting via bug report system

9. PLATFORM-SPECIFIC:
   - Android: Back button, edge-to-edge, material ripple
   - iOS: Swipe-back, Cupertino sheets, smooth scrolling

10. SECURITY:
    - All RLS policies verified (same Supabase project as web)
    - No sensitive data in local storage (use flutter_secure_storage)
    - API keys encrypted
    - Biometric lock working
    - Share passwords properly hashed

Fix any issues found during this audit.
```

---

## Quick Reference: Prompt Phase Map

```
Phase 1: Foundation     → Prompts 1-6    (Setup, Theme, Auth, Models, State, Routing)
Phase 2: Core Screens   → Prompts 7-17   (Landing, Dashboard, Editor, Sheets, Preview, Upload, Templates, Rendering, Onboarding, Profile, Settings)
Phase 3: AI Features    → Prompts 18-27  (AI Service, Studio, Analysis, Tailor, Enhance, Cover Letter, Resignation, Interview, Career, Chat)
Phase 4: Job Tracking   → Prompts 28-31  (Applications, Detail, Parsing, Notifications)
Phase 5: Portfolio      → Prompts 32-36  (Editor, Public, QR/Links, Analytics, AI)
Phase 6: Sharing & Docs → Prompts 37-40  (Sharing, Comments, Versions, Export)
Phase 7: Advanced       → Prompts 41-47  (Help, Analytics, Subscription, Referral, Achievements, Guides, Cmd Palette)
Phase 8: Native         → Prompts 48-51  (Biometric, Deep Links, Offline, Push)
Phase 9: Launch         → Prompts 52-55  (Payments, Credit Enforcement, Platform Optimizations, QA)
```

---

*Generated from WiseResume APP_BLUEPRINT_FLUTTER.md — the single source of truth for all Flutter design specs, data models, widget trees, and navigation flows.*
