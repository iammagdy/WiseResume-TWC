# Tasks: Add Unit Tests

**Input**: Design documents from `/specs/009-add-unit-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic testing structure

- [x] T001 Install Vitest UI and coverage dependencies (`@vitest/coverage-v8`, `@vitest/ui`) in `package.json`
- [x] T002 Configure `vite.config.ts` to include standard vitest configuration and 80% coverage thresholds
- [x] T003 Create global test setup environment in `src/test/setup.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and mocks that MUST be complete before ANY user story test can run successfully

- [x] T004 Create Supabase client mocks in `src/test/mocks/supabase.ts`
- [x] T005 [P] Create mock entities (Profile, Resume) in `src/test/mocks/data.ts`
- [x] T006 [P] Create global browser mocks (matchMedia, IntersectionObserver) in `src/test/mocks/browser.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Test Foundation and CI Readiness (Priority: P1) 🎯 MVP

**Goal**: Setup command lines and basic runner verification to ensure test suite execution passes quickly and locally.

**Independent Test**: Can be fully tested by running `npm run test` and `npm run test --coverage`.

### Implementation for User Story 1

- [x] T007 [US1] Create a basic sanity test in `src/test/sanity.test.ts` (asserting `1+1=2`) to verify framework routing and reporter configuration
- [x] T008 [US1] Verify Vitest UI starts and displays tests correctly
- [x] T009 [US1] Set up a basic GitHub Action to run `npm test` on PRs (Phase 3)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Core Business Logic Verification (Priority: P2)

**Goal**: Apply automated tests to core data utilities, formatters, and logic hooks.

**Independent Test**: Can be fully tested by isolating UI and checking `src/lib` and `src/hooks` coverage.

### Implementation for User Story 2

- [x] T010 [P] [US2] Write unit tests for `normalizeUrl` and `isValidUrl` in `src/lib/__tests__/urlUtils.test.ts`
- [x] T011 [P] [US2] Write unit tests for environment guards in `src/lib/__tests__/envUtils.test.ts`
- [x] T012 [P] [US2] Write unit tests for PDF capture retry logic in `src/lib/__tests__/html2canvasRetry.test.ts`
- [x] T013 [P] [US2] Write test suite for `usePublicPortfolio` hook in `src/hooks/__tests__/usePublicPortfolio.test.tsx`
- [x] T014 [US2] Execute and verify `npm run test` explicitly for the lib/hooks folders

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - UI Component Interaction Verification (Priority: P3)

**Goal**: Apply automated tests to presentation logic and interactive component mounting.

**Independent Test**: UI components mount successfully using React Testing Library without throwing invariant errors.

### Implementation for User Story 3

- [x] T015 [P] [US3] Write component tests for `PublicHero` in `src/components/portfolio/public/__tests__/PublicHero.test.tsx`
- [x] T016 [P] [US3] Write component tests for `PublicSections` displaying summary in `src/components/portfolio/public/__tests__/PublicSections.test.tsx`
- [x] T017 [P] [US3] Write component tests for `MoreTab` interactions in `src/components/portfolio/editor/__tests__/MoreTab.test.tsx`
- [x] T018 [US3] Write integration tests for `PortfolioEditorPage` in `src/pages/__tests__/PortfolioEditorPage.test.tsx`
- [x] T019 [US4] Write integration tests for `PublicPortfolioPage` in `src/pages/__tests__/PublicPortfolioPage.test.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T020 Add global mocks for `framer-motion`, `sonner`, `haptics`, and `lazyWithRetry` in `src/test/setup.ts` to stabilize CI
- [x] T021 Create `CONTRIBUTING.md` documenting how to write tests, run coverage, and follow mock patterns
- [ ] T022 Run full test suite with `--coverage` and verify all modules exceed the 80% threshold

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Basic runner & CI setup)
4. **STOP and VALIDATE**: Test User Story 1 independent execution

### Incremental Delivery

1. Foundation ready (Phase 1+2)
2. Add US1 → Test independently
3. Add US2 → Verify core logic coverage
4. Add US3 → Verify UI component behavior
