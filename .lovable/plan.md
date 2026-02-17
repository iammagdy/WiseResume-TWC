

## Fix Dashboard Scroll Issue

### Root Cause

The dashboard has **two competing scroll containers**:

1. **AppShell's inner wrapper** (`overflow-y-auto`) -- this is the app-wide scroll context
2. **PullToRefresh's inner container** (`overflow-y-auto`) -- this is the page-level scroll context

The DashboardPage's root div uses `min-h-full flex flex-col`, which tells the browser "be at least as tall as the parent." But because the AppShell's wrapper already scrolls, the DashboardPage grows to its full content height inside that outer scroller, and the PullToRefresh's inner scroll container never gets a constrained height -- so it expands fully and never scrolls independently.

The result: the outer AppShell scroller handles some content, but the PullToRefresh container doesn't clip properly, causing the bottom content to be unreachable (the bottom tab bar's `pb-20` padding gets consumed by the wrong container).

### Fix

Change the DashboardPage root container from `min-h-full` to `h-full` so it takes exactly the height given by AppShell's flex layout, allowing the PullToRefresh scroll container inside it to properly constrain and scroll all content.

**File: `src/pages/DashboardPage.tsx`** (line 451)
- Change: `<div className="min-h-full flex flex-col">` 
- To: `<div className="h-full flex flex-col">`

This single change ensures the flex height chain is unbroken: AppShell constrains height, DashboardPage fills it exactly, PullToRefresh gets a fixed height, and its inner `overflow-y-auto` container becomes the sole scroll context -- making all content scrollable.

### Why this works
- `h-full` = "be exactly as tall as parent" -- respects the flex constraint
- `min-h-full` = "be at least as tall as parent, but grow if content is bigger" -- breaks the constraint chain, causing content to overflow without scrolling
