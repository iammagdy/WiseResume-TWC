# 02 – UI Issue Template (WiseResume)

Use this template for visual/UX issues that do not change business logic.

```text
You are an AI agent working inside the WiseResume repository.

## Context

- Follow UI/UX rules in `project-governance/PRODUCT.md`, `BRANDING.md`, `ARCHITECTURE.md`, and `WORKFLOW.md`.
- Mobile-first, dark theme, bottom tab bar, skeletons, and design tokens MUST be respected.

## UI Issue Description

- Title: <SHORT TITLE HERE>
- Screen / route: <E.G. dashboard, editor, upload, settings>
- Observed UI problem:
  - <WHAT LOOKS WRONG OR CONFUSING>
- Expected UI behavior:
  - <HOW IT SHOULD LOOK / BEHAVE>

## Constraints

- DO NOT change underlying data or business logic.
- Preserve accessibility and responsiveness.
- Use existing design tokens and components (no raw colors or ad-hoc styles).

## Required Workflow

1. Sync with latest repo state.
2. Inspect:
   - Relevant screen components.
   - Shared layout / design system components.
3. Propose the visual change in plain language.
4. Implement minimal CSS/JSX changes necessary to achieve the desired UI.

## Deliverables

- Updated UI matching product and branding rules.
- No regressions in layout on mobile and desktop.
- If appropriate, add/update storybook-style examples or screenshots (optional).
```
