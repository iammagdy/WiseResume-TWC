

# Fix Bottom Bar Not Showing on Editor Page

## Problem

The editor page's bottom AI Studio bar disappears on some devices due to fragile flex layout nesting. The layout chain is:

```text
AppShell (min-h-[100dvh], flex-col)
  main (flex-1, overflow-hidden)
    div (flex-1, min-h-0, h-full)
      EditorPage root (flex-1, flex-col, min-h-0, overflow-hidden)
        header (shrink-0)
        progress bar (shrink-0)
        StepperNav (NO shrink-0)
        content wrapper (flex-1, overflow-hidden)
          scrollable area (flex-1, overflow-y-auto)
        bottom bar (shrink-0, glass)
```

The bottom bar relies on every ancestor in this 4-level-deep flex chain calculating heights correctly. On devices with unusual viewport behavior (dynamic toolbars, notch insets, etc.), the flex container can miscalculate available height, pushing the bottom bar below the visible area.

Additionally, StepperNav has no `shrink-0`, allowing it to potentially collapse or behave unpredictably under space pressure.

## Root Causes

1. **Flex-only positioning is fragile for persistent bottom UI** -- The bottom bar depends on correct height propagation through 4 nested flex containers. Any miscalculation hides it.
2. **StepperNav missing `shrink-0`** -- Under tight space, the stepper could shrink, destabilizing the layout.
3. **AppShell inner div has `h-full`** -- This can conflict with `flex-1` on some browsers, creating height ambiguity.

## Solution

Make the bottom bar use `sticky bottom-0` positioning instead of relying solely on flex layout. This guarantees visibility regardless of content height or flex chain behavior. Also add `shrink-0` to the StepperNav and clean up the inner content wrapper.

## Changes

### 1. `src/pages/EditorPage.tsx`

- **StepperNav wrapper**: Add `shrink-0` class to prevent it from collapsing.
- **Bottom bar**: Change from `shrink-0 glass border-t` to `sticky bottom-0 z-30 glass border-t`. This anchors it to the bottom of the scroll ancestor, ensuring it is always visible even if flex height calculations fail.
- **Content area padding**: Add `pb-2` to the scrollable content area to ensure section navigation buttons don't overlap with the sticky bottom bar.

### 2. `src/components/layout/AppShell.tsx`

- Remove `h-full` from the inner div wrapping `{currentOutlet}` -- this conflicts with `flex-1` on some mobile browsers and can cause the flex container to either over-expand or under-expand.

## Technical Details

The sticky approach is more resilient because:
- It doesn't depend on all parent flex containers calculating height correctly
- It works with both `overflow-hidden` and `overflow-auto` ancestors
- It gracefully handles dynamic viewport changes (iOS Safari toolbar, keyboard, etc.)
- The BottomTabBar already uses `fixed` positioning for the same reason -- persistent bottom UI should never rely on flex-only layout

