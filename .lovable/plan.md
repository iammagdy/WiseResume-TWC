

# Add Section 18: Visual Screen Mockups to APP_BLUEPRINT.md

## Overview
Append a new section (~700 lines) to the end of `docs/APP_BLUEPRINT.md` with detailed ASCII wireframes and visual layout descriptions for all 17 major screens, plus a visual patterns reference. This gives the receiving AI agent exact layout, spacing, color, and component placement to match the design.

## What Changes

**File: `docs/APP_BLUEPRINT.md`**
- Update Table of Contents (line 26) to add entry 18
- Replace the closing italic line (line 1497) with the new Section 18 content followed by the closing line

## Section 18 Content

### Visual Patterns Reference
Documents reusable visual building blocks with exact Tailwind classes:
- Glass surface: `bg-card/80 backdrop-blur-sm border border-border/30`
- Gradient primary button: `bg-gradient-to-r from-primary to-accent`, h-14, rounded-2xl, glow shadow
- Card pattern: `rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4`
- Score ring: circular SVG, color-coded (green 80+, yellow 50-79, red below 50)
- Bottom sheet: `rounded-t-3xl px-4 pb-safe`, grab handle bar
- Empty state: 64px gradient icon circle, bold heading, muted description, gradient CTA
- BottomTabBar pill: `layoutId="active-tab-pill"` spring animation

### ASCII Wireframes for 17 Screens

Each screen gets an ASCII wireframe wrapped in a `text` code fence, plus a bullet-point description of key visual details (colors, sizes, Tailwind classes, interactions):

1. **Landing Page** -- SpaceBackground, sticky glass header, 120x120 logo with red glow-pulse, hero heading, gradient CTA h-14, trust bar checkmarks, comparison strip (strikethrough vs bold), feature cards, PortfolioDemo phone frame, EditorDemo, Footer
2. **Auth Page** -- MobileLayout wrapper, Back arrow top-left, AppIcon centered (48px, purple drop-shadow), "Welcome Back" heading, email/password fields with Mail/Lock icons, eye toggle, magic-link/forgot links, gradient Sign In button, "or" divider, Google outlined button, signup link
3. **Dashboard** -- Glass header bar, profile row (avatar h-10 w-10, greeting, gear icon), DashboardStats gradient-border card, QuickActionChips horizontal scroll, Tabs (My CVs / Tailored) with Embla swipe, ResumeFilters + ResumeListCard (rounded-2xl, thumbnail left, score badge right), FloatingCreateButton (fixed bottom-right pink gradient FAB)
4. **Editor** -- No mobile header, top bar (back arrow, title truncated, Cloud/CloudOff sync icon, undo/redo), ProgressBar gradient, StepperNav scrollable pills, SectionCard (rounded-2xl), InlineAIButton sparkle, bottom toolbar scrollable icons, Desktop: ResizablePanelGroup with LivePreviewPanel
5. **Preview** -- Full-bleed template rendering, zoom controls, page nav arrows, export button
6. **Upload** -- UploadZone (dashed border-2 rounded-3xl, min-h-280px, upload icon centered), FileTypeSelector (3 rows, colored icon circles), UploadProgressSteps (3-step animated), ATSScorePreview (ScoreRing 56px + category bars)
7. **AI Studio** -- Gradient heading "AI Studio", AIEngineBadge + AICreditsIndicator row, resume context bar (glass-surface), Wise AI Chat card (rounded-2xl, w-10 h-10 gradient circle with Sparkles icon, suggestion chips), Recent tools row, tool categories with 2-column grid, each tool card has colored icon (w-10 h-10), label, description, optional Featured/AICostBadge
8. **Interview** -- Setup: mode selection cards (rounded-2xl with icons). Active: chat transcript (TranscriptBubble -- user right-aligned primary bg, AI left-aligned muted bg), audio level visualization, recording controls (mic button, stop). Summary: score ring, category bars, strengths/improvements
9. **Applications** -- Tabs (Applications / Jobs) with Embla, StatusFilter horizontal pills with counts, ApplicationCard (rounded-2xl, company bold, status badge color-coded), JobActivityStatsCard, ActivityStreak flame, ActivityTimeline. Jobs tab: JobCard (rounded-2xl, Briefcase icon circle, match score, Tailor/Applied buttons)
10. **Portfolio Editor** -- Toggle switch, username input with /p/ prefix, theme picker (horizontal circles), section arrangement (draggable), QR code card, analytics panel
11. **Public Portfolio** -- Standalone themed page, centered profile header (avatar, name, title, social icons), sections with accent left borders, "Ask AI" floating button, "Built with WiseResume" footer
12. **Settings** -- BackButton, section chips (horizontal scroll pills with icons), avatar card (h-16 w-16, profile completion badge), SectionHeader (w-1 h-5 primary bar + icon + label), SettingsRow (full-width, icon, label, chevron-right), sections (Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About), Sign Out destructive button, DeveloperCreditCard
13. **Cover Letters** -- CoverLetterCard list (rounded-2xl, title, company, snippet, date), empty state pattern, create/edit form with tone selector pills
14. **Resignation Letters** -- Similar card list, ResignationChecklist with checkboxes and progress
15. **Career** -- CareerQuizSheet (multi-step, progress dots), CareerRoadmap (vertical timeline nodes), SkillGapAnalyzer (two-column comparison)
16. **Templates** -- Category filter chips, 2-column grid of template preview cards (aspect-ratio thumbnail, name, ATS badge overlay)
17. **Onboarding** -- Full-screen overlay z-60, 4-step carousel with dot indicators, centered icon/heading/description per step, final step has template selection grid

## Technical Details
- Appends ~700 lines to existing 1497-line file
- ASCII wireframes in `text` code fences
- References exact Tailwind classes, component names, and design tokens from Section 3
- No other files modified

