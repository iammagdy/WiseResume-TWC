

## Fix: Bottom Action Buttons Overflowing on Small Screens

### Root Cause

The "Previous" and "Preview & Export" buttons in the Editor (lines 611-652 of `EditorPage.tsx`) use `flex-1` inside a `flex-col xs:flex-row` container. At the `xs` breakpoint (375px+), they go side-by-side. However, `flex-1` alone does not constrain the minimum width of a flex child -- the button's content (icon + "Preview & Export" text) establishes a minimum intrinsic width that can push beyond the container.

The missing piece is `min-w-0` on each button, which allows flex items to shrink below their content size.

### Changes

**File: `src/pages/EditorPage.tsx` (lines 611-651)**

1. Add `min-w-0` to all three buttons (Previous, Preview & Export, Next) so they respect `flex-1` shrinking
2. Add `overflow-hidden` to the container to prevent any residual overflow
3. Add `text-sm` to the "Preview & Export" button specifically, since its label is the longest and needs to fit in half the width on 375px screens

```
Before:
  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-6 pb-2">
    <Button className="flex-1 min-h-[56px] sm:h-12" ...>Previous</Button>
    <Button className="flex-1 min-h-[56px] sm:h-12 gradient-primary ..." ...>Preview & Export</Button>
    <Button className="flex-1 min-h-[56px] sm:h-12" ...>Next</Button>

After:
  <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-6 pb-2 overflow-hidden">
    <Button className="flex-1 min-w-0 min-h-[56px] sm:h-12" ...>Previous</Button>
    <Button className="flex-1 min-w-0 min-h-[56px] sm:h-12 text-sm gradient-primary ..." ...>Preview & Export</Button>
    <Button className="flex-1 min-w-0 min-h-[56px] sm:h-12" ...>Next</Button>
```

### Similar Patterns Checked

No other bottom button rows in the app use this same pattern -- the Editor is the only place with this specific side-by-side `flex-1` layout for navigation buttons. Other button pairs (TailorHistorySheet, CoverLetterHistorySheet) use `sticky bottom-0` with proper constraints already.

### What Stays the Same

- All button handlers, navigation logic, and routes unchanged
- No component or prop renames
- No changes to the data model or API calls

### Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add `min-w-0` to all 3 nav buttons, `overflow-hidden` to container, `text-sm` to "Preview & Export" button |

One file, 4 class additions. Ensures buttons shrink properly within their flex container on 360-375px screens.

