# Implementation Guide

This guide explains how to apply the WiseResume / WiseHire design system to the existing app safely.

It is written for Claude Code, Codex, Replit Agent, or a developer.

---

## 1. Implementation rules

Do not:

- Rewrite the app.
- Change backend logic.
- Change authentication logic.
- Change database schemas.
- Change AI prompts unless the task explicitly asks.
- Replace working components without reason.
- Introduce a second UI framework.
- Hardcode new colors directly in screens.

Do:

- Apply changes gradually.
- Prefer existing app structure.
- Use tokens.
- Reuse shadcn/ui primitives if already present.
- Extract repeated UI into components.
- Test mobile after each phase.
- Keep WiseResume and WiseHire product colors separate.

---

## 2. Recommended rollout phases

### Phase 1 — Audit current app

Goal: find gaps before changing code.

Tasks:

- Compare current UI against this design-system package.
- Identify hardcoded colors.
- Identify duplicated buttons/cards/inputs.
- Identify inconsistent spacing/radius/shadows.
- Identify missing loading/empty/error/success states.
- Identify mobile layout issues.
- Identify WiseResume/WiseHire brand mixing.

Output:

- Audit report
- Priority list
- Risk list
- Suggested files to update

Risk: Low  
Rollback: No code changes.

---

### Phase 2 — Token mapping

Goal: connect the design system to real production tokens.

Tasks:

- Review existing CSS variables and Tailwind config.
- Map `DESIGN_TOKENS.md` to current variables.
- Avoid duplicate variables.
- Add missing semantic tokens only if necessary.
- Confirm route/product shell can switch primary color.

Likely files:

- `src/index.css`
- `tailwind.config.ts`
- theme/provider files if present
- product shell/layout files if needed

Risk: Medium  
Rollback: revert token file changes.

Tests:

- WiseResume pages use crimson primary.
- WiseHire pages use blue primary.
- Focus rings are visible.
- Existing screens still render.

---

### Phase 3 — Core components

Goal: standardize reusable primitives.

Tasks:

- Audit existing button/input/card/badge/sheet/dialog/table components.
- Update styling to use tokens.
- Add missing variants carefully.
- Add loading/disabled/focus states.
- Add documentation comments where useful.

Likely files:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/tabs.tsx`
- shared loading/empty/error components

Risk: Medium/High because core components affect many screens.  
Rollback: revert component files.

Tests:

- Dashboard renders.
- Editor renders.
- Tailor flow renders.
- WiseHire renders.
- Keyboard focus works.
- Mobile still works.

---

### Phase 4 — WiseResume product components

Goal: build reusable components for candidate workflows.

Recommended components:

- `ResumeCard`
- `ATSScoreRing`
- `ResumeSectionCard`
- `AISuggestionPanel`
- `TailorResultCard`
- `KeywordMatchBadge`
- `UploadResumeBox`
- `ExportPanel`
- `EmptyResumeState`
- `TailorLoadingSteps`

Apply first to:

1. Dashboard
2. Resume Editor
3. Tailor Page
4. Tailor Results
5. Export flow

Risk: Medium  
Rollback: revert product component additions and screen usage.

---

### Phase 5 — WiseHire product components

Goal: standardize recruiter workflows.

Recommended components:

- `CandidateCard`
- `CandidateScoreCard`
- `PipelineColumn`
- `BulkUploadPanel`
- `JDWriterPanel`
- `WiseHireMetricCard`
- `ScreeningProgress`

Apply first to:

1. WiseHire Dashboard
2. Pipeline
3. Bulk Screen
4. JD Writer

Risk: Medium  
Rollback: revert product component additions and screen usage.

---

### Phase 6 — Apply to screens gradually

Order:

1. WiseResume Dashboard
2. Resume Editor
3. Tailor Page
4. Tailor Results
5. Onboarding
6. Pricing
7. Settings
8. WiseHire Dashboard
9. WiseHire Pipeline
10. WiseHire Bulk Screen

Rules:

- One flow/screen at a time.
- Keep logic unchanged.
- No large refactor mixed with styling pass.
- After each screen, test desktop and mobile.

Risk: Medium  
Rollback: revert screen-specific changes.

---

### Phase 7 — Mobile and accessibility polish

Goal: make main flows production-quality.

Tasks:

- Test mobile viewports.
- Fix horizontal overflow.
- Convert tables to cards where needed.
- Convert side-by-side editor to mobile tabs.
- Ensure sticky CTA behavior in long flows.
- Test keyboard navigation.
- Add missing aria labels.
- Respect reduced motion.

Risk: Medium  
Rollback: revert layout-specific changes.

---

## 3. Safe implementation prompt

Use this prompt when asking an AI coding agent to start:

```text
You are working on the existing WiseResume / WiseHire app. I uploaded a production design-system package.

First, inspect the app and the design-system docs. Do not code yet.

Create a detailed implementation plan to apply the design system safely.

Rules:
- Do not rewrite the app.
- Do not change backend logic.
- Do not change database schemas.
- Do not change authentication.
- Do not change AI business logic unless explicitly required.
- Use minimal changes.
- Keep WiseResume crimson and WiseHire blue separated.
- Mobile experience is a priority.
- Use existing shadcn/ui components where possible.
- Reuse existing app structure.

Your plan must include:
1. Current UI audit findings.
2. Token mapping plan.
3. Core component changes.
4. WiseResume component changes.
5. WiseHire component changes.
6. Screen-by-screen rollout order.
7. Files likely to be touched.
8. Risk level for each phase.
9. Test plan.
10. Rollback plan.

Output the plan only. Do not implement until I approve.
```

---

## 4. Implementation acceptance criteria

The design-system implementation is acceptable when:

- Core tokens are mapped in production CSS/Tailwind.
- Core UI components use tokens.
- WiseResume screens consistently use crimson identity.
- WiseHire screens consistently use blue identity.
- Main WiseResume flow works on mobile.
- Tailor results are reviewable and understandable.
- Empty/loading/error/success states exist for main flows.
- Components have accessible focus and labels.
- No major product logic was changed.
- The implementation can be rolled back screen by screen.

---

## 5. Common mistakes to avoid

- Applying visual styles by copy-pasting preview HTML.
- Rebuilding components from scratch when existing primitives are fine.
- Mixing WiseHire blue into WiseResume screens.
- Adding animations that slow down task completion.
- Making mobile screens look responsive but not usable.
- Removing focus outlines.
- Hiding error messages inside toasts only.
- Showing AI results without explanation or review controls.
- Implementing all screens in one huge change.
