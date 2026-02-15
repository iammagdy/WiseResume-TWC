

## Fix: Settings "Jump to Section" Panel Positioning on Mobile

### Problem

The "Jump to Section" button in the Settings header uses a `FloatingPanelRoot` / `FloatingPanelContent` component. The header has the `glass-header backdrop-blur-xl` class, which applies `backdrop-filter`. In CSS, `backdrop-filter` creates a new containing block, causing `fixed`-positioned children (the FloatingPanel overlay and content) to render relative to the header instead of the viewport -- pushing the panel off-screen on mobile.

This is the exact same root cause fixed in the Editor's "More Sections", Tools menu, and Dashboard resume card actions.

### Audit Results (Other Settings Elements)

- **Header layout**: Back button (48px touch target) + "Settings" title + trigger fit at 360px with no overflow.
- **Section jump bar (horizontal chips)**: Uses `overflow-x-auto` with `-webkit-overflow-scrolling: touch`, works correctly.
- **Section cards**: All use `glass-elevated` with proper `px-4`/`px-5` padding, no horizontal overflow.
- **Controls** (switches, collapsibles, time inputs, buttons): All have comfortable touch targets (44px+), proper spacing.
- **Nested sheets** (EditProfile, AISettings, Help, BiometricSetup, etc.): All use portal-based `Sheet` components -- already work correctly.
- **Scroll-to-top FAB**: Uses `fixed` positioning outside the glass header, works fine.
- **Footer links and social icons**: Properly spaced, no overflow.

Only the "Jump to Section" FloatingPanel has the off-screen rendering bug.

### Fix

**File: `src/pages/SettingsPage.tsx`**

1. Replace the `FloatingPanelRoot` / `FloatingPanelTrigger` / `FloatingPanelContent` / `FloatingPanelBody` imports with `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` imports.
2. Remove the `useFloatingPanel` import (only used by `SectionJumpButton`).
3. Add a `showJumpSheet` state variable.
4. Replace the FloatingPanel JSX block (lines 294-316) with:
   - A trigger button (same visual styling: Menu icon + optional "Sections" label) that sets `showJumpSheet = true`.
   - A `<Sheet side="bottom">` containing the section list with the same `SECTIONS.map(...)` rendering.
5. Simplify `SectionJumpButton` to accept an `onClose` callback prop instead of using `useFloatingPanel().closeFloatingPanel()`, since it will no longer be inside a FloatingPanel context.
6. The Sheet content uses `pb-safe`, `max-h-[70dvh]`, and proper touch targets.

### What stays the same

- `SECTIONS` array unchanged
- `scrollToSection` function unchanged
- `activeSection` tracking via IntersectionObserver unchanged
- Section jump bar (horizontal chips below header) unchanged
- All settings logic, handlers, and sheet states unchanged
- All other components on the page untouched

### Technical Details

```text
Before:
  header (glass-header backdrop-blur-xl)
    +-- FloatingPanelRoot
          +-- FloatingPanelTrigger (button)
          +-- FloatingPanelContent (fixed overlay -- BROKEN by backdrop-filter)

After:
  header (glass-header backdrop-blur-xl)
    +-- trigger button (sets showJumpSheet=true)
  Sheet (portal at document root -- always renders correctly)
    +-- section list
```

### Summary

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Replace FloatingPanel with Sheet for "Jump to Section" menu; simplify `SectionJumpButton` to use `onClose` prop instead of `useFloatingPanel` hook |

1 component swap. Zero logic changes. Same proven pattern as all previous fixes.
