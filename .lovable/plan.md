

## Fix Dashboard Scroll Issue (For Real This Time)

### Root Cause Analysis

The scroll chain from AppShell to PullToRefresh has a subtle CSS conflict:

```text
AppShell root:    h-[100dvh] overflow-hidden flex-col
  main:           flex-1 flex-col min-h-0 overflow-hidden pb-20
    wrapper:      flex-1 flex-col min-h-0 overflow-y-auto   <-- SCROLL CONTAINER A
      Dashboard:  h-full flex-col overflow-hidden min-h-0
        header:   (fixed height)
        PTR:      flex-1
          inner:  flex-1 overflow-y-auto                     <-- SCROLL CONTAINER B
```

The problem is **two competing scroll containers**. The AppShell wrapper (line 33-40) has `overflow-y-auto`, making it a scroll container. The DashboardPage uses `h-full` (`height: 100%`) to try to fill it exactly -- but `height: 100%` doesn't reliably resolve inside a flex child whose own height is determined by `flex-1`. On many mobile browsers, this causes the DashboardPage to collapse or not properly constrain, so PullToRefresh's inner scroll container (B) never activates. The outer scroll container (A) may partially scroll but clips content near the bottom tab bar.

**The fix**: Change the DashboardPage root from `h-full` to `flex-1` so it participates correctly in the flex layout chain. This is the idiomatic way to fill remaining space in a flex column -- `flex-1 min-h-0` instead of `h-full min-h-0`.

### Changes

**File: `src/pages/DashboardPage.tsx`** (line 451)

Change:
```tsx
<div className="h-full flex flex-col overflow-hidden min-h-0">
```
To:
```tsx
<div className="flex-1 flex flex-col overflow-hidden min-h-0">
```

This single change makes the DashboardPage properly fill the remaining space via flexbox rather than relying on `height: 100%` resolution, ensuring PullToRefresh gets a constrained height and its internal scroll container becomes the sole scrollable area.

