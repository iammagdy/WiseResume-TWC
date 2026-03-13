# Implementation Plan: Expand Full-Tree Test Coverage

**Branch**: `010-expand-test-coverage` (merged into `fix/analysis-gaps`) | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-expand-test-coverage/spec.md`

## Summary

Expand the unit test coverage to achieve 80 percent minimum across the full `src` tree by adding tests for untested modules including Resume, Auth, and Settings pages. This closes the gap between the configured 80% coverage threshold and the actual coverage, making the threshold enforceable in practice.

## Technical Context

**Language/Version**: TypeScript / React (Vite)
**Primary Dependencies**: React Testing Library, Vitest, Kinde Auth (mocked)
**Testing**: Vitest with `@testing-library/react` and `@testing-library/user-event`
**Target Platform**: Web application (Frontend)
**Project Type**: Next/Vite web application
**Performance Goals**: N/A for tests, but CI should remain fast.
**Constraints**: Follow the global mock pattern established in `CONTRIBUTING.md`. Avoid excessive local mocking.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
- Testing strategy aligns with project governance (80% coverage mandate).
- Independent user value is delivered by ensuring critical flows (auth, resume, settings) don't regress.

## Project Structure

### Documentation (this feature)

```text
specs/010-expand-test-coverage/
├── plan.md              # This file
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
src/
├── __tests__/
│   ├── auth/
│   │   ├── LoginPage.test.tsx
│   │   └── ProtectedRoute.test.tsx
│   ├── resume/
│   │   ├── ResumeEditor.test.tsx
│   │   └── ResumeDataFlow.test.tsx
│   └── settings/
│       ├── ProfileSettings.test.tsx
│       └── AccountSettings.test.tsx
```

**Structure Decision**: Place all new test files in the `src/__tests__` directory, grouped by feature domains (auth, resume, settings) matching the application structure. Rely on established mocks from `setup-tests.ts`.

## Implementation Strategy

1.  **Auth Flow Testing**:
    *   Create `LoginPage.test.tsx`. Mock `useKindeAuth` to test unauthenticated and authenticated states.
    *   Test redirects.
2.  **Resume Module Testing**:
    *   Create tests for resume editing sections.
    *   Mock Supabase queries and mutations from `useResume` hooks.
    *   Verify form behavior, field updates, and save payload construction.
3.  **Settings Module Testing**:
    *   Create tests for profile data forms.
    *   Simulate updating `fullName`, `headline`, etc., and verify save handlers are invoked.
4.  **Coverage Verification**:
    *   Run `npm run test:coverage` continuously to verify the 80% threshold across lines, branches, functions, and statements.
