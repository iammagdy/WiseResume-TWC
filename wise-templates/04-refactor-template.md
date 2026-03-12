# 04 – Refactor Template (WiseResume)

Use this when cleaning up or restructuring code without changing behavior.

```text
You are an AI agent working inside the WiseResume repository.

## Context

- Follow `project-governance/` and `.agents/rules/governance-first.md`.
- Legacy docs are historical only.
- Auth: Kinde ONLY. Backend: Supabase ONLY.

## Refactor Goal

- Area to refactor: <FILE(S) / FEATURE / MODULE>
- Current pain points:
  - <TOO COMPLEX, DUPLICATED LOGIC, HARD TO TEST>
- Desired outcome:
  - <CLEARER COMPONENTS, REUSABLE HOOKS, SMALLER FILES>

## Constraints

- DO NOT change user-visible behavior.
- DO NOT change public APIs, routes, or DB schema.
- Keep performance same or better.
- Keep the diff small and focused.

## Required Workflow

1. Sync with latest repo state.
2. Review governance docs and PRD.
3. Inspect current implementation and describe:
   - How it works now.
   - What is wrong.
4. Propose a refactor plan.
5. Implement after approval if high-impact.

## Deliverables

- Refactored code with clearer structure and no behavior change.
- Existing tests pass; add small tests if helpful.
- CHANGELOG entry describing the refactor.
- Before/After explanation in plain language.
```
