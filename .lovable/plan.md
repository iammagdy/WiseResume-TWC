

## Fix the Floating "+" Button to Stay Fixed on Screen

### Root Cause

The FAB already uses CSS `position: fixed`, but it's rendered inside a parent `div` with the `animate-fade-in` class in `AppShell.tsx` (line 30). That animation uses `transform: translateY(...)`, which creates a new CSS containing block. This causes `fixed` positioning to be relative to that animated parent instead of the viewport -- so the button scrolls with the content.

### Solution

Render the `FloatingCreateButton` through a **React Portal** to `document.body`. This moves the DOM node outside the transformed ancestor, allowing `fixed` positioning to work correctly against the viewport.

### Changes

**File: `src/components/dashboard/FloatingCreateButton.tsx`**

- Import `createPortal` from `react-dom`
- Wrap the entire returned JSX in `createPortal(..., document.body)`
- No other changes needed -- the existing `fixed bottom-24 right-4` classes will now work correctly since the element is attached directly to `<body>`

### Result

The "+" FAB will remain pinned to the bottom-right corner of the screen at all times, regardless of scroll position or page animations.
