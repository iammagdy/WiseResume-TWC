
## Fix ScrollProgressBar Not Tracking Scroll

### Problem

The `ScrollProgressBar` in `AppShell` is attached to a `scrollRef` div, but that div never actually scrolls. The real scrolling happens inside the `PullToRefresh` component, which has its own internal scroll container (`containerRef` on line 162 of `pull-to-refresh.tsx`). Since scroll events fire on the PullToRefresh container (not the AppShell wrapper), the progress bar stays at 0%.

### Fix

**File: `src/components/ui/pull-to-refresh.tsx`**

Expose the internal scroll container ref so parent components can listen to its scroll events:
- Accept an optional `scrollRef` prop (a forwarded `RefObject`)
- When provided, sync it with the internal `containerRef` so the ScrollProgressBar can attach to the actual scrolling element

**File: `src/pages/DashboardPage.tsx`**

- Create a `scrollRef` using `useRef` and pass it to `PullToRefresh` via the new prop

**File: `src/components/layout/AppShell.tsx`**

- Remove the `scrollRef` from AppShell since individual pages (like Dashboard) will own their scroll refs
- Move `ScrollProgressBar` responsibility to pages that need it, or keep it in AppShell but attach it to a shared ref mechanism

### Simpler Alternative (preferred)

Instead of restructuring refs across pages, move the `ScrollProgressBar` into the `PullToRefresh` component itself, since it already owns the scroll container:

**File: `src/components/ui/pull-to-refresh.tsx`**
- Import `ScrollProgressBar`
- Render it inside PullToRefresh, passing the internal `containerRef`

**File: `src/components/layout/AppShell.tsx`**
- Remove `ScrollProgressBar` from AppShell (it no longer needs a scrollRef here)
- Remove the `scrollRef` and its usage since the progress bar is now co-located with the actual scroll container

This approach is cleaner because the progress bar lives alongside the element that actually scrolls, with no ref-forwarding complexity.

### Technical Summary

| Item | Detail |
|------|--------|
| Root cause | ScrollProgressBar listens on AppShell div, but PullToRefresh has the real scroll container |
| Fix | Move ScrollProgressBar into PullToRefresh where the actual scroll container lives |
| Files changed | `pull-to-refresh.tsx`, `AppShell.tsx` |
| Risk | Low -- progress bar simply relocates to the correct scroll parent |
