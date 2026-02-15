

## Fix: "More" Showing as Generic Section Instead of Active Sub-Section

### Problem

The `steps` array contains 6 items: Contact, Summary, Work, Education, Skills, and "More". The issues are:

1. **Counter mismatch**: The dropdown says "4 of 6 complete" -- but "More" is a container tab, not a real section. Users expect to see "4 of 5 complete" for the 5 real sections, or if they added Projects, "4 of 6 complete" should mean 6 real sections are listed.
2. **Sheet shows "More"**: When the user opens the Resume Sections sheet, the last item says "More" with a Plus icon -- it should either show the active sub-section name (e.g., "Projects") or list the added sub-sections individually.
3. **Clicking "More" in the sheet** goes to the More tab but doesn't take the user directly to their active sub-section.

### Root Cause

The `steps` array is static with `{ id: 'more', label: 'More' }` hardcoded. The StepperNav receives `activeMoreSection` but only uses it for the dropdown trigger label -- the sheet list and the completion counter both ignore it entirely.

### Proposed Changes

**File: `src/components/editor/StepperNav.tsx`**

#### 1. Fix the completion counter to exclude "more" as a countable section

Change line 97 from counting all steps to excluding the "more" pseudo-step:
```typescript
// Before:
{steps.filter(s => completedSteps[s.id]).length} of {steps.length} complete

// After:
{steps.filter(s => s.id !== 'more' && completedSteps[s.id]).length} of {steps.filter(s => s.id !== 'more').length} complete
```

This changes "4 of 6" to "4 of 5" -- counting only real sections.

#### 2. Update the "More" entry in the sheet to show the active sub-section

When `activeMoreSection` is set (e.g., "projects"), the sheet's "More" row should display the sub-section's label and icon instead of the generic "More" label. When no sub-section is active, it still shows "More" with the Plus icon.

In the `steps.map()` inside the sheet, add logic for the "more" step:
```tsx
// For the "more" step, show active sub-section details if available
const moreDef = step.id === 'more' && activeMoreSection
  ? MORE_SECTIONS.find(s => s.id === activeMoreSection)
  : null;
const Icon = moreDef ? moreDef.icon : (STEP_ICONS[step.id] || Plus);
const displayLabel = moreDef ? moreDef.label : step.label;
```

Then use `displayLabel` and `Icon` instead of `step.label` and the static icon in the sheet row.

#### 3. Clicking "More" in the sheet navigates to the active sub-section

When tapping the "More" row in the sheet, if `activeMoreSection` is set, the click handler should call `onStepClick('more')` (which it already does), and the sub-section state is already preserved -- so the content renders correctly since `moreSubSection` retains its value.

No handler changes needed here; the fix in change 2 ensures the UI matches the behavior.

### What Stays the Same

- `steps` array definition in EditorPage.tsx (unchanged)
- All handlers (`onStepClick`, `handleMoreSectionSelect`) unchanged
- No prop renames or new props
- Desktop stepper behavior unchanged
- All section components and data models unchanged

### Technical Summary

| File | Change |
|------|--------|
| `src/components/editor/StepperNav.tsx` | Fix completion counter to exclude "more" pseudo-step; show active sub-section label/icon in sheet row |

1 file, 2 targeted presentation fixes. Zero logic changes.

