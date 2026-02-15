

## Fix: Counter Should Reflect Active Sub-Section

### Problem

When the user adds Awards (or any "More" sub-section), the stepper dropdown shows "Awards" with the correct icon, and the sheet lists all 6 rows including Awards. However, the counter still says "4 of 5 complete" because we unconditionally exclude the `more` step from counting. It should say "4 of 6 complete" when a sub-section is active, since Awards is now a real section the user is working on.

### Root Cause

Line 97 in `StepperNav.tsx` filters out `more` from both the completed count and total count:
```tsx
{steps.filter(s => s.id !== 'more' && completedSteps[s.id]).length} of {steps.filter(s => s.id !== 'more').length} complete
```

This should only exclude `more` when no sub-section is active. When `activeMoreSection` is set (e.g., "awards"), `more` represents a real section and should be counted.

### Proposed Change

**File: `src/components/editor/StepperNav.tsx`** (line 97)

Change the counter logic to conditionally include the `more` step when a sub-section is active:

```tsx
// Before:
{steps.filter(s => s.id !== 'more' && completedSteps[s.id]).length} of {steps.filter(s => s.id !== 'more').length} complete

// After:
{steps.filter(s => (s.id === 'more' ? !!activeMoreSection : true) && completedSteps[s.id]).length} of {steps.filter(s => (s.id === 'more' ? !!activeMoreSection : true)).length} complete
```

This means:
- **No sub-section active**: "4 of 5 complete" (excludes More)
- **Awards active**: "4 of 6 complete" (counts Awards/More as a real section)

### What Stays the Same

- All handlers unchanged
- Sheet list rendering unchanged (already shows Awards correctly)
- Desktop stepper unchanged
- No prop or component renames

### Summary

| File | Change |
|------|--------|
| `src/components/editor/StepperNav.tsx` | Update counter filter to include `more` step when `activeMoreSection` is set |

1 line change. Zero logic changes.
