

# Fix AIEnhanceDialog Scroll and Button Layout

## Problem Summary

Looking at the screenshot, the "Enhanced Summary" dialog has two issues:

1. **No scrolling** in the content area when content is long
2. **"Apply Changes" button is hidden** beneath the bottom tab bar

## Root Cause

The `AIEnhanceDialog` component at `src/components/editor/ai/AIEnhanceDialog.tsx` has structural issues:

1. The dialog container uses `max-h-[85vh]` with `overflow-hidden`, but the internal layout isn't a proper flex column, so the footer buttons can get pushed out of view when content is long

2. The footer has no `pb-safe` padding, and the dialog's `z-50` conflicts with the BottomTabBar's `z-50`, causing the buttons to be obscured

3. The `ScrollArea` with `max-h-[50vh]` is correct, but the parent container structure doesn't guarantee the footer stays visible

## Solution

Convert the dialog's internal structure to the same flex-based layout pattern we established for bottom sheets:

- **Header**: `shrink-0` (doesn't shrink)
- **Body**: `flex-1 min-h-0 overflow-y-auto` (scrolls when content exceeds)
- **Footer**: `shrink-0 pb-safe` (stays fixed at bottom with safe area)

Also increase z-index to `z-[60]` to ensure it appears above the BottomTabBar.

---

## Technical Changes

### File: `src/components/editor/ai/AIEnhanceDialog.tsx`

1. **Increase z-index** for the overlay and dialog:
   - Change `z-50` to `z-[60]` so the dialog appears above the BottomTabBar

2. **Make the dialog a proper flex column**:
   - The inner `motion.div` container needs `flex flex-col`

3. **Make the header shrink-0**:
   - Add `shrink-0` to the header div

4. **Fix the scroll area**:
   - Replace `ScrollArea` with a standard scrollable div
   - Use `flex-1 min-h-0 overflow-y-auto` pattern for reliable scrolling

5. **Make the footer shrink-0 with safe area padding**:
   - Add `shrink-0 pb-safe` to the actions div

### Updated Structure

```text
<motion.div className="... max-h-[85vh] flex flex-col">
  <!-- Header - shrink-0 -->
  <div className="shrink-0 p-4 border-b">
    Title + Close button
  </div>

  <!-- Content - flex-1 scrollable -->
  <div className="flex-1 min-h-0 overflow-y-auto p-4">
    Original section
    Enhanced section
    Changes badges
    Suggestions
  </div>

  <!-- Footer - shrink-0 with safe area -->
  <div className="shrink-0 p-4 pb-safe border-t">
    Discard button
    Apply Changes button
  </div>
</motion.div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editor/ai/AIEnhanceDialog.tsx` | Fix layout structure, z-index, add pb-safe |

---

## Expected Results

1. **Content scrolls** when enhanced text is long
2. **Both buttons visible** (Discard and Apply Changes)
3. **Buttons don't overlap** with bottom tab bar
4. **Works on all screen sizes** including mobile with safe area insets

