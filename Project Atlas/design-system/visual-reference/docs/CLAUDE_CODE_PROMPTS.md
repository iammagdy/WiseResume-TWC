# Claude / Replit / Codex Prompts

Use these prompts to work safely with this design system.

---

## 1. Audit only prompt

```text
I uploaded a WiseResume / WiseHire production design-system package.

Please audit the current app against the design system.

Do not implement anything yet.

Focus on:
- color inconsistencies
- typography inconsistencies
- duplicated components
- spacing/radius/shadow inconsistencies
- mobile UX issues
- accessibility issues
- missing loading/empty/error/success states
- WiseResume/WiseHire brand mixing
- screens that do not match the design-system direction

Output:
1. Summary of findings
2. High-priority issues
3. Medium-priority issues
4. Low-priority issues
5. Files likely involved
6. Recommended implementation order
7. Risks
8. Test plan

Do not guess. If you are unsure, say what you need to inspect.
```

---

## 2. Full implementation plan prompt

```text
I uploaded a WiseResume / WiseHire production design-system package.

Create a detailed implementation plan to apply it to the existing app safely.

Rules:
- Do not rewrite the app.
- Do not change backend logic.
- Do not change database schemas.
- Do not change authentication.
- Do not change AI/business logic unless explicitly approved.
- Use existing app structure.
- Use existing shadcn/ui primitives where possible.
- Use design tokens instead of hardcoded styling.
- Keep WiseResume crimson and WiseHire blue separated.
- Prioritize mobile for WiseResume.

The plan must include phases:
1. Audit
2. Token mapping
3. Core components
4. WiseResume product components
5. WiseHire product components
6. Screen-by-screen application
7. Mobile/accessibility polish

For every phase include:
- goal
- files likely touched
- exact changes
- what will not change
- risk level
- test plan
- rollback plan

Output plan only. Do not implement until I approve.
```

---

## 3. Token mapping prompt

```text
Based on the uploaded design-system package, map the design tokens into the existing app.

Rules:
- Inspect current CSS variables and Tailwind config first.
- Avoid duplicate variables.
- Preserve current app behavior.
- Do not change screen layout yet.
- Keep WiseResume crimson and WiseHire blue route/product identity separated.

Output a token mapping plan first, then wait for approval.
```

---

## 4. Core components prompt

```text
Apply the design system to core UI components only.

Scope:
- Button
- Input
- Textarea
- Card
- Badge
- Dialog
- Sheet
- Tabs
- Toast
- Empty state
- Loading state
- Error state

Rules:
- Use existing shadcn/ui components where possible.
- Do not change product screens yet except to keep imports working.
- Add missing variants only if needed.
- Ensure focus, disabled, loading, and mobile states.
- Use tokens, not hardcoded colors.

Before coding, provide a small file-by-file plan and risk assessment.
```

---

## 5. WiseResume flow prompt

```text
Apply the design system to the main WiseResume flow only:
Upload CV → Parse CV → Edit Resume → Tailor to Job → Review AI Changes → Apply Changes → Export.

Rules:
- Do not change backend/API logic.
- Do not change AI logic.
- Keep current data flow working.
- Improve UI consistency, mobile usability, and state coverage.
- Use existing components and tokens.
- Add reusable WiseResume product components where repeated.

Before coding, show the exact files and components you will touch.
```

---

## 6. Mobile polish prompt

```text
Audit and improve mobile UX according to MOBILE_RULES.md.

Focus on:
- no horizontal overflow
- touch targets at least 44px
- editor/preview mobile behavior
- Tailor results before/after mobile layout
- sticky CTAs for long flows
- mobile sheets instead of desktop dialogs where needed
- tables becoming cards
- readable input sizes

Do not change backend logic or business logic.

Start with an audit and proposed patch plan only.
```

---

## 7. Accessibility prompt

```text
Audit the app against ACCESSIBILITY.md.

Focus on:
- keyboard navigation
- visible focus states
- input labels
- icon-only button labels
- dialog/sheet focus handling
- color contrast risks
- reduced motion handling
- AI suggestion review controls

Do not implement yet. Output findings, affected files, and a safe phase plan.
```


## Font system prompt

Use `FONT_SYSTEM.md` as the source of truth for typography. Verify the app loads Inter centrally through `@fontsource/inter` or the approved app-level font pipeline. Do not add new fonts, do not duplicate font imports inside components, and do not copy preview-only Google Fonts imports into production components. Keep Tailwind `font-sans`, `font-display`, and `font-mono` mapped to the documented values.
