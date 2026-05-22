# Visual Reference Guide

This file explains how the interactive visual preview connects to the production design-system documentation.

## Purpose

The folder `interactive-preview/` is the visual source of truth for how WiseResume and WiseHire should feel in UI mockups and high-level design exploration.

The production documentation files are the implementation source of truth for how the design should be safely applied to the real app.

Use both together:

- `interactive-preview/` answers: **What should it look and feel like?**
- `DESIGN_TOKENS.md` answers: **What tokens should be used?**
- `COMPONENT_LIBRARY.md` answers: **What reusable components should exist?**
- `PRODUCT_FLOWS.md` answers: **How should the product behave across real flows?**
- `MOBILE_RULES.md` answers: **How should it work on mobile?**
- `ACCESSIBILITY.md` answers: **How should it stay usable and accessible?**
- `IMPLEMENTATION_GUIDE.md` answers: **How should an AI coding agent implement it safely?**
- `AUDIT_CHECKLIST.md` answers: **How do we check the current app before changing code?**
- `CLAUDE_CODE_PROMPTS.md` answers: **What prompts should be used for Claude Code, Codex, Replit, or similar agents?**
- `design.md` answers: **What should any design AI agent understand immediately?**

## How to open the preview

Open this file in a browser:

```txt
interactive-preview/WiseResume Design System.html
```

Use it to review:

- Brand identity
- WiseResume crimson system
- WiseHire royal-blue system
- Typography rhythm
- Spacing/radius/shadow feel
- Buttons
- Inputs
- Badges
- Cards
- ATS score ring
- AI sheet
- Toasts
- Dashboard patterns
- Editor patterns
- Brand switching behavior

## Important rule

Do **not** copy the preview code directly into the production app without review.

The preview is useful for visual direction, but the real app should use the existing app architecture, Tailwind setup, shadcn/ui components, and production tokens.

## Preview-to-production mapping

| Interactive preview pattern | Production meaning | Recommended production component |
|---|---|---|
| Crimson primary button | WiseResume primary CTA | `Button variant="primary"` scoped to `data-product="wiseresume"` |
| Blue primary button | WiseHire primary CTA | `Button variant="primary"` scoped to `data-product="wisehire"` |
| Score ring | Resume/job match score visualization | `AtsScoreRing` / `MatchScoreRing` |
| AI sheet | Assistant suggestions and guided actions | `AiSuggestionSheet` |
| Dashboard cards | Summary/metric/task grouping | `MetricCard`, `ResumeCard`, `ActionCard` |
| Editor pattern | Resume editing workspace | `ResumeEditorLayout` |
| Badge patterns | State, score, keyword, plan, or status labels | `Badge` variants |
| Toast examples | Short system feedback | `Toast` / notification component |
| Brand toggle | Marketing surface product switch | `ProductToggle` |
| WiseHire pipeline preview | Recruiter workflow | `PipelineBoard`, `CandidateCard` |

## Token sync guidance

The visual preview includes:

```txt
interactive-preview/assets/tokens.css
```

The production package includes:

```txt
colors_and_type.css
DESIGN_TOKENS.md
```

Before implementation, compare these token sources and align names/values. If conflicts exist, do not guess silently. Document the difference, choose one canonical token, and update the implementation plan before coding.

## Agent instruction

When using an AI design or coding agent, attach this full package and start with:

1. Read `design.md` first.
2. Use `interactive-preview/` as visual reference.
3. Use production docs as implementation rules.
4. Audit the current app before coding.
5. Produce a plan before implementation.
