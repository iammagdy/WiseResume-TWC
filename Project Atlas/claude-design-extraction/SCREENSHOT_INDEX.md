# WiseResume Screenshot Index — Claude Design Extraction Pack

**Captured from:** Local dev server (`http://localhost:5000`) — current production UI  
**Date:** 2026-06-15  
**App version:** Commit `d45173ed` (main branch)  
**Capture tool:** Playwright + Chromium, 2× device scale factor (retina quality)

---

## Desktop Screenshots (1440×1100)

### 01-dashboard-desktop.png
- **Route:** `/dashboard`
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Main workspace after login — resume card grid, workspace toolbar (New Resume, Import, Wise AI), AI Intelligence panel (right sidebar), top navigation bar, sidebar nav rail.
- **Design notes:** The layout mixes a card grid with a wide AI sidebar. The AI sidebar disappears below `xl` breakpoint. The workspace toolbar feels generic — could use stronger visual hierarchy. The greeting/hero section is prominent when no resumes exist but plain once resumes load.

---

### 02-dashboard-mobile.png
- **Route:** `/dashboard`
- **Viewport:** 390×844 (mobile)
- **Shows:** Mobile dashboard — resume cards stacked, bottom nav or hamburger menu, AI sidebar hidden.
- **Design notes:** Mobile toolbar is functional but could be elevated. Cards at full width feel dense. The "New Resume" CTA competes with other actions. Consider a sticky floating action button pattern for mobile.

---

### 03-settings-desktop.png
- **Route:** `/settings`
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Settings page — account info, subscription plan, notification preferences, connected integrations.
- **Design notes:** Settings tends to feel flat and administrative. Opportunity to use premium-feeling sections with card grouping, icon accents, and clear section hierarchy. Subscription/plan section should feel aspirational, not billing-form-like.

---

### 04-settings-mobile.png
- **Route:** `/settings`
- **Viewport:** 390×844 (mobile)
- **Shows:** Mobile settings — same sections stacked vertically, possibly with collapsible groups.
- **Design notes:** Mobile settings often get squished into a flat list. Consider grouped cards with chevrons for deeper settings, and a sticky header showing the active section.

---

### 05-editor-desktop.png
- **Route:** `/editor?resumeId=<existing>`
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Full resume editor — left nav rail, center form fields for resume sections (Summary, Experience, Education, Skills), right live preview pane.
- **Design notes:** Three-panel layout is ambitious. The nav rail icons should be expressive, not generic. The center editing area needs better section headers and field spacing. The live preview pane is the hero — it should feel like a polished PDF viewer, not an iframe.

---

### 06-editor-mobile.png
- **Route:** `/editor?resumeId=<existing>`
- **Viewport:** 390×844 (mobile)
- **Shows:** Mobile editor — single pane (form only), bottom toolbar for switching to preview, AI tools.
- **Design notes:** Mobile editor is essentially a form. The biggest UX gap is toggling between "edit" and "preview" — this should be a clear mode switch, not buried in a toolbar. AI tools should be contextual, not hidden in a drawer.

---

### 07-tailoring-hub-desktop.png
- **Route:** `/tailoring-hub`
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Tailoring Hub — job description paste area, resume selector, generate tailored version button, possibly result preview.
- **Design notes:** This is a core AI feature — it should feel like a power tool, not a form. The two-panel (job description left, resume right) pattern is standard but could be made more dynamic with a live diff or keyword highlighting as the user types.

---

### 08-tailoring-hub-mobile.png
- **Route:** `/tailoring-hub`
- **Viewport:** 390×844 (mobile)
- **Shows:** Mobile tailoring hub — stacked paste area, resume selector, generate button.
- **Design notes:** The stacked layout works but the generate CTA should be floating/sticky. On mobile, the job description textarea needs significant vertical space — the layout should adapt to give it room.

---

### 09-tailoring-result-desktop.png
- **Route:** `/tailoring-hub/result/:resumeId`
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Tailoring result page — side-by-side original vs. tailored resume, key changes panel, score/match indicator, action buttons (Accept, Download, Continue to Editor).
- **Design notes:** This is the "money moment" of the product. The before/after comparison should be visually striking — consider a split-pane with highlighted diffs. The key changes list should use color-coded badges (Added, Improved, Removed). The score should be a prominent visual element, not a small number.

---

### 10-tailoring-result-mobile.png
- **Route:** `/tailoring-hub/result/:resumeId`
- **Viewport:** 390×844 (mobile)
- **Shows:** Mobile tailoring result — stacked comparison, score, key changes, action buttons.
- **Design notes:** Side-by-side is not possible on mobile — use tabs (Original / Tailored) with a persistent score badge at top. Key changes could scroll below in a collapsible card.

---

## Interactive / Modal Screenshots (Desktop 1440×1100)

### 11-ai-enhance-popup-summary.png
- **Route:** `/editor` — AI Enhance panel open (Improve Summary or similar)
- **Viewport:** 1440×1100 (desktop)
- **Shows:** AI enhance sheet/dialog — input field showing current summary text, AI prompt or button to trigger improvement, loading state or result.
- **Design notes:** AI panels are currently sheet-style drawers. Consider a split view inside the editor instead — shows original on the left, AI suggestion on the right, with inline accept/reject controls. The sheet pattern forces the user to lose context of the resume preview.

---

### 12-ai-output-sheet.png
- **Route:** `/editor` — AI result state (after AI returns content)
- **Viewport:** 1440×1100 (desktop)
- **Shows:** AI output display — the enhanced text returned by the AI, accept/reject/regenerate controls, comparison with original.
- **Design notes:** The AI result state is where trust is built or lost. Typography should be clean and distinct from UI chrome. Accept button should be primary, regenerate secondary, reject/dismiss tertiary. Consider showing a word diff between original and AI version.

---

### 13-export-popup.png
- **Route:** `/editor` — Export/Download sheet open
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Export options — PDF, DOCX, template selection for export, quality settings, download button.
- **Design notes:** Export is often an afterthought in design. It should feel like a "ready to ship" moment — show a final preview thumbnail, format badges (PDF / DOCX), and a large download CTA. Consider a "Last downloaded" timestamp to reduce anxiety about having the latest version.

---

### 14-import-job-popup.png
- **Route:** `/dashboard` or `/tailoring-hub` — Import Job sheet open
- **Viewport:** 1440×1100 (desktop)
- **Shows:** Import job description dialog — text paste area, URL import field, job board integration options.
- **Design notes:** This is the entry point for the AI tailoring flow. It should feel fast and frictionless. A large paste area with a "Detect Job Title" live preview below the textarea would build confidence. Consider LinkedIn/Glassdoor/Indeed paste detection with auto-formatting.

---

## Notes for Claude Design

- Screenshots captured from local dev server with a real authenticated user account.
- Some screens (09, 10, 11, 12) may be placeholders if interactive state was not reachable automatically — check file sizes; a small file (<50KB) likely indicates a fallback/placeholder state.
- The `/tailoring-hub/result/:resumeId` route requires a previously tailored resume — if it was not found automatically, the capture may show the tailoring hub input screen instead.
- All sensitive user data (name, email, resume content) was captured as-is — treat with discretion; do not use real names in redesign mockups.
