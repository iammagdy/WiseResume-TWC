

## Redesign Toast Notifications from Scratch

### What Changes

Replace the current heavy "premium card" toast design with a clean, minimal iOS-style pill that appears at the top center. No close buttons, no progress bars -- just a compact icon + text pill that auto-dismisses.

### Current Issues Being Fixed

- Empty toasts appearing (caused by complex CSS overrides conflicting with Sonner internals)
- Duplicate toast stacking issues
- Overly complex CSS with `!important` overrides fighting Sonner defaults
- Progress bar animation sometimes rendering on empty toasts

### New Design: Minimal Pill

- Compact rounded pill (border-radius: 9999px)
- Colored dot indicator (green/red/amber/blue) instead of large icons
- Single line of text, no description support
- Subtle drop shadow, solid background (no glassmorphism on toasts)
- Slides down from top with a spring animation
- Max 3 visible, stacked with slight scale reduction
- Auto-dismiss at 3 seconds (errors at 5 seconds)
- No close button, no swipe, no haptics

### Technical Plan

**File 1: `src/index.css`** (remove old toast CSS)
- Delete the entire "Premium Toast Surface" section (lines 1043-1146): keyframes, `.toast-premium`, `.toast-*-accent`, progress bar, mobile overrides
- Add new minimal pill styles (~30 lines):
  - `.toast-pill` -- compact pill with solid background, rounded-full, centered text
  - `.toast-dot-success/error/warning/info` -- small 8px colored dot indicators
  - `@keyframes toast-pill-in` -- subtle slide-down + fade entrance
  - Mobile override for safe-area-inset-top

**File 2: `src/components/ui/sonner.tsx`** (rewrite Toaster config)
- Remove custom icon overrides (CheckCircle2, XCircle, etc.)
- Replace with small colored dot `<span>` elements as icons
- Update `toastOptions.classNames` to use new `.toast-pill` class
- Set `visibleToasts={3}` to cap stacking
- Set `duration={3000}` (shorter for minimal pills)
- Keep `closeButton={false}` and `position="top-center"`
- Add `gap={8}` for tighter stacking

**No changes to toast call sites** -- all 89 files using `toast.success()`, `toast.error()`, etc. continue working identically since we're only changing the visual presentation layer.

### Visual Preview

```text
       ┌──────────────────────────┐
       │  ●  Resume saved         │   <-- green dot, pill shape
       └──────────────────────────┘
       ┌──────────────────────────┐
       │  ●  Upload failed        │   <-- red dot, pill shape
       └──────────────────────────┘
```

### Summary

| Item | Detail |
|------|--------|
| Files changed | `src/index.css`, `src/components/ui/sonner.tsx` |
| Toast call sites changed | 0 (all 89 files untouched) |
| Dependencies | None (still using Sonner) |
| Haptics | None per your preference |
| Stacking | Max 3 visible |
| Dismissal | Auto-dismiss only (3s default, 5s errors) |

