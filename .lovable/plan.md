
## Fix: Tools Panel Positioning on Mobile

### Issue Found

The **Tools button** in the Editor header opens a FloatingPanel (via `ActionsPanel`) that renders incorrectly on mobile. The panel appears behind/above the viewport instead of in front of the user.

**Root cause**: The header element has the `glass` class which applies `backdrop-filter`. In CSS, `backdrop-filter` creates a new containing block, causing `fixed`-positioned children (the FloatingPanel overlay and content) to behave like `absolute` -- they position relative to the header instead of the viewport.

This is the exact same bug that was fixed for "More Sections" in the previous change (converting FloatingPanel to Sheet).

### Other Audit Results (No Issues)

- **More Sections panel**: Works correctly (Sheet-based, portal rendering) -- verified by testing
- **Section labels**: "Awards" and other sub-sections display the correct label and icon in the dropdown trigger -- verified by testing
- **Header layout**: No horizontal scroll at 360px; title truncates correctly; back button and Tools trigger are properly sized (48px touch targets)
- **Editor content area**: Stacks vertically, no horizontal scroll, proper padding
- **StepperNav mobile dropdown**: Section switching works correctly with proper labels and completion indicators

### Planned Change

**File: `src/pages/EditorPage.tsx`**

Replace the mobile `ActionsPanel` (FloatingPanel-based, lines 762-777) with a `Sheet` (portal-based bottom sheet). The Sheet renders at the document root via React portal, bypassing the CSS containing block issue.

Specifically:
1. Add a `showToolsSheet` state variable
2. Replace `<ActionsPanel>` with a simple trigger button + `<Sheet>` that renders the same grouped actions
3. Reuse the existing `editorToolGroups` data -- no logic changes
4. The Sheet content uses `pb-safe`, proper touch targets (`min-h-[48px]`), and haptic feedback
5. Desktop tools (lines 720-761) remain completely unchanged

### What stays the same

- `editorToolGroups` memo and all handler functions unchanged
- Desktop tool buttons (hidden on mobile) unchanged
- All section logic, data, and navigation unchanged
- `ActionsPanel` component itself is not modified (still available for other uses)
- No props, types, or exports renamed

### Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Replace mobile `ActionsPanel` with `Sheet` for Tools menu (same pattern as "More Sections" fix) |

1 component swap. Zero logic changes.
