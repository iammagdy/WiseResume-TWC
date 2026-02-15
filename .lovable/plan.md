

## Fix: Progress Bar Counter Not Matching Stepper Counter

### Problem

Two separate counters display different totals:
- **Stepper dropdown** (inside StepperNav): "4 of 6 complete" -- correct
- **Progress bar** (in EditorPage, line 948): "4 of 5 sections completed" -- wrong

They use different data sources:
- Stepper uses `steps.filter(s => s.id !== 'more')` -- dynamically derived from resume data
- Progress bar uses `Object.keys(sectionStatus)` -- separately derived, may not match

### Root Cause

Line 948 in `EditorPage.tsx` counts sections using `sectionStatus` keys independently from the `steps` array. Even though both check for `data.length > 0`, timing or state differences can cause them to diverge.

### Fix

**File: `src/pages/EditorPage.tsx` (line 948)**

Replace the independent counting with logic derived from the same `steps` array that the stepper uses:

```tsx
// Before (line 948):
{Object.values(sectionStatus).filter(Boolean).length} of {Object.keys(sectionStatus).length} sections completed

// After:
{steps.filter(s => s.id !== 'more' && sectionStatus[s.id]).length} of {steps.filter(s => s.id !== 'more').length} sections completed
```

This ensures both the stepper and the progress bar always show the same numbers by deriving from the single source of truth (`steps` array).

### Result

- Both counters always display the same "X of Y" values
- Adding Volunteering updates both to "X of 6"
- Adding Awards + Projects updates both to "X of 7"
- Removing all optional sections returns both to "X of 5"

### What Stays the Same

- `steps` derivation logic unchanged
- `sectionStatus` derivation logic unchanged
- StepperNav component unchanged
- No new props or state

### Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Update progress bar counter (line 948) to derive from `steps` array instead of `sectionStatus` keys |

Single line change.
