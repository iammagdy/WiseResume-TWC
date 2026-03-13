---
description: "Task list for Theme-Level Code Splitting"
---

# Tasks: Theme-Level Code Splitting

**Input**: Design documents from `/specs/011-theme-code-splitting/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [ ] T001 Create themes directory structure in `src/components/portfolio/public/themes/`
- [ ] T002 Create barrel file `src/components/portfolio/public/themes/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T003 Define `ThemeRendererProps` interface in `src/components/portfolio/public/themes/index.ts` containing profile, resume, styles, etc.
- [ ] T004 Build generic loading skeleton component in `src/components/portfolio/public/themes/ThemeSkeleton.tsx` to display during chunk load

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 2 - Clean Developer Experience (Priority: P2)

**Goal**: Each theme's rendering logic lives in its own dedicated file so adding or modifying a theme is isolated.

**Independent Test**: File structure reflects split themes properly exporting conformant components.

### Implementation for User Story 2

- [ ] T005 [P] [US2] Extract `developer-terminal` logic to `src/components/portfolio/public/themes/DeveloperTerminalRenderer.tsx`
- [ ] T006 [P] [US2] Extract `bold-dark` logic to `src/components/portfolio/public/themes/BoldDarkRenderer.tsx`
- [ ] T007 [P] [US2] Extract default theme logic to `src/components/portfolio/public/themes/DefaultThemeRenderer.tsx`

**Checkpoint**: At this point, User Story 2 should be fully functional and isolated structurally

---

## Phase 4: User Story 1 - Faster Initial Load for Visitors (Priority: P1)

**Goal**: Portfolio page starts displaying content faster by only loading the active theme bundle initially.

**Independent Test**: Bundle size inspection shows initial chunk of `PublicPortfolioPage` reduced by at least 30%.

### Implementation for User Story 1

- [ ] T008 [US1] Create dynamic import map in `src/components/portfolio/public/themes/index.ts` wrapping the theme files with `React.lazy`
- [ ] T009 [US1] Refactor `PublicSections.tsx` to resolve the current theme component dynamically using `React.Suspense` with `ThemeSkeleton` fallback
- [ ] T010 [US1] Implement graceful fallback mapping to default theme for unknown or unsupported theme IDs

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - No Regression in Portfolio Rendering (Priority: P1)

**Goal**: Public portfolio looks and behaves exactly as it did before refactoring.

**Independent Test**: Load a public portfolio in all supported themes visually comparing identical rendering pre vs post split.

### Implementation for User Story 3

- [ ] T011 [US3] Ensure Framer Motion animation variants are exported and preserved in `src/components/portfolio/public/themes/animations.ts` (if needed) or tightly coupled in renderers
- [ ] T012 [US3] Verify missing props and intersections/observers still function correctly inside split theme renderers (e.g. `pf-exp-card` observer logic inside `Experience`)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T013 Run production build to confirm `vite` successfully outputs split chunks for themes `npm run build`
- [ ] T014 Run unit test suite to ensure no breakage `npm run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A
- **Foundational (Phase 2)**: Starts first
- **User Stories**: US2 (Extraction) -> US1 (Lazy Loading integration) -> US3 (Regression Verify)

### User Story Dependencies

- **US2 (P2 Developer EX)**: MUST run first to create files to lazy load
- **US1 (P1 Split Load)**: Must run after US2 completes
- **US3 (P1 No Regressions)**: Must run after US1 and US2 complete

### Parallel Opportunities

- Theme rendering components (`DeveloperTerminalRenderer`, `BoldDarkRenderer`, `DefaultThemeRenderer`) can all be extracted in parallel under US2.

## Implementation Strategy

1. Create interfaces and setup (Phase 1/2)
2. Extract all logic per theme (US2)
3. Wire up `React.lazy` and Suspense boundaries in `PublicSections.tsx` (US1)
4. Verify animations and observer logic still perform flawlessly (US3)
5. Production bundle verify
