# Implementation Plan: Add Unit Tests

**Branch**: `009-add-unit-tests` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a comprehensive unit testing foundation utilizing Vitest and React Testing Library (already present in the project), focusing on core business logic, utility functions, and critical UI components. The pipeline must block CI regressions and enforce a strict 80% line coverage threshold.

## Technical Context

**Language/Version**: TypeScript, React 18  
**Primary Dependencies**: Vitest, React Testing Library, jsdom  
**Storage**: N/A for unit tests (Supabase integrations will be mocked)  
**Testing**: Vitest (`test` and `test:watch` commands)  
**Target Platform**: Local execution (Node/jsdom) and GitHub Actions CI  
**Project Type**: Web Application  
**Performance Goals**: Local test execution must complete in under 3 minutes  
**Constraints**: 80% minimum coverage threshold enforced  
**Scale/Scope**: Repository-wide unit test coverage across utils, hooks, and UI components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Preserve Working Behavior**: Yes, testing only hardens existing behavior without modifying runtime code.
- [x] **Backend Assumption**: Yes, Supabase auth/db will be correctly mocked where tested. No real DB modifications required.
- [x] **Agent Workflow & Independence**: Yes, the existing testing dependencies (Vitest) in `package.json` were inspected prior to planning.
- [x] **UI/UX Audit**: N/A, UI visual changes are out of scope.

## Project Structure

### Documentation (this feature)

```text
specs/009-add-unit-tests/
├── plan.md              # This file
├── research.md          # Testing framework choices
├── data-model.md        # Mock data structures
├── quickstart.md        # Testing commands guide
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)
```text
src/
├── test/
│   ├── setup.ts         # Vitest + React Testing Library setup
│   ├── mocks/           # Mock data and server stubs (Supabase)
│   ├── utils/           # Test utilities
│   ├── components/      # UI component tests
│   └── hooks/           # Hook tests
└── [existing src layout]
```

**Structure Decision**: Using the default frontend structure, organizing tests mirroring the `src/` directory layout. Tests will be placed alongside their target files or in dedicated `__tests__` folders within `src`.


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
