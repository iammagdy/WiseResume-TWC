

## Fix Scrolling Across the Entire App on Android WebView

### Root Cause Analysis

After analyzing the full scroll architecture, there are **three interconnected problems** causing scrolling to fail on Android:

1. **AppShell's inner wrapper has no scroll context**: The `<main>` tag has `overflow-hidden` (correct for clipping), but the inner `<div>` that wraps all page content has NO overflow property. Pages must each set up their own scroll context -- and many don't.

2. **Inconsistent page scroll setups**: Some pages (DashboardPage, ResignationLettersPage) use `min-h-full` which expects the PARENT to scroll, but the parent has `overflow-hidden`. Other pages (ResumeDetailPage, AIStudioPage) correctly use `overflow-y-auto` but lack consistent WebView properties.

3. **PullToRefresh breaks touch scrolling**: The PullToRefresh component applies a Framer Motion `style={{ y }}` transform directly to the scroll container (`<motion.div className="overflow-y-auto">`). On Android WebView, applying CSS transforms to a scrollable element causes the WebView to lose track of touch events, breaking scroll entirely.

### The Fix (4 changes)

**Change 1: AppShell -- Add `overflow-y-auto` to the inner wrapper**

Make the inner `<div>` the app-wide scroll container so ALL pages scroll automatically, even those without their own overflow handling.

```
File: src/components/layout/AppShell.tsx

Before:
<div className="flex-1 flex flex-col min-h-0 w-full animate-fade-in">

After:
<div className="flex-1 flex flex-col min-h-0 w-full animate-fade-in overflow-y-auto"
     style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
```

**Change 2: PullToRefresh -- Separate transform from scroll container**

Currently the same `<motion.div>` is both the scroll container AND the transform target. On Android WebView, this breaks scrolling. Fix by wrapping: outer `motion.div` handles the pull-down transform, inner `div` handles scrolling.

```
File: src/components/ui/pull-to-refresh.tsx

Before:
<motion.div ref={containerRef}
  className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
  style={{ y }}>
  {children}
</motion.div>

After:
<motion.div className="flex-1 flex flex-col min-h-0" style={{ y }}>
  <div ref={containerRef}
    className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
    style={{ WebkitOverflowScrolling: 'touch' }}>
    {children}
  </div>
</motion.div>
```

**Change 3: Global CSS -- WebView scroll properties**

Add Android WebView scroll fixes to ALL `overflow-y-auto` elements globally, so every scrollable container in the app benefits without needing inline styles.

```
File: src/index.css

Add:
/* Android WebView scroll fix - apply to ALL scrollable containers */
.overflow-y-auto,
.overflow-y-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}
```

**Change 4: Remove redundant inline styles**

Since the CSS now handles it globally, remove the inline `style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}` from AIStudioPage and ResumeDetailPage to keep things clean (the global CSS will cover them).

### Summary

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Add `overflow-y-auto` + WebView styles to inner wrapper div |
| `src/components/ui/pull-to-refresh.tsx` | Separate transform element from scroll container |
| `src/index.css` | Global WebView scroll fix for all `overflow-y-auto` elements |
| `src/pages/AIStudioPage.tsx` | Remove redundant inline scroll styles |
| `src/pages/ResumeDetailPage.tsx` | Remove redundant inline scroll styles |

