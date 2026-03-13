# Research: Expand Full-Tree Test Coverage

**Feature Branch**: `010-expand-test-coverage` (in `fix/analysis-gaps`) | **Date**: 2026-03-13

## Consolidate Findings

**Decision**: Use existing Vitest and React Testing Library setup with Kinde Auth mocking.  
**Rationale**: The `CONTRIBUTING.md` explicitly documents the global mock setups for Supabase, Auth, and Framer Motion. Using these prevents unnecessary test scaffolding and meets the criteria without changing the tech stack.

**Decision**: Target 80% coverage locally before integrating with CI via `npm run test:coverage`.  
**Rationale**: It's more efficient to test isolated file groupings (e.g., `resume/`) and then verify the full gate failure behavior.

No further NEEDS CLARIFICATION items. Research phase complete.
