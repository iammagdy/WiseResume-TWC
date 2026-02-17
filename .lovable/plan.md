

## Fix Dashboard Scroll Issue (Persistent)

### Root Cause

The previous fix (`min-h-full` to `h-full`) was on the right track but incomplete. The scroll architecture has two problems:

1. **Outer scroll container interference**: AppShell's wrapper div has `overflow-y-auto`, which can capture scroll events before PullToRefresh's internal scroll container gets them. The DashboardPage needs `overflow-hidden` to ensure it clips its content and delegates all scrolling to the PullToRefresh inner container exclusively.

2. **Missing flex shrink constraint**: Without `min-h-0` on the DashboardPage root, the flex child may refuse to shrink below its content height, preventing the inner scroll container from ever activating.

### Fix

**File: `src/pages/DashboardPage.tsx`** (line 451)

Change:
```
<div className="h-full flex flex-col">
```
To:
```
<div className="h-full flex flex-col overflow-hidden min-h-0">
```

- `overflow-hidden` -- prevents the DashboardPage from contributing scrollable content to the AppShell's outer scroll container; all scrolling is handled by PullToRefresh's inner `overflow-y-auto` div
- `min-h-0` -- allows the flex child to shrink below its natural content height, which is required for the inner scroll container to activate and become scrollable

No other files need changes. The PullToRefresh component already has the correct internal scroll architecture (`flex-1 overflow-y-auto`); it just needs its parent to properly constrain its height.

