

## Fix Toast Notification UI

### Problem

The toast shows overlapping icons -- the close button (X circle) renders on top of the success checkmark icon on the left side, creating a cluttered, broken appearance. The layout is cramped with icons colliding.

### Root Cause

Sonner's `closeButton` renders inside the toast alongside the custom status icon. Combined with the `toast-premium` CSS that applies tight padding (`14px 16px`) and the `overflow: hidden` rule, the close button overlaps the status icon area.

### Changes

**1. File: `src/components/ui/sonner.tsx`**

- Disable `closeButton={true}` -- set it to `false`. Toasts already auto-dismiss after 4 seconds and can be swiped away, so the close button is redundant and causes the overlap.
- Alternatively, add explicit class styling to push the close button to the right edge using the `closeButton` classNames key.

Recommended approach: set `closeButton={false}` since mobile toasts are swipe-dismissible and auto-dismiss after 4s. This immediately fixes the overlap.

**2. File: `src/index.css` (lines 1035-1050)**

- Increase left padding on `.toast-premium` to give the icon breathing room: change `padding: 14px 16px` to `padding: 14px 18px 14px 14px`
- Add explicit styling for the close button position in case it's re-enabled later:
  ```css
  .toast-premium [data-close-button] {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
  }
  ```
- Add `min-height: 48px` to ensure the toast meets the 44px touch target guideline
- Add `align-items: center` to vertically center the icon with the text

### Result

Clean toast with the success icon on the left, message text centered, and the "Undo" action button on the right -- no overlapping elements.

