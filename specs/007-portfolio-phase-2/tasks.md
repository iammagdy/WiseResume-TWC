# Tasks: Portfolio Phase 2 – Medium Portfolio Fixes

**Branch**: `007-portfolio-phase-2` | **Status**: Complete
**Goal**: Improve stability, performance, and UX precision of the Portfolio feature.

## Phase 1: Setup
- [x] T001 Sync with current codebase and ensure all dependencies are installed with `npm install`
- [x] T002 Verify existence of `src/test/setup.ts` and confirm `matchMedia` mock is present

## Phase 2: Foundational
- [x] T003 [P] Create `src/lib/envUtils.ts` with `isBrowser` check and `getSafeMatchMedia` helper
- [x] T004 [P] Create `src/hooks/usePortfolioTracking.ts` to encapsulate IntersectionObserver and tracking logic
- [x] T005 [P] Create `src/hooks/usePortfolioSEO.ts` to encapsulate SEO-related side effects

## Phase 3: Stability - Guard Environmental Calls (US1)
**Goal**: Prevent crashes in SSR/Capacitor by guarding `window` references.
**Test Criteria**: `PortfolioEditorPage` and `PublicPortfolioPage` do not throw error when `window` is undefined (mocked).
- [x] T006 [US1] Replace module-scope `matchMedia` in `src/pages/PortfolioEditorPage.tsx` with `getSafeMatchMedia` or move to `useEffect`
- [x] T007 [US1] Audit and fix `window` references in `src/hooks/useStatusBar.ts` and `src/hooks/useTilt.ts`
- [x] T008 [US1] Update `src/App.tsx` theme sync to use `isBrowser` guard for `matchMedia` listener

## Phase 4: Performance - Code Splitting (US2)
**Goal**: Reduce main bundle size by extracting and lazy loading large components.
**Test Criteria**: `PublicPortfolioPage` initial JS chunk size reduced; components load on demand.
- [x] T009 [US2] Extract `PublicHero` section from `src/pages/PublicPortfolioPage.tsx` to `src/components/portfolio/public/PublicHero.tsx`
- [x] T010 [US2] Extract `PublicSections` from `src/pages/PublicPortfolioPage.tsx` to `src/components/portfolio/public/PublicSections.tsx`
- [ ] T011 [US2] Implement dynamic imports for theme-specific sub-components in `PublicSections.tsx` *(partial — lazy loading via lazyWithRetry is in place but theme-level splitting is not)*
- [x] T012 [US2] Refactor `PublicPortfolioPage.tsx` to use the new extracted components and hooks

## Phase 5: UX - Sticky Header Stabilization (US3)
**Goal**: Eliminate header flickering during data updates.
**Test Criteria**: Sticky header remains visible and stable through `portfolio` object updates.
- [x] T013 [US3] Refactor `IntersectionObserver` in `PublicPortfolioPage.tsx` to use `useRef` for persistence (encapsulated in `usePortfolioTracking`)
- [x] T014 [US3] Remove `portfolio` from the observer's dependency array; rely only on `heroRef.current`

## Phase 6: Logic - Strength Score Refinement (US4)
**Goal**: Decouple "Publish Status" from content completeness.
**Test Criteria**: 100% score achievable without publishing; "Publish" remains a UI tip.
- [x] T015 [US4] Modify `strengthChecks` in `src/pages/PortfolioEditorPage.tsx` to exclude `portfolioEnabled` from the calculated score
- [x] T016 [US4] Update UI to display the "Publish" tip as an advisory item rather than a completeness requirement

## Phase 7: Polish & Verification
- [x] T017 [P] Run `npm run test` to ensure no regressions in existing components
- [x] T018 Perform manual verification of strength score and sticky header behavior
- [ ] T019 Check network tab for correct code splitting chunks in Public Portfolio view

## Dependencies
US2 depends on US1 (Stability base). US3 depends on US2 (Refactored structure). US4 is independent.

## Implementation Strategy
1.  **Safety First**: Implement `envUtils` and guards (US1).
2.  **Modularize**: Perform the heavy lift of extraction and code splitting (US2).
3.  **Refine**: Fix the flicker (US3) and logic (US4).
