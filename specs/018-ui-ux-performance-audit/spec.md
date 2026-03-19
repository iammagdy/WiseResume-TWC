# Feature Specification: UI/UX & Front-End Performance Audit

**Feature Branch**: `018-ui-ux-performance-audit`
**Created**: 2026-03-19
**Status**: Draft
**Scope**: Round 1 — P1 (Critical) + P2 (High) issues only. P3 (Medium/Low) deferred to follow-up spec.

---

## Clarification Decisions

1. **Scope**: P1 + P2 only. P3/Low deferred to a follow-up spec.
2. **Skeleton Loaders**: Reusable generic shimmer component, used to mirror Editor and Job Detail layouts.
3. **Accessibility**: High-severity only (contrast, aria-labels, focus indicators). Medium/Low deferred.
4. **Heavy Libraries**: Verify current import strategy first — skip if already lazy-loaded from prior work.
5. **Unsaved Changes**: EditorPage and PortfolioEditorPage only.
6. **Empty States**: Lucide icons + text + CTA button (lightweight, no custom illustrations).
7. **Store Re-renders**: Editor components only (highest impact). No broad refactoring.
8. **Testing**: Manual audit only (Lighthouse + screen reader check). No automated a11y test infrastructure this round.

---

## Audit Summary

Three parallel audits were conducted:
1. **UX & User Flow** — User journeys, empty/loading/error states, navigation dead ends
2. **UI & Accessibility** — Visual consistency, responsiveness, a11y compliance
3. **Front-End Performance** — Re-renders, heavy imports, caching, state management efficiency

**Results**: 21 UX issues, 17 UI/A11y issues, 18 Performance issues identified.

---

## Diagnostic Report by Category

---

### Category 1: User Experience (UX) & User Flow

#### UX-001 — EditorPage Blank Wait (~8s) Before Content Renders
- **File**: `src/pages/EditorPage.tsx`
- **Severity**: 🔴 Critical
- **Issue**: When a user navigates to the editor, the page shows a blank/empty state for up to 8 seconds while the resume data loads. No skeleton loader or progress indicator tells the user something is happening.
- **Why it's bad**: Users may think the app is broken and navigate away. First impressions of the core feature are severely damaged.
- **Fix**: Add a skeleton loader or shimmer placeholder that mirrors the editor layout while data loads.

#### UX-002 — JobDetailPage Returns Null During Loading
- **File**: `src/pages/JobDetailPage.tsx`
- **Severity**: 🔴 Critical
- **Issue**: The component returns `null` while job data is being fetched, causing a blank flash before content appears.
- **Why it's bad**: Users see a white screen with no indication that content is loading. This feels like a broken page.
- **Fix**: Return a loading skeleton or spinner instead of `null`.

#### UX-003 — Missing Empty States on Dashboard
- **File**: `src/pages/Dashboard.tsx`, `src/components/dashboard/ResumeListCard.tsx`
- **Severity**: 🟠 High
- **Issue**: When a new user has no resumes, the dashboard shows an empty card grid with no guidance on what to do next.
- **Why it's bad**: New users don't know how to get started. The "first run" experience lacks direction.
- **Fix**: Add an illustrated empty state with a clear CTA ("Create your first resume").

#### UX-004 — Missing Empty State on Applications Page
- **File**: `src/pages/ApplicationsPage.tsx`
- **Severity**: 🟡 Medium
- **Issue**: No applications results in an empty table with column headers but no rows and no helpful message.
- **Fix**: Add empty state with guidance ("Track your job applications here").

#### UX-005 — No Unsaved Changes Warning on PortfolioEditorPage
- **File**: `src/pages/PortfolioEditorPage.tsx`
- **Severity**: 🟠 High
- **Issue**: Users can navigate away from the portfolio editor without saving, losing all changes with no confirmation dialog.
- **Why it's bad**: Accidental data loss erodes trust in the product.
- **Fix**: Add a `beforeunload` listener and a React Router navigation blocker for unsaved changes.

#### UX-006 — No Unsaved Changes Warning on EditorPage
- **File**: `src/pages/EditorPage.tsx`
- **Severity**: 🟠 High
- **Issue**: Same as UX-005 but for the resume editor — users can lose edits by navigating away.
- **Fix**: Same pattern — `beforeunload` + navigation blocker.

#### UX-007 — Auth Page Timeout Without Feedback
- **File**: `src/pages/AuthPage.tsx`
- **Severity**: 🟡 Medium
- **Issue**: If the authentication provider (Kinde) takes too long to respond, the user sees no feedback — just a spinning state indefinitely.
- **Fix**: Add a timeout with a retry prompt after 10 seconds.

#### UX-008 — Interview Page Missing Loading State
- **File**: `src/pages/InterviewPage.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Interview session initialization shows no loading indicator.
- **Fix**: Add a loading spinner or skeleton during session setup.

#### UX-009 — Settings Page Lacks Save Confirmation
- **File**: `src/pages/SettingsPage.tsx`
- **Severity**: 🟡 Medium
- **Issue**: After saving settings, there's no toast or visual confirmation that changes were persisted.
- **Fix**: Add a success toast notification on save.

#### UX-010 — Error States Show Generic Messages
- **Files**: Multiple pages
- **Severity**: 🟡 Medium
- **Issue**: Error boundaries and catch blocks show generic "Something went wrong" without actionable guidance.
- **Fix**: Provide context-specific error messages with recovery actions (retry, go back, contact support).

#### UX-011 — Resume Preview Not Responsive
- **File**: `src/components/editor/ResumePreview.tsx`
- **Severity**: 🟡 Medium
- **Issue**: The resume preview panel doesn't adapt well to narrow viewports, causing horizontal overflow.
- **Fix**: Add responsive scaling or a mobile-friendly preview mode.

#### UX-012 — No Keyboard Shortcut for Save in Editor
- **File**: `src/pages/EditorPage.tsx`
- **Severity**: 🟢 Low
- **Issue**: Users expect Ctrl+S to save. Currently it triggers browser save dialog instead.
- **Fix**: Intercept Ctrl+S and trigger resume save.

#### UX-013 — Template Selector Lacks Preview on Mobile
- **File**: `src/components/editor/TemplateSwitcher.tsx`
- **Severity**: 🟢 Low
- **Issue**: Template thumbnails are too small on mobile to distinguish between templates.
- **Fix**: Add a tap-to-preview interaction on mobile.

#### UX-014 — No Onboarding Flow for New Users
- **Files**: `src/pages/Dashboard.tsx`, `src/App.tsx`
- **Severity**: 🟡 Medium
- **Issue**: First-time users land on the dashboard with no guided tour or onboarding hints.
- **Fix**: Add a lightweight onboarding tooltip sequence for first-time users.

#### UX-015 — AI Tailor Results Not Clearly Differentiated
- **File**: `src/components/editor/TailorSheet.tsx`
- **Severity**: 🟢 Low
- **Issue**: When AI suggestions are applied, it's not immediately clear what changed versus original content.
- **Fix**: Highlight diff/changes visually (e.g., green background for additions).

#### UX-016 — Credit Balance Not Visible During AI Operations
- **Files**: `src/components/editor/TailorSheet.tsx`, `src/components/editor/AnalyzeSheet.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Users don't see their remaining credits when about to use an AI feature.
- **Fix**: Show credit balance near AI action buttons.

#### UX-017 — PDF Export Lacks Progress Indicator
- **File**: `src/components/editor/ExportMenu.tsx`
- **Severity**: 🟢 Low
- **Issue**: PDF generation can take a few seconds with no visual feedback.
- **Fix**: Add a progress bar or spinner during export.

#### UX-018 — Search/Filter Missing on Applications Page
- **File**: `src/pages/ApplicationsPage.tsx`
- **Severity**: 🟢 Low
- **Issue**: Users with many applications cannot search or filter by company/status.
- **Fix**: Add a search input and status filter dropdown.

#### UX-019 — No Confirmation Before Deleting a Resume
- **File**: `src/components/dashboard/ResumeListCard.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Resume deletion may lack adequate confirmation, risking accidental data loss.
- **Fix**: Ensure a confirmation dialog with the resume name is shown before deletion.

#### UX-020 — Cover Letter Page Lacks Template Preview
- **File**: `src/pages/CoverLetterPage.tsx`
- **Severity**: 🟢 Low
- **Issue**: Users can't preview what the cover letter will look like before generating.
- **Fix**: Add a preview pane or sample output.

#### UX-021 — Portfolio Share Link Not Easily Copyable
- **File**: `src/pages/PortfolioEditorPage.tsx`
- **Severity**: 🟢 Low
- **Issue**: The portfolio share URL requires manual selection to copy.
- **Fix**: Add a "Copy Link" button with clipboard API.

---

### Category 2: User Interface (UI) & Accessibility (a11y)

#### A11Y-001 — Placeholder Text Contrast Too Low (60% Opacity)
- **Files**: Multiple form components across `src/components/`
- **Severity**: 🟠 High
- **Issue**: Placeholder text uses `opacity-60` or equivalent, resulting in contrast ratios below the WCAG 2.1 AA minimum of 4.5:1. Affects all text inputs application-wide.
- **Why it's bad**: Users with low vision or in bright environments cannot read placeholder text.
- **Fix**: Increase placeholder opacity to at least 75% or use explicit color values that meet 4.5:1 contrast ratio.

#### A11Y-002 — Disabled Button Opacity at 30%
- **Files**: Multiple button components
- **Severity**: 🟠 High
- **Issue**: Disabled buttons use `opacity-30`, making them nearly invisible. Users can't tell if a button exists but is disabled vs. not being there at all.
- **Why it's bad**: Fails WCAG 1.4.3 contrast requirements and confuses users about available actions.
- **Fix**: Use `opacity-50` minimum and add `cursor-not-allowed` for clear disabled indication.

#### A11Y-003 — Missing `aria-label` on Icon-Only Buttons
- **Files**: 34+ components including `src/components/editor/*.tsx`, `src/components/dashboard/*.tsx`
- **Severity**: 🟠 High
- **Issue**: Icon-only buttons (delete, edit, close, settings) have no `aria-label`, making them inaccessible to screen readers. Screen readers announce them as "button" with no context.
- **Why it's bad**: Completely inaccessible to visually impaired users.
- **Fix**: Add descriptive `aria-label` props to all icon-only buttons (e.g., `aria-label="Delete resume"`).

#### A11Y-004 — Missing `focus-visible` Indicators
- **Files**: 34+ interactive components
- **Severity**: 🟠 High
- **Issue**: Many interactive elements (buttons, links, inputs) lack visible focus indicators when navigated via keyboard. The default browser outline may be suppressed by Tailwind's reset.
- **Why it's bad**: Keyboard-only users cannot see which element is focused, making the app unusable without a mouse.
- **Fix**: Add `focus-visible:ring-2 focus-visible:ring-primary` to interactive elements globally or via a base component style.

#### A11Y-005 — Text Below 12px Minimum on Mobile
- **Files**: Various components with `text-xs` (12px) and custom smaller sizes
- **Severity**: 🟡 Medium
- **Issue**: Some UI text renders below 12px on mobile devices, particularly in card subtitles and metadata.
- **Why it's bad**: Text below 12px is difficult to read on mobile screens, especially for users with visual impairments.
- **Fix**: Ensure minimum `text-xs` (12px) on mobile; use responsive text classes where needed.

#### A11Y-006 — Missing `role` Attributes on Interactive Containers
- **Files**: Various card and list components
- **Severity**: 🟡 Medium
- **Issue**: Clickable `<div>` elements used as buttons/links lack `role="button"` or proper semantic elements.
- **Fix**: Replace clickable `<div>` elements with `<button>` or add `role="button"` + `tabIndex={0}` + keyboard event handlers.

#### A11Y-007 — Color Used as Only Indicator of Status
- **Files**: `src/components/dashboard/ScoreBadge.tsx`, `src/components/ai/AIHealthIndicator.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Status indicators (score badges, health status) rely solely on color (red/yellow/green) to convey meaning. Color-blind users cannot distinguish states.
- **Fix**: Add text labels, icons, or patterns alongside color indicators.

#### A11Y-008 — Modal/Sheet Components Missing Focus Trap
- **Files**: `src/components/editor/TailorSheet.tsx`, `src/components/editor/AnalyzeSheet.tsx`, `src/components/settings/AISettingsSheet.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Sheet/modal components may not trap focus, allowing keyboard users to tab behind the overlay to hidden content.
- **Fix**: Verify Radix UI sheet component handles focus trapping (it should by default); if custom modals exist, add `FocusTrap`.

#### A11Y-009 — Form Validation Errors Not Announced
- **Files**: Various form components
- **Severity**: 🟡 Medium
- **Issue**: Form validation errors appear visually but are not announced to screen readers via `aria-live` or `role="alert"`.
- **Fix**: Wrap error messages in `<p role="alert">` or use `aria-live="polite"` regions.

#### A11Y-010 — Inconsistent Spacing and Typography
- **Files**: Various pages
- **Severity**: 🟡 Medium
- **Issue**: Spacing between sections, padding within cards, and heading hierarchy are inconsistent across pages, creating a disjointed visual experience.
- **Fix**: Audit and standardize spacing scale usage; ensure heading levels follow a logical hierarchy (h1 > h2 > h3).

#### A11Y-011 — Dark Mode Contrast Issues
- **Files**: Various components using `dark:` Tailwind variants
- **Severity**: 🟡 Medium
- **Issue**: Some dark mode color combinations don't meet WCAG contrast requirements, particularly muted text on dark backgrounds.
- **Fix**: Audit dark mode palette; ensure all text/background combinations meet 4.5:1 ratio.

#### A11Y-012 — Missing Skip Navigation Link
- **File**: `src/App.tsx` or layout component
- **Severity**: 🟢 Low
- **Issue**: No "Skip to main content" link exists for keyboard/screen reader users to bypass the navigation.
- **Fix**: Add a visually hidden skip link at the top of the page that becomes visible on focus.

#### A11Y-013 — Images Without Alt Text
- **Files**: Various components rendering user-uploaded or template images
- **Severity**: 🟡 Medium
- **Issue**: Some `<img>` tags lack meaningful `alt` attributes.
- **Fix**: Add descriptive `alt` text or `alt=""` for decorative images with `role="presentation"`.

#### A11Y-014 — Touch Targets Below 44x44px on Mobile
- **Files**: Various icon buttons and small interactive elements
- **Severity**: 🟡 Medium
- **Issue**: Some interactive elements have touch targets smaller than the recommended 44x44px minimum, making them difficult to tap on mobile.
- **Fix**: Increase padding or min-width/min-height on small interactive elements for mobile viewports.

#### A11Y-015 — No Reduced Motion Support
- **Files**: Components using CSS animations or Framer Motion
- **Severity**: 🟢 Low
- **Issue**: Animations play regardless of the user's `prefers-reduced-motion` setting.
- **Fix**: Add `motion-reduce:` variants or check `prefers-reduced-motion` media query.

#### A11Y-016 — Language Attribute Missing or Incorrect
- **File**: `index.html`
- **Severity**: 🟢 Low
- **Issue**: The `<html>` element may lack a `lang` attribute, affecting screen reader pronunciation.
- **Fix**: Add `lang="en"` to the `<html>` element.

#### A11Y-017 — Responsive Breakpoint Issues on Small Screens
- **Files**: `src/pages/EditorPage.tsx`, `src/components/editor/ResumePreview.tsx`
- **Severity**: 🟡 Medium
- **Issue**: The editor layout (sidebar + preview) doesn't collapse gracefully on screens below 768px, causing horizontal overflow or overlapping elements.
- **Fix**: Implement a tab-based or stacked layout for mobile viewports.

---

### Category 3: Front-End Performance

#### PERF-001 — Missing `staleTime`/`gcTime` on `useJobApplications`
- **File**: `src/hooks/useJobApplications.ts`
- **Severity**: 🟠 High
- **Issue**: The React Query hook for job applications uses default `staleTime` (0), meaning every component mount triggers a refetch. On pages where multiple components consume this data, this causes redundant network requests.
- **Why it's bad**: Unnecessary API calls slow down page loads and waste bandwidth.
- **Fix**: Set `staleTime: 5 * 60 * 1000` (5 minutes) and appropriate `gcTime`.

#### PERF-002 — Zustand `resumeStore` Large Nested Objects Cause Re-renders
- **File**: `src/store/resumeStore.ts`
- **Severity**: 🟠 High
- **Issue**: Components subscribing to the resume store may re-render on any state change because they select large nested objects without `useShallow`. When any field in the resume changes, all subscribers re-render.
- **Why it's bad**: The editor page has many components reading from this store, causing a cascade of unnecessary re-renders on every keystroke.
- **Fix**: Use `useShallow` selectors or split the store into smaller slices. Components should select only the specific fields they need.

#### PERF-003 — `pdfjs-dist` Not Lazy-Loaded
- **File**: `src/components/editor/ResumePreview.tsx` or import graph
- **Severity**: 🟠 High
- **Issue**: `pdfjs-dist` (~800KB) is imported statically, adding to the initial bundle even for users who haven't opened the preview yet.
- **Why it's bad**: Increases initial page load time for all users, even those who never use PDF preview.
- **Fix**: Use `React.lazy()` + dynamic `import()` to load the PDF viewer only when the preview tab is activated.

#### PERF-004 — `tesseract.js` Not Lazy-Loaded
- **File**: Import graph / resume parsing components
- **Severity**: 🟠 High
- **Issue**: `tesseract.js` (~2MB with worker) is bundled statically. It's only needed for OCR-based resume parsing, which is an uncommon user action.
- **Why it's bad**: Massively inflates the initial bundle for a rarely-used feature.
- **Fix**: Dynamic import `tesseract.js` only when the user initiates an OCR parse operation.

#### PERF-005 — `three.js` Not Lazy-Loaded
- **File**: Import graph / 3D components (likely landing page or portfolio)
- **Severity**: 🟠 High
- **Issue**: `three.js` (~600KB) is statically imported for what appears to be a non-critical visual effect.
- **Why it's bad**: Users pay the download cost on every page load for a cosmetic feature.
- **Fix**: Lazy-load the 3D component and use a static fallback while loading.

#### PERF-006 — `html2canvas` Not Lazy-Loaded
- **File**: Import graph / export functionality
- **Severity**: 🟡 Medium
- **Issue**: `html2canvas` (~200KB) is statically imported but only used during PDF/image export.
- **Fix**: Dynamic import when user clicks export.

#### PERF-007 — Unbounded Score Cache
- **File**: `src/hooks/useResumeScore.ts` or scoring utility
- **Severity**: 🟡 Medium
- **Issue**: Resume score results are cached without eviction, potentially growing unbounded as users edit resumes.
- **Fix**: Limit cache size or use LRU eviction. Set a reasonable `gcTime` on cached queries.

#### PERF-008 — Notification Polling Without Visibility Check
- **File**: `src/hooks/useNotifications.ts` or similar
- **Severity**: 🟡 Medium
- **Issue**: Notification polling continues when the browser tab is not visible, wasting bandwidth and battery.
- **Fix**: Pause polling when `document.hidden === true` using the Page Visibility API. React Query's `refetchOnWindowFocus` can help here.

#### PERF-009 — Dashboard Re-renders on Every Store Update
- **File**: `src/pages/Dashboard.tsx`
- **Severity**: 🟡 Medium
- **Issue**: The dashboard component subscribes to broad store slices, causing full re-renders when unrelated state changes.
- **Fix**: Use `useShallow` selectors and split subscriptions to only the fields each component needs.

#### PERF-010 — No Image Optimization or Lazy Loading
- **Files**: Various components rendering images
- **Severity**: 🟡 Medium
- **Issue**: Images (user avatars, template thumbnails, portfolio images) are loaded eagerly without `loading="lazy"` or responsive `srcset`.
- **Fix**: Add `loading="lazy"` to below-fold images. Use responsive image sizes where applicable.

#### PERF-011 — Large Font Files Loaded Upfront
- **File**: CSS/font configuration
- **Severity**: 🟡 Medium
- **Issue**: All font weights/variants may be loaded on initial page load rather than on demand.
- **Fix**: Use `font-display: swap` and subset fonts to only required characters. Load non-critical weights asynchronously.

#### PERF-012 — Editor Keystroke Debouncing Missing or Insufficient
- **File**: `src/components/editor/` form inputs
- **Severity**: 🟡 Medium
- **Issue**: Text inputs in the editor may trigger store updates and re-renders on every keystroke without debouncing.
- **Fix**: Debounce store updates with 300ms delay. Use local state for immediate input feedback.

#### PERF-013 — React Query Refetch on Window Focus for All Queries
- **File**: React Query client configuration
- **Severity**: 🟢 Low
- **Issue**: Default `refetchOnWindowFocus: true` causes all queries to refetch when the user switches back to the tab, even for data that doesn't change frequently.
- **Fix**: Set `refetchOnWindowFocus: false` globally or per-query for stable data.

#### PERF-014 — No Code Splitting by Route
- **File**: `src/App.tsx`
- **Severity**: 🟡 Medium
- **Issue**: Some routes may not use `React.lazy()`, causing the entire app to load upfront.
- **Fix**: Ensure all page-level components use `React.lazy()` with `<Suspense>` fallbacks.

#### PERF-015 — Framer Motion Bundle Not Tree-Shaken
- **File**: Import statements across components
- **Severity**: 🟢 Low
- **Issue**: Importing from `framer-motion` instead of `framer-motion/m` or specific submodules includes the full bundle.
- **Fix**: Use targeted imports or the `m` API for smaller bundle.

#### PERF-016 — Unoptimized SVG Icons
- **Files**: Various icon imports
- **Severity**: 🟢 Low
- **Issue**: SVG icons may not be optimized (minified, unused attributes removed).
- **Fix**: Use `lucide-react` tree-shaking properly or run SVGO on custom icons.

#### PERF-017 — No Virtualization for Long Lists
- **Files**: `src/pages/ApplicationsPage.tsx`, resume section lists
- **Severity**: 🟢 Low
- **Issue**: Long lists (applications, resume items) render all items to the DOM, which can cause jank with 100+ items.
- **Fix**: Use `react-window` or `@tanstack/react-virtual` for lists that could grow large.

#### PERF-018 — Source Maps in Production Build
- **File**: `vite.config.ts`
- **Severity**: 🟢 Low
- **Issue**: Source maps may be included in production builds, increasing deployment size.
- **Fix**: Ensure `build.sourcemap` is `false` or `'hidden'` in production config.

---

## User Scenarios & Testing

### User Story 1 — Critical Loading States (Priority: P1)

A user navigates to any page in the app and sees clear visual feedback while content loads, instead of blank screens or null renders.

**Why this priority**: Blank screens on core pages (Editor, Job Detail) cause users to think the app is broken. This directly impacts user retention.

**Independent Test**: Navigate to EditorPage and JobDetailPage with slow network — skeleton loaders should appear immediately.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Editor page, **When** resume data is loading, **Then** a skeleton loader matching the editor layout is displayed within 100ms.
2. **Given** a user navigates to a Job Detail page, **When** job data is being fetched, **Then** a loading skeleton is shown instead of a blank page.
3. **Given** any page encounters a loading error, **When** the error is displayed, **Then** a context-specific message with a retry action is shown.

---

### User Story 2 — Accessibility Compliance (Priority: P1)

All interactive elements are accessible to keyboard-only and screen reader users, with proper contrast ratios meeting WCAG 2.1 AA.

**Why this priority**: Accessibility is both a legal requirement and affects a significant portion of users. Icon-only buttons without labels are completely inaccessible.

**Independent Test**: Navigate the entire app using only keyboard; use a screen reader to verify all buttons are announced.

**Acceptance Scenarios**:

1. **Given** a user navigates via keyboard, **When** they tab through interactive elements, **Then** each element shows a visible focus ring.
2. **Given** a screen reader user encounters an icon-only button, **When** it is focused, **Then** a descriptive label is announced.
3. **Given** any text in the app, **When** measured against its background, **Then** the contrast ratio meets 4.5:1 minimum.

---

### User Story 3 — Heavy Library Lazy Loading (Priority: P2)

Heavy third-party libraries (pdfjs-dist, tesseract.js, three.js, html2canvas) are loaded only when the user activates the feature that needs them.

**Why this priority**: These libraries total ~3.6MB and are currently loaded upfront, severely impacting initial page load time for all users.

**Independent Test**: Load the app with DevTools Network tab open — verify these libraries are not in the initial bundle.

**Acceptance Scenarios**:

1. **Given** a user loads the app for the first time, **When** the initial bundle is downloaded, **Then** pdfjs-dist, tesseract.js, three.js, and html2canvas are NOT included.
2. **Given** a user clicks "Preview PDF", **When** the preview loads, **Then** pdfjs-dist is dynamically imported and the preview renders after loading.
3. **Given** a user initiates OCR parsing, **When** the feature activates, **Then** tesseract.js is loaded on demand with a loading indicator.

---

### User Story 4 — Unsaved Changes Protection (Priority: P2)

Users are warned before losing unsaved work in the Editor and Portfolio Editor.

**Why this priority**: Accidental data loss is one of the most frustrating user experiences and erodes trust.

**Independent Test**: Make edits in the editor, then try to navigate away or close the tab — a warning should appear.

**Acceptance Scenarios**:

1. **Given** a user has unsaved changes in the resume editor, **When** they click a navigation link, **Then** a confirmation dialog asks "You have unsaved changes. Leave anyway?"
2. **Given** a user has unsaved changes, **When** they try to close/refresh the browser tab, **Then** the browser's native `beforeunload` prompt appears.
3. **Given** a user has no unsaved changes, **When** they navigate away, **Then** no warning is shown.

---

### User Story 5 — Empty States and Onboarding (Priority: P2)

New users see helpful empty states with clear calls-to-action instead of blank areas.

**Why this priority**: First-run experience determines whether users continue using the product.

**Independent Test**: Create a new account and verify every page has a meaningful empty state.

**Acceptance Scenarios**:

1. **Given** a new user with no resumes, **When** they view the dashboard, **Then** they see an illustrated empty state with a "Create your first resume" button.
2. **Given** a user with no job applications, **When** they view the applications page, **Then** a helpful empty state explains the feature.

---

### User Story 6 — Zustand Store Re-render Optimization (Priority: P3)

Components only re-render when the specific store data they depend on changes, not on every store update.

**Why this priority**: Re-render cascades cause noticeable jank in the editor, the most-used feature.

**Independent Test**: Use React DevTools Profiler to verify keystroke in editor only re-renders the active input component.

**Acceptance Scenarios**:

1. **Given** a user is typing in a resume section, **When** a keystroke updates the store, **Then** only the active section component re-renders (not the entire editor).
2. **Given** the dashboard is open, **When** unrelated store state changes, **Then** dashboard components do not re-render.

---

### User Story 7 — React Query Caching Configuration (Priority: P3)

API data is cached appropriately to prevent unnecessary refetches.

**Why this priority**: Reduces API load and improves perceived performance.

**Independent Test**: Navigate between pages and verify network tab shows cached responses being used.

**Acceptance Scenarios**:

1. **Given** job applications were fetched within 5 minutes, **When** the user navigates back to the applications page, **Then** cached data is shown without a network request.
2. **Given** the browser tab is backgrounded, **When** the user returns, **Then** stable data (applications, resumes) is NOT refetched automatically.

---

### Edge Cases

- What happens when skeleton loaders are shown but the request fails? (Show error state, not infinite skeleton)
- What happens when dynamic imports fail due to network issues? (Show retry prompt, not blank component)
- What happens when `beforeunload` is blocked by the browser? (Rely on React Router blocker as fallback)
- What happens with extremely long resume content in the editor? (Virtualize long section lists)
- What happens when a user with `prefers-reduced-motion` visits? (All animations should be suppressed)

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST show a loading skeleton on EditorPage within 100ms of navigation
- **FR-002**: System MUST show a loading skeleton on JobDetailPage instead of returning null
- **FR-003**: All icon-only buttons MUST have descriptive `aria-label` attributes
- **FR-004**: All interactive elements MUST show a visible `focus-visible` indicator
- **FR-005**: All text MUST meet WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- **FR-006**: `pdfjs-dist`, `tesseract.js`, `three.js`, and `html2canvas` MUST be dynamically imported
- **FR-007**: EditorPage and PortfolioEditorPage MUST warn users before navigating away with unsaved changes
- **FR-008**: Dashboard and ApplicationsPage MUST show meaningful empty states for zero-item scenarios
- **FR-009**: Disabled buttons MUST use minimum `opacity-50` and `cursor-not-allowed`
- **FR-010**: Zustand store selectors MUST use `useShallow` or equivalent to prevent unnecessary re-renders
- **FR-011**: React Query hooks MUST set appropriate `staleTime` for stable data (minimum 5 minutes for lists)
- **FR-012**: Notification polling MUST pause when the browser tab is hidden
- **FR-013**: Editor text inputs MUST debounce store updates (minimum 300ms)
- **FR-014**: Status indicators MUST NOT rely solely on color to convey meaning
- **FR-015**: All page components MUST use `React.lazy()` for code splitting

### Key Entities

- **Loading State**: Visual placeholder shown while data is being fetched (skeleton, spinner)
- **Empty State**: Informative UI shown when a collection has zero items, with CTA
- **Focus Indicator**: Visual ring/outline shown on keyboard-focused interactive elements

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: No page shows a blank/null state during data loading (0 occurrences of `return null` in loading paths)
- **SC-002**: 100% of icon-only buttons have `aria-label` attributes (automated test)
- **SC-003**: Initial bundle size reduced by at least 2MB after lazy-loading heavy libraries
- **SC-004**: Lighthouse Accessibility score improves to 90+ (from current baseline)
- **SC-005**: Editor keystroke-to-render latency under 50ms (React Profiler measurement)
- **SC-006**: All text elements meet WCAG 2.1 AA contrast requirements (axe-core audit passes)
- **SC-007**: Unsaved changes warning fires on both browser close and in-app navigation

---

## Out of Scope

- Backend/edge function performance (covered in spec 017)
- Database query optimization
- SEO improvements
- Internationalization (i18n)
- Native mobile app considerations
- Complete design system overhaul (this audit focuses on fixes, not redesign)
- Low-severity items (addressed in future iterations)
