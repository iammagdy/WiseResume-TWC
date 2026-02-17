

## Fix Dashboard Scroll - New Approach

### Why All Previous Fixes Failed

All 4 previous attempts tried to fix classes on the DashboardPage child element. But the real problem is in the **parent**: AppShell's wrapper div has `overflow-y-auto`, making it a scroll container. Inside a scroll container, flex children expand to their full content height -- they are never constrained. So PullToRefresh's inner scroll container never activates because its height equals its content height (nothing to scroll).

```text
CURRENT (BROKEN):
AppShell wrapper: overflow-y-auto (SCROLL CONTAINER - lets children grow)
  DashboardPage: flex-1 (IGNORED - parent is scroll container, so this expands)
    PullToRefresh inner: overflow-y-auto (DEAD - height = content height, nothing to scroll)
```

### The Fix: Two files, simple changes

**Strategy**: Remove PullToRefresh's nested scroll container. Let the content flow naturally inside AppShell's existing scroll. PullToRefresh only handles the pull-down gesture by listening to the AppShell scroll container (its nearest scrollable ancestor), not its own internal div.

#### File 1: `src/components/ui/pull-to-refresh.tsx`

Remove the internal `overflow-y-auto` scroll container. Instead of creating its own scroll context, PullToRefresh will:
- Render children directly without wrapping them in a scrollable div
- Find the nearest scrollable ancestor to detect `scrollTop === 0` for the pull gesture
- Keep the pull-down animation (motion.div with y transform) working as before

Key changes:
- The inner `containerRef` div changes from `overflow-y-auto` to a simple non-scrolling wrapper
- Touch handlers look for the nearest scrollable parent to check `scrollTop`
- Remove the `ScrollProgressBar` from inside PullToRefresh (AppShell already has one)

```text
BEFORE:
  <div class="h-full flex-col">        (PTR root)
    <motion.div class="flex-1">        (transform wrapper)
      <div class="overflow-y-auto">    (SCROLL CONTAINER B - broken)
        {children}
      </div>
    </motion.div>
  </div>

AFTER:
  <div class="relative">               (PTR root - no height constraint needed)
    <motion.div>                        (transform wrapper)
      <div ref={containerRef}>          (just a wrapper, no scroll)
        {children}
      </div>
    </motion.div>
  </div>
```

The touch handler change: instead of `container.scrollTop`, walk up to find the nearest scrollable ancestor and check its `scrollTop`.

#### File 2: `src/pages/DashboardPage.tsx`

Remove the scroll-fighting classes. Since AppShell handles scrolling, DashboardPage just needs to be a normal block element that flows naturally.

- Change root div from `flex-1 flex flex-col overflow-hidden min-h-0` to just `flex flex-col` (or even simpler)
- Content flows naturally, AppShell's `overflow-y-auto` scrolls everything
- The `pb-safe` padding on the inner content ensures clearance above the bottom tab bar

```text
BEFORE: <div className="flex-1 flex flex-col overflow-hidden min-h-0">
AFTER:  <div className="flex flex-col min-h-full">
```

Wait -- `min-h-full` was the original and it didn't work either. The issue was that content was clipped. But now with PullToRefresh no longer creating its own scroll container, the content flows naturally and AppShell scrolls it. `min-h-full` ensures the page fills the viewport when content is short, and grows beyond when content is long.

### Why This Will Work

- **Single scroll container**: Only AppShell's wrapper scrolls. No competing scroll containers.
- **Content flows naturally**: DashboardPage and its children expand to their natural height. Resume cards, stats, everything renders at full height.
- **AppShell handles scrolling**: The existing `overflow-y-auto` on AppShell's wrapper scrolls all the content. The `pb-20` padding on `main` ensures the bottom tab bar doesn't overlap.
- **Pull-to-refresh still works**: The gesture detection checks the scroll ancestor's `scrollTop === 0` before activating the pull-down animation.

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/ui/pull-to-refresh.tsx` | Remove internal scroll container; find nearest scrollable ancestor for scrollTop check; remove embedded ScrollProgressBar |
| `src/pages/DashboardPage.tsx` | Simplify root classes to `flex flex-col min-h-full` -- no overflow/height constraints needed |

