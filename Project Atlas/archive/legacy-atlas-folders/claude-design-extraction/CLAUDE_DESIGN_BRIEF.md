# Claude Design Brief — WiseResume UI Redesign

**Prepared for:** Claude Design  
**Project:** WiseResume — AI-native career workspace  
**Date:** 2026-06-15  
**Screenshot pack:** `Project Atlas/claude-design-extraction/screenshots/`  
**Index:** `Project Atlas/claude-design-extraction/SCREENSHOT_INDEX.md`

---

## What these screenshots are

These are **real, production-equivalent screenshots** captured from the current WiseResume web application running on its local development server. They represent the actual UI in its current state — not mockups, not wireframes, not aspirational designs.

Every screen shown is live, functional, and represents a real user flow that real users are experiencing today.

---

## What WiseResume is

WiseResume is an AI-native career workspace that helps professionals:

- **Build and edit resumes** with a live preview editor
- **Tailor resumes** to specific job descriptions using AI (the Tailoring Hub)
- **Enhance resume content** with contextual AI suggestions (Improve Summary, Enhance Experience, etc.)
- **Export resumes** to PDF and DOCX
- **Build public portfolio pages** visible via a custom domain or `wiseresume.app/@username`
- **Analyze job fit** with AI-powered ATS scanning and keyword highlighting

**Tech stack:** React, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui, Appwrite (auth, database, storage, AI functions).

**Target users:** Mid-career professionals, job seekers, and people actively managing multiple applications. Not students or casual one-time users.

---

## Design direction

### Target feeling
**Premium AI-native career workspace** — the intersection of:
- A high-end productivity app (think Linear, Notion, Arc)
- An AI-powered creative tool (think Runway, Midjourney's workspace)
- A professional document tool (think Pitch, Tome)

Not: a generic HR admin dashboard. Not: a traditional resume builder with step-by-step wizards.

### What to keep
- The **three-panel editor layout** (nav rail / editing canvas / live preview) — this is a strong structural choice
- The **Tailoring Hub as a dedicated power feature** — not buried in a menu
- **Appwrite-backed flows** — do not invent or suggest new backend behavior
- **All existing routes and navigation structure** — redesign the visual layer only
- **shadcn/ui and Radix UI components** — redesign the theming and composition, not the primitive library

### What to redesign

#### 1. Visual hierarchy and spatial design
- Cards, sections, and panels need stronger visual weight and depth
- Increase negative space — the current UI is slightly dense
- Use a coherent elevation system (flat cards vs. elevated modals vs. floating panels)
- Typography scale needs refinement — heading/body contrast is too subtle

#### 2. Dashboard
- The resume card grid should feel like a document gallery, not a data table
- The AI Intelligence panel (right sidebar) should feel like a live advisor, not a side panel
- The workspace toolbar needs a clearer primary action hierarchy
- The empty state (no resumes yet) should be an inviting onboarding moment, not a blank page

#### 3. Resume Editor
- The center editing canvas needs better section headers, field spacing, and focus states
- The live preview pane should feel like a polished document viewer — not an iframe inside a form
- AI enhancement triggers should be contextual (appear near the field being edited), not global toolbar buttons
- The nav rail icons should be expressive and labeled, not small unlabeled icons

#### 4. Tailoring Hub
- This is the hero AI feature — it should feel like a power tool
- The job description input area should be large and prominent with smart paste detection
- The result page (before/after comparison) should be the most visually striking screen in the app
- Score/match indicators should be bold and immediately legible

#### 5. AI panels and modals
- AI sheets/drawers should feel like an integrated co-pilot, not a detached dialog
- Use progressive disclosure: show the AI working, then reveal the result with a clear accept/reject interface
- Word-level diff highlighting between original and AI-suggested text
- The "AI is thinking" loading state should be visually engaging, not a plain spinner

#### 6. Mobile UX
- Mobile is currently functional but not delightful
- The editor should have a clear Edit/Preview mode toggle, not a buried toolbar button
- AI tools on mobile should be accessible via a contextual FAB or bottom sheet
- Resume cards in the dashboard should have swipe actions (Delete, Duplicate, Tailor)
- The bottom navigation pattern should be consistent across all routes

#### 7. Export and Import dialogs
- Export should feel like a "ship it" moment — final preview, format choice, prominent download
- Import Job should feel fast and frictionless — large paste area, smart detection, minimal chrome

---

## Constraints for Claude Design

- **Do not invent backend behavior.** All data, auth, and AI logic is handled by Appwrite. Designs should work within the existing data model.
- **Do not remove or hide features.** Every button and flow shown in the screenshots represents a real feature that users depend on.
- **Do not change the route structure.** Navigation and URL patterns are fixed.
- **Keep the shadcn/ui and Radix component foundation** — redesign theming, spacing, and composition.
- **Preserve accessibility.** All dialogs need titles, all interactive elements need keyboard support.
- **Respect mobile breakpoints:** `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). The AI sidebar hides below `xl`. The Discovery section hides below `lg`.

---

## Priority order for redesign

1. **Dashboard desktop** — first impression, most-visited screen
2. **Resume Editor desktop** — core daily-use screen
3. **Tailoring Hub + Result** — hero AI feature, biggest opportunity for differentiation
4. **AI panels (enhance + output)** — most interaction-dense moments
5. **Dashboard mobile** — growing mobile usage
6. **Editor mobile** — most technically complex mobile screen
7. **Export and Import dialogs** — functional but cosmetically weak
8. **Settings** — lowest priority, but should match the premium feel

---

## Questions Claude Design should answer

- What is the right dark/light mode strategy? (Currently: dark mode primary)
- Should the editor live preview use a paper-like background to simulate a real document?
- What accent color system best signals "AI" vs "user action" vs "status"?
- Should the Tailoring Result page use a side-by-side diff or a tabbed before/after?
- What is the right mobile navigation pattern — bottom tabs, hamburger, or gesture-based?
