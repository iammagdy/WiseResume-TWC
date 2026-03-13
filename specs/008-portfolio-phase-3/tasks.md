# Tasks: Portfolio Phase 3 – Low Portfolio Fixes

**Branch**: `008-portfolio-phase-3` | **Status**: Complete
**Goal**: Polish UX, output quality, and design accuracy for the Portfolio feature.

## Phase 1: Setup
- [x] T001 Sync with current codebase and ensure all dependencies are installed with `npm install`
- [x] T002 Verify existence of `src/lib/html2canvasRetry.ts` and confirm PDF capture logic

## Phase 2: Foundational
- [x] T003 [P] Create `src/lib/urlUtils.ts` with `normalizeUrl` and `isValidUrl` helpers
- [x] T004 [P] Create `src/styles/print-safe.css` with simplified styles for PDF exports
- [x] T005 [P] Implement `pf-preview-reset` class in global CSS (or a dedicated CSS module) for design isolation

## Phase 3: Output Quality - PDF Export Fidelity (US1)
**Goal**: Improve readability and layout preservation in PDF exports.
**Test Criteria**: Generated PDF reflects simplified "print-safe" styling without visual artifacts from complex CSS filters.
- [x] T006 [US1] Update `handleDownload` in `src/pages/PublicPortfolioPage.tsx` to use an `onclone` callback for `captureWithRetry`
- [x] T007 [US1] Implement CSS injection logic in `onclone` to add `print-safe.css` to the cloned document
- [x] T008 [US1] Apply `data-pdf-force-layout` attribute to the `portfolio-content` container during capture

## Phase 4: Content Rendering - Portfolio Summary (US2)
**Goal**: Display the `portfolioSummary` tagged below the hero section.
**Test Criteria**: Entered summary appears correctly on the public portfolio page.
- [x] T009 [US2] Update `PublicPortfolioPage.tsx` to extract `portfolioSummary` from `portfolioExtras`
- [x] T010 [US2] Implement a dedicated summary rendering section/component below the Hero and before the StatsStrip
- [x] T011 [US2] Apply appropriate theme-consistent typography to the summary section

## Phase 5: Input Validation - Social Link Normalization (US3)
**Goal**: Automatically add `https://` to social links where missing.
**Test Criteria**: Links input like `linkedin.com/user` are saved as `https://linkedin.com/user`.
- [x] T012 [US3] Implement `normalizeUrl` logic in `src/components/portfolio/editor/MoreTab.tsx` for all social link fields (via `onBlur` handlers)
- [x] T013 [US3] `onBlur` handlers on all social link inputs trigger normalization immediately in the UI

## Phase 6: Design Accuracy - Preview Isolation (US4)
**Goal**: Prevent page theme styles from bleeding into "Design" tab previews.
**Test Criteria**: Theme previews in the editor look consistent regardless of the active page theme.
- [x] T014 [US4] Wrap mini-preview cards in `src/components/portfolio/editor/ThemeStorePicker.tsx` with the `pf-preview-reset` class
- [x] T015 [US4] (Optional) Refactor to use a Shadow Root if CSS scoping proves insufficient for absolute isolation

## Phase 7: Polish & Verification
- [x] T016 [P] Run `npm run test` to verify `normalizeUrl` and summary rendering
- [x] T017 Perform manual verification of PDF exports across multiple themes
- [x] T018 Verify URL normalization in the editor for all supported social platforms
- [x] T019 Confirm no style leakage in the Design tab previews under high-contrast theme changes

## Dependencies
US1 (PDF) and US2 (Rendering) are independent but share `PublicPortfolioPage`. US3 and US4 are independent.

## Implementation Strategy
1.  **Utilities First**: Implement `urlUtils` and `print-safe.css` (Phase 2).
2.  **Logic Fixes**: Solve the social link issue (US3) and summary rendering (US2).
3.  **Visual Polish**: Improve PDF export (US1) and preview isolation (US4).
