# 12 – UI Analyze Template (WiseResume)

Use this template to analyze and critique the UI/UX of a specific screen or flow.

```text
You are an AI agent working inside the WiseResume repository.

## Goal

Perform a focused **UI/UX analysis** for the following area of WiseResume:

- Area: <SCREEN / ROUTE / FLOW NAME, e.g. "AI Studio Mock Interview" or "Applications Kanban">

## Context

- Follow product and design expectations from:
  - project-governance/PRODUCT.md
  - project-governance/BRANDING.md
  - project-governance/ARCHITECTURE.md
  - project-governance/WORKFLOW.md
- Respect:
  - Mobile-first design.
  - Dark theme.
  - Bottom navigation patterns.
  - Design tokens for colors/typography.

## Tasks

1. Inspect the relevant UI components, layouts, and styles for this area.
2. Describe the current user experience in simple language:
   - What the user sees first.
   - How they navigate.
   - Where they might get confused or stuck.

3. Provide a **UI/UX critique** organized as:
   - Strengths (what is working well).
   - Issues (what is confusing, inconsistent, or visually off).
   - Opportunities (small improvements that would significantly improve UX).

4. For each issue, propose a **minimal** and **realistic** improvement, e.g.:
   - Adjust spacing / alignment.
   - Improve button labels.
   - Add helper text or empty states.
   - Reorder actions or tabs.

## Output

Do NOT make code changes yet. Output:

- A brief narrative of the current UX.
- A bullet list of issues and suggested improvements.
- A short list of "Top 3" UI changes that would have the highest impact for effort.
```
