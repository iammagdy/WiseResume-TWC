# Implementation Plan: UI/UX & Front-End Performance Audit (Round 1)

**Branch**: `018-ui-ux-performance-audit` | **Date**: 2026-03-19 | **Spec**: `specs/018-ui-ux-performance-audit/spec.md`

## Summary

Fix P1 (Critical) and P2 (High) issues across UX, accessibility, and front-end performance. Key deliverables: inline loading skeletons on EditorPage/JobDetailPage, unsaved changes protection on PortfolioEditorPage, High-severity a11y fixes (aria-labels, focus-visible, contrast), lazy-loading of three.js/html2canvas, and editor-scoped Zustand re-render optimization.

## Pre-Implementation Research Findings

Research agents verified the current codebase state. Several spec issues are **already resolved**:

| Issue | Status | Notes |
|-------|--------|-------|
| UX-003 Dashboard empty state | ✅ Already exists | `EmptyState` component in DashboardPage.tsx |
| UX-004 Applications empty state | ✅ Already exists | Multiple empty states (zero apps, filtered, saved jobs) |
| UX-006 Editor unsaved changes | ✅ Already exists | `beforeunload` + `useUnsavedChangesGuard` + `UnsavedChangesDialog` |
| PERF-003 pdfjs-dist lazy load | ✅ Already split | Vite config splits into `pdf` chunk |
| PERF-004 tesseract.js lazy load | ✅ Already split | Vite config splits into `ocr` chunk |

**Remaining P1+P2 work** (13 issues):

| ID | Category | Issue |
|----|----------|-------|
| UX-001 | UX | EditorPage returns null during loading (has skeleton in Suspense but page itself returns null) |
| UX-002 | UX | JobDetailPage returns null during loading (same pattern) |
| UX-005 | UX | PortfolioEditorPage has NO unsaved changes protection |
| A11Y-001 | A11y | Placeholder text contrast too low (opacity-60) |
| A11Y-002 | A11y | Disabled button opacity at 30% |
| A11Y-003 | A11y | Missing aria-labels on icon-only buttons (34+ components) |
| A11Y-004 | A11y | Missing focus-visible indicators (34+ components) |
| PERF-001 | Perf | Missing staleTime/gcTime on useJobApplications |
| PERF-002 | Perf | 12 editor-related components use broad store destructuring |
| PERF-005 | Perf | three.js/SkyWallpaperCanvas not lazy-loaded or chunk-split |
| PERF-006 | Perf | html2canvas statically imported in wrapper (html2canvasRetry.ts) |

## Technical Context

**Language/Version**: TypeScript 5.x, React 18
**Primary Dependencies**: Zustand, React Query (TanStack), Tailwind CSS, Radix UI, Framer Motion, Lucide React
**Testing**: Manual audit (Lighthouse + screen reader). No automated a11y tests this round.
**Target Platform**: Web (Chrome, Firefox, Safari, Edge) + Capacitor mobile
**Constraints**: No broad refactoring outside editor. Minimize risk of regressions.

## Clarification Decisions

1. **Scope**: P1 + P2 only. P3/Low deferred.
2. **Skeleton Loaders**: Reusable shimmer component; mirror Editor and Job Detail layouts.
3. **Accessibility**: High-severity only (contrast, aria-labels, focus indicators).
4. **Heavy Libraries**: Verified — pdfjs/tesseract already chunk-split. three.js and html2canvas need work.
5. **Unsaved Changes**: PortfolioEditorPage only (Editor already done).
6. **Empty States**: Already exist on Dashboard and Applications — no work needed.
7. **Store Re-renders**: Editor components only (12 broad-destructuring components).
8. **Testing**: Manual audit only.

## Project Structure

### Files to Create

```text
src/components/ui/ShimmerSkeleton.tsx        # Reusable shimmer/skeleton primitive
```

### Files to Modify

```text
# UX Fixes
src/pages/EditorPage.tsx                     # Inline skeleton instead of return null
src/pages/JobDetailPage.tsx                  # Inline skeleton instead of return null
src/pages/PortfolioEditorPage.tsx            # Add unsaved changes protection

# A11y Fixes
src/index.css (or globals.css)               # Global focus-visible + placeholder contrast styles
src/components/editor/*.tsx                  # Add aria-labels to icon-only buttons
src/components/dashboard/*.tsx               # Add aria-labels to icon-only buttons
src/components/ui/button.tsx                 # Fix disabled opacity, add focus-visible default
(+ ~30 other components with icon-only buttons — exact list determined during implementation)

# Performance Fixes
src/hooks/useJobApplications.ts              # Add staleTime/gcTime
src/components/ui/SkyWallpaperCanvas.tsx      # Wrap consumer in React.lazy
src/lib/html2canvasRetry.ts                  # Convert to dynamic import
vite.config.ts                               # Add three.js to chunk splitting

# Editor Store Selectors (limited scope)
src/components/editor/JobAnalysisSheet.tsx    # useShallow selector
src/components/editor/TemplateSelector.tsx    # useShallow selector
src/components/editor/VersionHistorySheet.tsx # useShallow selector
src/components/editor/CoverLetterGenerator.tsx # useShallow selector
src/components/editor/MultiJobCompareSheet.tsx # useShallow selector
(+ other editor sheets with broad destructuring)
```

## Phase-by-Phase Approach

### Phase 1: Global Styles & Primitives (Low Risk)

**Goal**: Establish global a11y improvements and the reusable skeleton component.

1. **Create `ShimmerSkeleton.tsx`** — A generic animated skeleton primitive with configurable width/height/rounded props. Uses Tailwind `animate-pulse` or CSS shimmer keyframe.

2. **Global focus-visible styles** — Add to `index.css` or Tailwind config:
   - `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` on all interactive elements
   - Override Tailwind's outline reset for keyboard navigation

3. **Global placeholder contrast** — Increase placeholder opacity from 60% to 75%+ or set explicit colors meeting 4.5:1 ratio.

4. **Fix disabled button opacity** — Change from `opacity-30` to `opacity-50` + `cursor-not-allowed` in button component variants.

**Checkpoint**: Visually verify focus rings appear on tab navigation, placeholder text is readable, disabled buttons are visible.

### Phase 2: Loading State Fixes (Low Risk)

**Goal**: Eliminate blank screens on EditorPage and JobDetailPage.

1. **EditorPage** — Replace `return null` loading paths with inline `<EditorSkeleton />` (already exists in `PageSkeletons.tsx`). The Suspense boundary still acts as outer fallback.

2. **JobDetailPage** — Replace `return null` with inline `<DetailSkeleton />`.

**Checkpoint**: Navigate to both pages with throttled network — skeleton appears immediately, no blank flash.

### Phase 3: Unsaved Changes Protection (Low Risk)

**Goal**: Prevent accidental data loss on PortfolioEditorPage.

1. **Add `beforeunload` handler** — Same pattern as EditorPage (compare current vs saved state).
2. **Add React Router navigation guard** — Reuse `useUnsavedChangesGuard` hook + `UnsavedChangesDialog` from EditorPage.
3. **Track dirty state** — Compare current portfolio state to last-saved snapshot.

**Checkpoint**: Edit portfolio, try to navigate away — dialog appears. Save and navigate — no dialog.

### Phase 4: Aria Labels (Medium Risk — Many Files)

**Goal**: Add descriptive `aria-label` to all icon-only buttons.

1. **Audit all icon-only buttons** — Grep for `<Button` and `<button` with icon children but no text content or aria-label.
2. **Add `aria-label` props** — Descriptive labels like "Delete resume", "Close dialog", "Edit section".
3. **Prioritize editor components** first, then dashboard, then remaining.

**Checkpoint**: Screen reader (NVDA/VoiceOver) announces all buttons meaningfully. No "button" without context.

### Phase 5: Performance — Lazy Loading (Medium Risk)

**Goal**: Remove three.js and html2canvas from the initial bundle.

1. **SkyWallpaperCanvas** — Find the parent that imports it; wrap with `React.lazy()` + `<Suspense fallback={null}>`. Add `three` to Vite's `manualChunks`.

2. **html2canvasRetry.ts** — Convert the static `import html2canvas from 'html2canvas'` to a dynamic `const html2canvas = (await import('html2canvas')).default` inside the exported functions. This makes all consumers automatically lazy.

3. **Verify** — Run `npx vite build` and check chunk output. three.js and html2canvas should NOT be in the main chunk.

**Checkpoint**: Initial bundle size decreases. Features still work when triggered.

### Phase 6: Performance — React Query & Store (Low-Medium Risk)

**Goal**: Reduce unnecessary refetches and re-renders in the editor.

1. **useJobApplications** — Add `staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`.

2. **Editor store selectors** — Convert 12 broad-destructuring components to `useShallow` selectors. Limited to editor-related sheets only:
   - JobAnalysisSheet, CareerPathSheet, AIHubSheet, AIDetectorSheet
   - RecruiterSimSheet, OnePageWizardSheet, LinkedInOptimizerSheet
   - AgenticChatSheet, TemplateSelector, VersionHistorySheet
   - CoverLetterGenerator, MultiJobCompareSheet

**Checkpoint**: React DevTools Profiler shows reduced re-render count in editor.

### Phase 7: Manual Verification (No Code Changes)

1. Run Lighthouse accessibility audit — target 90+ score
2. Tab through all major pages — verify focus indicators
3. Test skeleton loaders with slow network throttling
4. Test unsaved changes on PortfolioEditorPage
5. Verify build output — check chunk sizes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Aria-label changes touch 30+ files | Medium | Low | Mechanical changes, easy to review |
| Global CSS changes affect unexpected elements | Medium | Medium | Use `focus-visible` (not `focus`) to avoid mouse-click rings. Test visually. |
| html2canvas dynamic import breaks export flow | Low | High | Test PDF/image export after change. The async pattern is already used in PreviewPage/PublicPortfolioPage. |
| useShallow changes break component behavior | Low | Medium | Each component tested individually. Sheets are already lazy-loaded. |
| three.js lazy load causes flash on first render | Low | Low | Use `fallback={null}` — canvas is decorative, brief absence is acceptable. |

## Open Questions

None — all clarified by user answers. Ready for `/speckit.tasks`.
