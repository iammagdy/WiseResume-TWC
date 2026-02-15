

## Editor Tab Usability Audit -- Findings and Improvements

### Audit Summary

After reviewing the Editor page, StepperNav, section components (Contact, Summary, Experience), SectionCard, InlineAIButton, AIIntroTooltip, NextStepBanner, form-field component, and the mobile tools sheet, the Editor is already well-structured for mobile. However, there are several small friction points worth addressing.

### Findings

**1. Mobile Tools Sheet lacks descriptions**
The "Editor Tools" bottom sheet (lines 780-816 of EditorPage.tsx) shows action labels ("Design", "Live Preview", "Wise AI", "AI Enhance", "Tailor to Job", "ATS Check", "Proofread") but no descriptions. Users unfamiliar with these tools may hesitate to tap, especially AI actions where they fear overwriting content.

**Fix**: Add short `description` strings to the `editorToolGroups` data (lines 493-514) and render them as subtitle text below each label in the tools sheet.

**2. "AI Enhance" and "Tailor to Job" feel like duplicates**
Both open the TailorSheet (`setShowTailor(true)`), which is confusing. "AI Enhance" (line 508) and "Tailor" (line 509) trigger the same handler.

**Fix**: Remove the duplicate "AI Enhance" entry from the tools sheet. Keep "Tailor to Job" as the single entry, with a clear description. This reduces confusion without changing any logic.

**3. Tools sheet groups lack visual hierarchy**
The group titles ("Quick Actions", "AI Features") use tiny uppercase text that blends in. The actions themselves have no icons rendered distinctly -- they are muted-foreground gray without color differentiation.

**Fix**: Add color to tool icons (matching the AIAssistantBar's secondary tools pattern) to help users scan the list quickly.

**4. Save status is only visible in the progress bar area**
When a user edits a field and moves on, the only save feedback is a tiny "Saved" badge that appears for 2 seconds in the progress bar. On mobile, this may already have scrolled out of view.

**No code change needed**: The form-field component already shows inline "Saved" badges per field (via `useSavedIndicator`), and the header shows cloud save status. This is adequate -- no change.

**5. "More Sections" button placement on mobile**
The "More Sections" button appears below the stepper dropdown as a separate full-width button. This is fine and clearly visible. No change needed.

**6. Section navigation Previous/Next buttons**
These are well-implemented at 56px height with clear labels. The final step shows "Preview & Export" with a gradient. No change needed.

### Proposed Changes

**File: `src/pages/EditorPage.tsx`**

1. **Add descriptions to tool actions** (lines 493-514): Add a `description` field to each action in `editorToolGroups`.

2. **Remove duplicate "AI Enhance" action**: Remove the "AI Enhance" entry (line 508) that duplicates "Tailor to Job".

3. **Render descriptions in the tools sheet** (lines 789-809): Show the description as a secondary line of text below each action label.

4. **Add distinct icon colors**: Apply color classes to tool icons (e.g., Palette = pink, Eye = blue, MessageSquare = primary, Target = amber, BarChart3 = emerald, Scissors = red).

### What stays the same

- All handler functions unchanged
- All sheet components unchanged
- StepperNav, SectionCard, form fields, AI actions -- all unchanged
- Navigation, save logic, undo/redo -- all unchanged
- Only the mobile tools sheet gets clearer labels, descriptions, and visual hierarchy

### Technical Details

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add descriptions and icon colors to `editorToolGroups`; remove duplicate "AI Enhance"; render description text in tools sheet |

### Remaining UX Issues (Require Larger Changes -- Not in Scope)

- **No "your changes are reversible" reassurance on AI actions**: The InlineAIButton opens an AIEnhanceDialog with Apply/Discard, which is good, but the initial button doesn't communicate this. A future improvement could add a tooltip or subtitle "Preview changes before applying".
- **ExperienceSection date inputs are freeform text**: Users type "Jan 2020" manually. A date picker would improve UX but requires new dependencies/logic.
- **Timeline gaps feature is powerful but potentially confusing**: The gap detection and filler tools are advanced features that could overwhelm new users. Consider progressive disclosure in a future iteration.

