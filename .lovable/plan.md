

# Premium Toast Notification Redesign

## Overview
Redesign the Sonner toast notifications to feel more premium, with animated gradient borders, subtle entrance/exit animations, colored status icons, and refined glassmorphism that matches the Cosmic Glass UI theme.

## Changes

### 1. `src/components/ui/sonner.tsx` -- Full component redesign
- Add a custom CSS import for toast-specific animations
- Add colored left-accent borders per toast type (success = green, error = red, warning = amber, info = cyan) instead of tinted backgrounds
- Use a more refined glass surface with stronger backdrop blur
- Style the close button as a subtle, circular icon
- Add custom icon rendering per toast type using Lucide icons (CheckCircle, XCircle, AlertTriangle, Info)
- Pass `icons` prop to Sonner for premium custom icons with colored styling
- Increase border-radius to `1.25rem` for a softer, more modern look
- Add a subtle shimmer/glow animation on the left accent strip

### 2. `src/index.css` -- Add toast-specific premium styles
- Add a `.toast-accent` utility with a 3px left border using gradient colors
- Add `@keyframes toast-slide-in` for a smooth slide + fade entrance from top
- Add `@keyframes toast-shimmer` for a subtle shimmer effect on the accent border
- Add `.toast-premium` class combining glass-elevated with enhanced shadow, refined border, and the slide-in animation
- Add per-type accent classes: `.toast-success-accent`, `.toast-error-accent`, `.toast-warning-accent`, `.toast-info-accent` with matching gradient left borders
- Add a subtle progress bar animation at the bottom of each toast matching the auto-dismiss duration

## Technical Details

### Toast Structure (visual)

```text
+-----------------------------------------------+
| [colored accent]  Icon  Title           [x]    |
|                         Description            |
| [subtle progress bar ========================] |
+-----------------------------------------------+
```

### Files Modified (2 files)

| File | Change |
|------|--------|
| `src/components/ui/sonner.tsx` | Redesigned component with custom icons, accent styling, refined glass classes |
| `src/index.css` | New toast animation keyframes and premium utility classes |

### No Breaking Changes
- The `toast()` API stays identical -- all existing `toast.success()`, `toast.error()`, etc. calls work without modification
- The `<Toaster />` component stays in the same location in `App.tsx`
- Position remains `top-center` per the established pattern

