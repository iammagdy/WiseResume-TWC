

## Touch Target Audit and Improvements for the Editor Tab

### Audit Results

After scanning every interactive element in the Editor on a 360px viewport, the majority already meet the 44px minimum. The following elements fall short:

| Element | Current Size | Location |
|---------|-------------|----------|
| Undo/Redo buttons | 36x36px | EditorPage.tsx header (visible on xs+ screens) |
| Version History button | ~32px (p-2 only) | EditorPage.tsx header |
| NextStepBanner action button | 32px tall | NextStepBanner.tsx |
| NextStepBanner dismiss button | 28x28px | NextStepBanner.tsx |
| "All Sections" back link | No min-h | EditorPage.tsx renderEditorContent |
| SectionEmptyState action buttons | ~32px (size="sm") | SectionEmptyState.tsx |
| "Show/Hide Example" toggle | Inline text, ~20px | SectionEmptyState.tsx |
| ATS completeness toggle | py-1, no min-h | EditorPage.tsx |
| "View Original" link (tailored) | 36px tall | EditorPage.tsx |

### Elements That Already Pass (No Changes Needed)

- Back button: 48x48
- Mobile tools trigger: 48x48
- Tools sheet actions: 48px tall
- StepperNav mobile dropdown: 56px tall
- Section rows in sheet: 64px tall
- More sections grid cards: 48px tall
- Prev/Next navigation: 56px tall
- Experience card headers: 80px tall
- Add Experience button: 56px tall
- Skill badges (remove/add): 44px tall
- InlineAIButton: 44px tall
- AI Assist sheet actions: 64px tall
- Proofread FAB: 56px (14 * 4)
- All form inputs: 48px (h-12)

### Proposed Changes

**File: `src/pages/EditorPage.tsx`**

1. **Undo/Redo buttons** (lines 698-721): Change `min-w-[36px] min-h-[36px]` to `min-w-[44px] min-h-[44px]`

2. **Version History button** (lines 724-731): Add `min-w-[44px] min-h-[44px] flex items-center justify-center`

3. **ATS completeness toggle** (lines 883-886): Add `min-h-[44px]` to the button class

4. **"All Sections" back link** (line 573): Add `min-h-[44px] flex items-center` to ensure comfortable tapping

5. **"View Original" link** (line 925): Change `min-h-[36px]` to `min-h-[44px]`

**File: `src/components/editor/NextStepBanner.tsx`**

6. **Action button** (line 55): Change `min-h-[32px]` to `min-h-[44px]` and add padding `px-3 py-2`

7. **Dismiss button** (line 60): Change `min-w-[28px] min-h-[28px]` to `min-w-[44px] min-h-[44px]`

**File: `src/components/editor/SectionEmptyState.tsx`**

8. **Action buttons** (line 101): Add `min-h-[44px]` to the Button className

9. **"Show/Hide Example" trigger** (line 74): Add `min-h-[44px] px-3` to ensure tappable area

### What Stays the Same

- All handlers, navigation logic, and data unchanged
- All component names and props unchanged
- No layout or visual design changes beyond size/spacing
- Tools sheet, StepperNav, form fields, AI sheets -- all already compliant

### Summary of Pattern

Every fix applies the same principle: ensure `min-h-[44px]` (and `min-w-[44px]` for icon-only buttons) plus adequate padding. The standardized class pattern is:
- Icon-only: `min-w-[44px] min-h-[44px] flex items-center justify-center`
- Text buttons: `min-h-[44px] px-3`
- Inline links: `min-h-[44px] flex items-center`

