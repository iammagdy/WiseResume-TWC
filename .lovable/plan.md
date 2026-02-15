
## Dashboard Resume Card Actions -- Fix FloatingPanel Positioning on Mobile

### Problem

The `ResumeListCard` component uses `ActionsPanel` (which wraps `FloatingPanel`) for its three-dot menu. The card itself has the `glass-elevated` class, which applies `backdrop-filter`. In CSS, `backdrop-filter` creates a new containing block, causing `fixed`-positioned children (the FloatingPanel overlay and content) to render relative to the card instead of the viewport -- pushing the panel off-screen on mobile.

This is the exact same root cause that was previously fixed in the Editor's "More Sections" panel and Tools menu by converting from FloatingPanel to Sheet.

### Audit Results (Other Dashboard Elements)

- **Header**: No horizontal overflow at 360px. Logo and profile avatar fit cleanly with proper padding.
- **Search bar**: Full-width with comfortable padding (`px-4`), `rounded-full h-12`, no overflow.
- **Action cards grid**: `grid grid-cols-2 gap-2 px-4` works well at 360px.
- **Resume list container**: `px-4 pb-4` with `space-y-4` provides proper spacing and no horizontal scroll.
- **Card layout**: Title truncates correctly, progress bar fits, swipe actions work, tap targets are 44px+.
- **FloatingCreateButton**: Already uses portal positioning (FAB), works correctly.

Only the ActionsPanel inside `ResumeListCard` has the off-screen rendering bug.

### Fix

**File: `src/components/dashboard/ResumeListCard.tsx`**

1. Replace the `ActionsPanel` import with `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` imports (plus `Separator`).
2. Add a `showActionsSheet` state variable.
3. Replace the `<ActionsPanel>` JSX (lines 306-380) with:
   - A trigger button (same styling as current) that sets `showActionsSheet = true`
   - A `<Sheet>` with `side="bottom"` that renders the same grouped actions
4. Reuse the existing inline `groups` data -- all handler functions remain untouched.
5. Sheet content uses `pb-safe`, `max-h-[80dvh]`, proper 48px touch targets, and haptic feedback on each action.

### What stays the same

- All handler functions (`onEdit`, `onDuplicate`, `onDelete`, `onRename`, `onInterview`, download, share) unchanged
- Props interface unchanged
- Card layout, swipe gestures, progress bar, ATS score -- all unchanged
- `ResumeGroup` component unchanged (it renders `ResumeListCard` which gets the fix automatically)
- `ActionsPanel` component itself is not modified (still available elsewhere)

### Summary

| File | Change |
|------|--------|
| `src/components/dashboard/ResumeListCard.tsx` | Replace `ActionsPanel` with portal-based `Sheet` for the three-dot menu |

1 component swap. Zero logic changes. Same pattern as the Editor fixes.
