

# Create 4 Design Reference and Stitch Prompt Files

## Overview
Create 4 new documentation files to support the design phase of both the web and Flutter versions of WiseResume.

---

## File 1: `docs/INSPIRATION_WEB.md` -- Web App Competitors and Design Sources

A curated list of web-based resume builders, career platforms, and SaaS apps to draw UI/UX inspiration from. Organized by category:

### Resume Builders (Direct Competitors)
- **Teal** (tealhq.com) -- Job tracker + resume builder, clean dashboard, ATS scoring UI
- **Rezi** (rezi.ai) -- AI resume builder, dark theme option, stepper editor
- **Kickresume** (kickresume.com) -- Template gallery grid, cover letter flow
- **Novoresume** (novoresume.com) -- Editor with live preview side-by-side
- **Resume.io** (resume.io) -- Clean template picker, export flow
- **Enhancv** (enhancv.com) -- Section-based editor, content suggestions
- **FlowCV** (flowcv.io) -- Free builder, minimal dark UI, real-time preview
- **Reactive Resume** (rxresu.me) -- Open source, dark theme, glass effects
- **Standard Resume** (standardresume.co) -- Minimalist, elegant preview
- **Zety** (zety.com) -- Guided wizard, template variety

### AI Career Tools
- **Jobscan** (jobscan.co) -- ATS score visualization, keyword matching UI
- **VMock** (vmock.com) -- Resume scoring dashboard
- **Huntr** (huntr.co) -- Job board + tracker, Kanban view
- **Simplify** (simplify.jobs) -- Auto-fill applications, activity feed
- **Careerflow** (careerflow.ai) -- AI tools dashboard grid

### SaaS Design Inspiration (Layout, Dark Theme, Glass Effects)
- **Linear** (linear.app) -- Dark theme excellence, glass surfaces, keyboard shortcuts
- **Raycast** (raycast.com) -- Command palette, dark aesthetic
- **Vercel Dashboard** (vercel.com) -- Clean dark UI, stats cards
- **Notion** (notion.so) -- Editor UX patterns, side panels
- **Arc Browser** (arc.net) -- Space theme, gradients, animations

### Portfolio Inspiration
- **Read.cv** (read.cv) -- Clean public profiles
- **Peerlist** (peerlist.io) -- Developer portfolios
- **Bento** (bento.me) -- Grid-based personal pages

Each entry will include: name, URL, and 2-3 specific UI elements worth studying (e.g., "Study their template picker grid layout", "Reference their ATS score ring animation").

---

## File 2: `docs/INSPIRATION_FLUTTER.md` -- Mobile App Competitors and Design Sources

Mobile-specific apps (Android/iOS) for native Flutter UI inspiration:

### Resume/Career Apps (Google Play / App Store)
- **Canva** -- Template gallery, editor gestures, export flow
- **Indeed** -- Job search UI, application tracking, notifications
- **LinkedIn** -- Profile editor, activity feed, messaging patterns
- **Glassdoor** -- Company pages, salary cards, review UI
- **Resume Builder by Nobody** -- Simple mobile resume editor
- **CV Engineer** -- Mobile resume builder, template preview
- **Resume Star** -- iOS resume builder, clean native feel
- **Jobscan Mobile** -- ATS score cards
- **Huntr Mobile** -- Job tracking Kanban
- **Otta** -- Modern job matching, card-based swipe UI

### Flutter-Specific Design Inspiration
- **Google Pay** -- Material 3, bottom nav, smooth animations
- **Reflectly** -- Beautiful onboarding, custom painters, gradients
- **Hamilton Musical App** -- Dark theme, glass effects in Flutter
- **Nubank** -- Dark theme banking, cards, charts
- **Stadia** (archived) -- Dark gaming UI, smooth transitions

### UI Pattern Libraries
- **Material 3 Gallery** (Flutter demo app) -- Official Material 3 components
- **Flutter Gallery** -- Widget catalog and patterns
- **Dribbble** -- Search "resume app mobile", "career app dark theme", "job tracker mobile"
- **Mobbin** (mobbin.com) -- Real app screenshots, filter by pattern

Each entry will include: platform availability, specific screens to study, and Flutter-relevant patterns (e.g., "Study their CustomPainter usage for score rings", "Reference their PageView onboarding flow").

---

## File 3: `docs/STITCH_PROMPTS_WEB.md` -- Google Stitch Prompts for Web App Screens

Standalone file with **20+ granular prompts** (smaller than the 12 combined ones in REBUILD_PROMPTS.md). Each prompt generates 1-2 screens max to avoid hallucination:

| # | Prompt | Screens |
|---|--------|---------|
| 1 | Auth -- Email Entry + Login | 2 |
| 2 | Auth -- Signup + Reset Password | 2 |
| 3 | Dashboard -- Main View | 1 |
| 4 | Dashboard -- FAB Menu + Empty State | 2 |
| 5 | Resume Editor -- Section Stepper | 1 |
| 6 | Resume Editor -- Bottom Toolbar + Sheets | 2 |
| 7 | Resume Preview -- Zoom + Page Nav | 1 |
| 8 | Upload -- Import Zone + Progress | 1 |
| 9 | AI Studio -- Tool Grid | 1 |
| 10 | Mock Interview -- Chat + Voice Controls | 1 |
| 11 | Applications -- List + Filters | 1 |
| 12 | Job Detail | 1 |
| 13 | Portfolio Editor | 1 |
| 14 | Public Portfolio | 1 |
| 15 | Settings -- Main + Categories | 1 |
| 16 | Profile Editor | 1 |
| 17 | Cover Letters -- List + Editor | 2 |
| 18 | Onboarding Wizard (4 steps) | 1 |
| 19 | Templates Gallery | 1 |
| 20 | Help + FAQ | 1 |
| 21 | Analytics / Insights | 1 |
| 22 | Subscription / Pricing | 1 |
| 23 | Referral + Achievements | 2 |
| 24 | Career Path + Quiz | 1 |
| 25 | Notifications + 404 | 2 |
| 26 | Landing Page -- Hero + Features | 1 |
| 27 | Landing Page -- CTA + Footer | 1 |
| 28 | Resignation Letters -- List + Editor | 2 |

Each prompt will be self-contained with:
- Exact viewport (375px mobile-first)
- Color tokens (hex values for Stitch since it doesn't understand CSS vars)
- Typography specs (font family, sizes, weights)
- Component-level layout description
- Glass morphism / gradient instructions

---

## File 4: `docs/STITCH_PROMPTS_FLUTTER.md` -- Google Stitch Prompts for Flutter/Mobile App Screens

Same granular approach as the web version but adapted for native mobile conventions:

| # | Prompt | Screens |
|---|--------|---------|
| 1 | Splash Screen -- Animated Logo + Stars | 1 |
| 2 | Auth -- Email Entry + Login | 2 |
| 3 | Auth -- Signup + Reset Password | 2 |
| 4 | Dashboard -- Main View with FAB | 1 |
| 5 | Dashboard -- Empty State + Quick Actions | 1 |
| 6 | Resume Editor -- Section Stepper + Toolbar | 1 |
| 7 | Resume Editor -- Bottom Sheets (Template, Customize, Export) | 3 |
| 8 | Resume Preview -- InteractiveViewer + Page Nav | 1 |
| 9 | Upload -- File Picker + Parse Progress | 1 |
| 10 | AI Studio -- Tool Grid + Chat Bar | 1 |
| 11 | Mock Interview -- Voice Chat + Waveform | 1 |
| 12 | Applications -- List + Status Filters | 1 |
| 13 | Application Detail + Job Detail | 2 |
| 14 | Portfolio Editor -- Toggle + Theme Picker | 1 |
| 15 | Public Portfolio -- Standalone Page | 1 |
| 16 | Settings -- Categories + Rows | 1 |
| 17 | Profile Editor -- Avatar + Form | 1 |
| 18 | Cover Letters -- List + Generator | 2 |
| 19 | Resignation Letters -- List + Generator | 2 |
| 20 | Onboarding -- 4-Step PageView | 1 |
| 21 | Templates Gallery -- Grid + Filters | 1 |
| 22 | Help + FAQ -- Accordion Search | 1 |
| 23 | Analytics -- Charts + Stats | 1 |
| 24 | Subscription -- Plan Cards | 1 |
| 25 | Referral -- Code + QR + Rewards | 1 |
| 26 | Achievements -- Badge Grid | 1 |
| 27 | Career Path -- Roadmap + Quiz | 1 |
| 28 | Notifications -- List + Empty State | 1 |
| 29 | 404 -- Space Theme Error | 1 |
| 30 | Guides -- List + Detail | 2 |

Key differences from web Stitch prompts:
- Includes native patterns (status bar, system nav bar, safe areas)
- Uses Material 3 component vocabulary (BottomSheet, NavigationBar, FloatingActionButton)
- Mentions platform-specific details (iOS SafeArea, Android back gesture)
- Splash screen prompt (not needed in web version)
- Bottom sheets instead of modals/dialogs where appropriate

---

## Technical Details

- **Files created**: 4 new files in `docs/`
- **No existing files modified**
- **Estimated sizes**:
  - `INSPIRATION_WEB.md`: ~200 lines
  - `INSPIRATION_FLUTTER.md`: ~200 lines
  - `STITCH_PROMPTS_WEB.md`: ~1,200 lines (28 detailed prompts)
  - `STITCH_PROMPTS_FLUTTER.md`: ~1,400 lines (30 detailed prompts)
- All prompts reference the app's actual design system (colors, fonts, spacing) from the blueprints
- Stitch prompts are deliberately small (1-2 screens each) to prevent AI hallucination and maintain quality
