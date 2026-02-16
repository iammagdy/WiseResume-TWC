

## Fix Remaining Scroll Issue -- AppShell Inner Wrapper

### Problem

The AppShell inner wrapper (`src/components/layout/AppShell.tsx`, line 30) still has `overflow-hidden`, which blocks touch-based scrolling on Android WebView even when child pages have their own `overflow-y-auto`.

### Fix

One single change: replace `overflow-hidden` with `overflow-y-auto` on the inner wrapper div, and add WebView touch styles.

### File: `src/components/layout/AppShell.tsx` (line 30)

**Before:**
```
<div className="flex-1 flex flex-col min-h-0 w-full animate-fade-in overflow-hidden">
```

**After:**
```
<div
  className="flex-1 flex flex-col min-h-0 w-full animate-fade-in overflow-y-auto"
  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
>
```

This makes the inner wrapper a valid scroll container, which:
1. Allows pages without their own scroll setup to scroll naturally
2. Ensures Android WebView correctly routes touch events to scrollable content
3. Works with the global CSS already in place (`touch-action: pan-y` on `.overflow-y-auto`)

### Summary

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Line 30: `overflow-hidden` to `overflow-y-auto` + WebView inline styles |

No other files need changes -- all other scroll fixes are already in place.

