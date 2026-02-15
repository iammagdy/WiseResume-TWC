

## Editor Accessibility Audit and Improvements

### Accessibility Checklist for the Editor

1. **Structure and Semantics**: Use landmarks (`<main>`, `<nav>`, `<header>`), proper heading hierarchy, and semantic HTML (`<button>` not `<div onClick>`)
2. **Forms and Labels**: Every input has a visible, programmatically-associated label; error messages linked via `aria-describedby`; required fields indicated with both visual and ARIA cues
3. **Keyboard and Focus**: All interactive elements reachable via Tab in logical order; visible focus rings; no keyboard traps; Escape closes panels
4. **ARIA for Panels and Dialogs**: Sheets/panels have `role="dialog"`, `aria-modal`, `aria-labelledby`; icon-only buttons have `aria-label`
5. **Mobile Touch Targets**: All interactive elements are at least 44x44px
6. **Feedback and Status**: Loading, saving, error states use `aria-live` regions; status not conveyed by color alone
7. **Progress Communication**: Progress bar and scores are accessible to screen readers via `aria-label` or `role="progressbar"` with `aria-valuenow`

### Audit Results

**Passes (no change needed)**:
- Forms: `InputFormField` and `TextareaFormField` already use `<Label htmlFor>`, `aria-invalid`, `aria-describedby` for errors, and `role="alert"` on error messages
- Touch targets: All buttons in the header, tools sheet, stepper, and section cards meet 44-48px minimums
- Sheets: All mobile sheets use Radix/Vaul `Sheet` which provides `role="dialog"`, `aria-modal`, focus trap, and Escape-to-close out of the box
- Icon-only buttons in the header (back, undo, redo, version history, design, live preview, tools) all have `aria-label`
- Keyboard toolbar has proper `aria-label` on prev/next/done buttons
- Dismiss button on `NextStepBanner` has `aria-label="Dismiss"`

**Issues Found**:

| # | Category | Issue | Location |
|---|----------|-------|----------|
| 1 | Structure | Editor page has no `<main>` landmark; the outermost div is unsemantic | `EditorPage.tsx` line 680 |
| 2 | Structure | `SectionCard` heading uses `<h3>` but there is no `<h2>` parent, breaking heading hierarchy | `SectionCard.tsx` line 38 |
| 3 | ARIA | StepperNav mobile dropdown trigger button has no `aria-label` or accessible name describing its purpose | `StepperNav.tsx` line 71-108 |
| 4 | ARIA | StepperNav "More Sections" button has no `aria-label` | `StepperNav.tsx` line 179-185 |
| 5 | ARIA | StepperNav desktop step buttons have no accessible name beyond truncated visual text | `StepperNav.tsx` line 251-317 |
| 6 | Progress | The progress bar `<div>` has no `role="progressbar"` or `aria-valuenow`; screen readers cannot interpret the completion percentage | `ProgressBar.tsx` line 74 |
| 7 | Status | Save status ("Saving...", "Saved", "Offline") has no `aria-live` region; changes are invisible to screen readers | `EditorPage.tsx` lines 855-879 |
| 8 | ARIA | ATS completeness toggle button has no `aria-expanded` state | `EditorPage.tsx` line 883-891 |
| 9 | ARIA | Desktop AI Assist dropdown in `InlineAIButton` is not a landmark; no `role="menu"` or `aria-expanded` on trigger | `InlineAIButton.tsx` lines 126-163 |
| 10 | Structure | `SectionEmptyState` "Show/Hide Example" collapsible trigger has no `aria-expanded` | `SectionEmptyState.tsx` line 74 (Radix handles this, so actually passes) |

### Proposed Changes

**File: `src/pages/EditorPage.tsx`**

1. **Add `<main>` landmark**: Change the outermost `<div>` (line 680) to `<main>` with `role="main"`.

2. **Add `aria-live` to save status region** (lines 854-879): Wrap the save status indicators in a `<div aria-live="polite" aria-atomic="true">` so screen readers announce save state changes.

3. **Add `aria-expanded` to ATS completeness toggle** (line 883): Add `aria-expanded={showATSBadge}` and `aria-label="Toggle completeness breakdown"` to the button.

**File: `src/components/editor/StepperNav.tsx`**

4. **Add `aria-label` to mobile dropdown trigger** (line 71): Add `aria-label="Select resume section"` and `aria-haspopup="dialog"`.

5. **Add `aria-label` to "More Sections" button** (line 179): Add `aria-label="Add more sections"`.

6. **Add `aria-current` to active step** (desktop stepper, line 251): Add `aria-current={isActive ? 'step' : undefined}` to each step button.

**File: `src/components/editor/ProgressBar.tsx`**

7. **Add progressbar role** (line 74): Add `role="progressbar"`, `aria-valuenow={progress}`, `aria-valuemin={0}`, `aria-valuemax={100}`, and `aria-label="Resume completion"` to the track div.

**File: `src/components/editor/SectionCard.tsx`**

8. **Change `<h3>` to `<h2>`** (line 38): Use `<h2>` for section titles to establish proper heading hierarchy (the page title in the header is effectively h1).

**File: `src/components/editor/InlineAIButton.tsx`**

9. **Add `aria-expanded` and `aria-haspopup`** to the trigger button (line 126): Add `aria-expanded={isOpen}` and `aria-haspopup="true"`.

10. **Add `role="menu"` to desktop dropdown** (line 149): Add `role="menu"` to the dropdown container and `role="menuitem"` to each action button.

### What stays the same

- All business logic, handlers, data models, API calls unchanged
- All component names, props, and types unchanged
- All visual styling unchanged (except heading element swap which uses same classes)
- All Sheet/panel behavior unchanged (Radix already handles dialog ARIA)
- All form field components unchanged (already accessible)

### Technical Summary

| File | Changes |
|------|---------|
| `src/pages/EditorPage.tsx` | `<div>` to `<main>`, `aria-live` on save status, `aria-expanded` on ATS toggle |
| `src/components/editor/StepperNav.tsx` | `aria-label` on mobile trigger and "More Sections" button, `aria-current="step"` on active step |
| `src/components/editor/ProgressBar.tsx` | `role="progressbar"` with `aria-valuenow/min/max` and `aria-label` |
| `src/components/editor/SectionCard.tsx` | `<h3>` to `<h2>` for heading hierarchy |
| `src/components/editor/InlineAIButton.tsx` | `aria-expanded`, `aria-haspopup` on trigger; `role="menu"`/`role="menuitem"` on desktop dropdown |

10 targeted ARIA/semantic fixes. Zero logic changes. All changes are additive attributes or element swaps with identical styling.

### Follow-up Items (Larger Changes, Not in Scope)

- **Focus management on section switch**: When the user changes sections via StepperNav, focus stays on the stepper button rather than moving to the new section content. Ideally, focus would shift to the section heading or first input. This requires managing `ref` focus and is a larger refactor.
- **Skip navigation link**: A "Skip to editor content" link at the top of the page would help keyboard users bypass the header and stepper. Requires design consideration.
- **Screen reader announcements for AI actions**: When an AI action completes (enhance, tailor, proofread), there is a toast but no `aria-live` announcement. The `sonner` toast library may or may not be accessible -- needs verification.

