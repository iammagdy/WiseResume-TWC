---
description: "Task list for Expand Full-Tree Test Coverage"
---

# Tasks: Expand Full-Tree Test Coverage

**Input**: Design documents from `/specs/010-expand-test-coverage/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure (None needed as project structure is already set up and test environment configured)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T001 Verify active coverage enforcement configuration in `vitest.config.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Authentication Flow Coverage (Priority: P1)

**Goal**: Authentication entry points (login, registration, protected routes) have automated tests to detect regressions in critical path.

**Independent Test**: Can be fully tested by mounting auth components with mocked auth provider states.

### Implementation for User Story 2

- [ ] T002 [P] [US2] Create test file for Login Page in `src/__tests__/auth/LoginPage.test.tsx` checking redirection logic
- [ ] T003 [P] [US2] Create test file for Protected Routes in `src/__tests__/auth/ProtectedRoute.test.tsx` verifying unauthorized redirects

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 4: User Story 1 - Resume Module Coverage (Priority: P1)

**Goal**: Resume pages, components, and hooks have automated tests to prevent regressions.

**Independent Test**: Can be fully tested by running test suite filtered to resume-related files.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Create tests for Resume Editor loading and display in `src/__tests__/resume/ResumeEditor.test.tsx`
- [ ] T005 [P] [US1] Create tests for Resume update flow and save mutation in `src/__tests__/resume/ResumeDataFlow.test.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Settings & Profile Module Coverage (Priority: P2)

**Goal**: Settings and Profile management pages have automated tests to catch silent logic failures.

**Independent Test**: Mount the Settings/Profile page with mock data and simulate save actions.

### Implementation for User Story 3

- [ ] T006 [P] [US3] Create tests for Profile field updates in `src/__tests__/settings/ProfileSettings.test.tsx`
- [ ] T007 [P] [US3] Create tests for Account management errors/saves in `src/__tests__/settings/AccountSettings.test.tsx`

**Checkpoint**: All component user stories should now be independently functional

---

## Phase 6: User Story 4 - Coverage Threshold Enforcement Validation (Priority: P2)

**Goal**: 80% coverage threshold passes in CI without false negatives.

**Independent Test**: Run `npm run test:coverage` and verify output.

### Implementation for User Story 4

- [ ] T008 [US4] Run full coverage command `npm run test:coverage` and verify 80% across statements, branches, functions, lines
- [ ] T009 [US4] Validate CI checks explicitly block on threshold failure by testing a manual revert (local verify only)

**Checkpoint**: Coverage gate is actively verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T010 Run final test suite to ensure zero regressions across old and new tests `npm run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A
- **Foundational (Phase 2)**: Starts first
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Can proceed in parallel

### User Story Dependencies

- **US2 (P1 Auth)**: Can start after foundation
- **US1 (P1 Resume)**: Can start after foundation
- **US3 (P2 Settings)**: Can start after foundation
- **US4 (P2 Threshold)**: Must run after US1, US2, US3 to have enough coverage to pass

### Parallel Opportunities

- Tests for Auth, Resume, and Settings can all be authored in parallel by different resources. All files are distinct (`src/__tests__/...`).

## Implementation Strategy

1. Complete Foundational verification
2. Build Auth tests first (highest risk flow)
3. Build Resume tests
4. Build Settings tests
5. Verify Coverage threshold
