# 13 – Testing Strategy / Test Plan Template (WiseResume)

Use this template when you want a testing strategy for a feature or area.

```text
You are an AI agent working inside the WiseResume repository.

## Goal

Define a **testing strategy and test plan** for the following feature or area:

- Feature / Area: <E.G. "Resume Upload & Parsing", "AI Tailor", "Applications Kanban">

## Context

- Respect governance and architecture:
  - Kinde auth, Supabase backend.
  - AI credits and BYOK behavior where relevant.
- Use existing tooling (e.g. Jest/Testing Library, Playwright, or whatever is already set up).

## Tasks

1. Inspect the code and current tests (if any) for this area.
2. Identify key risks and critical behaviors that MUST NOT break.
3. Propose a testing approach that balances value vs effort, including:
   - Unit tests (for pure functions / hooks / components).
   - Integration tests (for feature flows).
   - E2E tests (if appropriate and tooling exists).

4. Produce a **concrete test plan** with sections:
   - Objectives.
   - Scope (what is in/out).
   - Test cases list (high level; ID + short description).
   - Tooling (which test frameworks to use).
   - Data / fixtures needed.

## Output

Do NOT write tests yet. First, output:

- A short summary of the testing goals.
- The proposed test plan with a list of prioritized test cases (P1, P2, P3).
- Recommendations on where to start (e.g. "start with these 3 unit tests").
```
