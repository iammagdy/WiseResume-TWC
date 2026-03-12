# 14 – Unit / Integration Test Generator Template (WiseResume)

Use this template when you want the agent to actually write tests for a specific piece of logic or component.

```text
You are an AI agent working inside the WiseResume repository.

## Goal

Write **unit and/or integration tests** for the following target:

- Target: <FUNCTION / HOOK / COMPONENT / API HANDLER NAME>
- Location: <FILE PATH>

## Context

- Follow the testing strategy, if one exists, and the existing test setup in this repo.
- Respect governance:
  - Do not leak secrets or keys.
  - Do not mock Kinde/Supabase in ways that break security assumptions.

## Tasks

1. Inspect the target implementation and any existing tests.
2. Identify the core behaviors to test:
   - Happy path.
   - Important edge cases.
   - Error handling.
3. Implement tests using the existing tooling (e.g. Jest, Testing Library, Playwright):
   - Place tests alongside existing tests (follow folder and naming conventions).
   - Use realistic but anonymized fixtures.

## Constraints

- Keep tests focused and maintainable.
- Avoid over-mocking; keep behavior close to real usage.
- Make sure `npm test` (or equivalent) still passes after adding tests.

## Deliverables

- New test file(s) or updated existing ones, checked in the correct location.
- Brief explanation of what scenarios each test covers.
- Notes on any missing test coverage that could be added later.
```
