# Feature Specification: Expand Full-Tree Test Coverage

**Feature Branch**: `010-expand-test-coverage`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "Expand the unit test coverage to achieve 80 percent minimum across the full src tree by adding tests for untested modules including Resume, Auth, and Settings pages"

## Feature Goal

Close the gap between the 80% coverage threshold configured in the project and the actual coverage achieved. The current test suite covers ~15-20% of the source tree, focusing primarily on portfolio-related components. This feature adds tests for the remaining critical untested modules to make the 80% threshold enforceable in practice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resume Module Coverage (Priority: P1)

As an engineering team, we want all Resume-related pages, components, and data hooks to have automated tests so that we prevent regressions in the most business-critical data flows of the application.

**Why this priority**: The Resume module is the primary value proposition of WiseResume. Regressions here have the highest user impact.

**Independent Test**: Can be fully tested by running the test suite filtered to `src/**resume**` and verifying each test file passes with meaningful assertions.

**Acceptance Scenarios**:

1. **Given** a user with existing resume data, **When** tests simulate loading that data, **Then** the test asserts the resume display renders all expected fields (position, company, dates, skills).
2. **Given** a simulated save operation with valid resume data, **When** tests invoke the resume update logic, **Then** the test verifies the mutation is called with the correct payload.

---

### User Story 2 - Authentication Flow Coverage (Priority: P1)

As an engineering team, we want the authentication entry points (login, registration, protected routes) to have automated tests so that we immediately detect any regressions in the critical user authentication path.

**Why this priority**: A broken auth flow means zero users can access the application. This is the highest-risk regression category.

**Independent Test**: Can be fully tested by mounting auth components with mocked auth provider states and asserting the correct routing and rendering behavior.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to a protected page, **Then** the test asserts they are redirected to the login/landing screen.
2. **Given** an authenticated user session (mocked), **When** they visit the login page, **Then** the test asserts they are redirected away from it to their dashboard.

---

### User Story 3 - Settings & Profile Module Coverage (Priority: P2)

As an engineering team, we want the Settings and Profile management pages to have automated tests so that we can confidently change profile data handling logic without risking silent data loss bugs.

**Why this priority**: Profile settings directly affect data shown on the public portfolio — silent failures here can damage user's professional reputation.

**Independent Test**: Can be fully tested by mounting the Settings/Profile page with mock profile data and simulating field changes and save actions.

**Acceptance Scenarios**:

1. **Given** a loaded user profile, **When** a test simulates updating the full name field and triggering a save, **Then** the test asserts the save handler is called with the updated value.
2. **Given** a save operation that fails (mocked error), **When** the save is attempted, **Then** the test asserts an error state is shown to the user.

---

### User Story 4 - Coverage Threshold Enforcement Validation (Priority: P2)

As an engineering team, we want proof that the 80% coverage threshold passes in CI without false negatives, so that we trust the coverage gate is actually enforceable rather than just configured.

**Why this priority**: A misconfigured threshold gives a false sense of security. Passing CI with 15% coverage while the threshold says 80% means the gate is silently broken.

**Independent Test**: Run `npm run test:coverage` and verify the output shows all four metrics (lines, functions, branches, statements) meeting or exceeding 80% without errors.

**Acceptance Scenarios**:

1. **Given** the expanded test suite, **When** `npm run test:coverage` is run, **Then** the coverage report shows ≥80% for all four metrics with exit code 0.
2. **Given** the coverage threshold is met, **When** a developer intentionally deletes a test, **Then** the coverage command fails as expected.

---

### Edge Cases

- What happens when a module has zero test coverage and is excluded from the coverage `include` patterns?
- How does the system handle test files that mock entire modules — do they still count toward coverage?
- What occurs when a component has complex conditional rendering with many branches that are hard to reach?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST include tests for the primary Resume editor data flow (loading, displaying, and updating resume entries).
- **FR-002**: The test suite MUST include tests for the authentication routing behavior (protected route redirection for unauthenticated users).
- **FR-003**: The test suite MUST include tests for the Profile/Settings page (loading profile data, updating fields, and save behavior).
- **FR-004**: Running the coverage command MUST produce exit code 0 with all 4 coverage metrics (lines, branches, functions, statements) at or above 80%.
- **FR-005**: New tests MUST use the established global mock infrastructure (Supabase, framer-motion, sonner, haptics) without introducing redundant local mocks.
- **FR-006**: Coverage enforcement MUST remain active in the GitHub Actions CI pipeline for all pull requests.

### Key Entities

- **Resume Module**: Pages, components, and hooks related to creating, editing, and viewing resumes.
- **Auth Module**: Protected route guards, login page, and Kinde authentication integration.
- **Profile/Settings Module**: Pages and hooks for viewing and editing user profile data.
- **Coverage Report**: The automated output from the test runner measuring how much source code is exercised by tests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running `npm run test:coverage` exits with code 0 — meaning all 166+ tests pass AND all 4 coverage metrics are ≥80%.
- **SC-002**: The number of test files increases from 26 to at minimum 35, covering Resume, Auth, and Settings modules.
- **SC-003**: Zero regressions are introduced to the existing 166 passing tests.
- **SC-004**: The GitHub Actions CI coverage gate is verified to fail as expected when a test is deliberately removed (proving the threshold is enforced, not silently bypassed).
- **SC-005**: All new test files follow the project's established mock patterns documented in `CONTRIBUTING.md`.
