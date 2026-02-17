

## Fix Scrolling and Scroll Progress Bar Across All Pages

### Problem Analysis

Two critical scroll bugs were identified:

**1. Homepage (`/`) cannot scroll at all**
- The `SpaceBackground` component applies `overflow-hidden` to its root container, which blocks all scrolling
- The sticky header uses `window.scrollY` for detection, but since the page can't scroll, it never triggers
- The homepage is rendered outside `AppShell`, so it has no scroll container or progress bar

**2. Scroll progress bar is missing on most pages**
- The `ScrollProgressBar` only renders inside the `PullToRefresh` component
- Pages without `PullToRefresh` (Homepage, Templates, Editor, Guides, etc.) never show a progress bar
- Even pages with `PullToRefresh` use a nested scroll context that disconnects from the AppShell scroll container

---

### Fix 1: SpaceBackground -- Remove overflow-hidden

**File:** `src/components/landing/SpaceBackground.tsx`

Change the root `div` from `overflow-hidden` to `overflow-x-hidden` so vertical scrolling is allowed while horizontal overflow (from nebula gradients) is still clipped.

---

### Fix 2: Homepage scroll detection -- use the correct scroll container

**File:** `src/pages/Index.tsx`

The homepage is outside AppShell, so its scroll container is either the `SpaceBackground` div or the AppShell inner wrapper (when rendered inside it). The `window.scrollY` listener needs to be replaced with a ref-based listener on the actual scrollable container. Since `SpaceBackground` will now allow native scroll, `window.scrollY` should work once the overflow is fixed. No additional change needed here beyond Fix 1.

---

### Fix 3: Add ScrollProgressBar to AppShell globally

**File:** `src/components/layout/AppShell.tsx`

Currently the scroll progress bar only appears inside `PullToRefresh`. To make it app-wide:

- Add a `ref` to the inner scrollable `div` (line 31)
- Render `ScrollProgressBar` with that ref, positioned at the top of the main content area
- This gives every page rendered through AppShell an automatic scroll progress indicator

---

### Fix 4: Make ScrollProgressBar use sticky positioning

**File:** `src/components/layout/ScrollProgressBar.tsx`

Change from `absolute` to `sticky top-0` positioning so the bar stays visible at the top of the viewport as the user scrolls, rather than scrolling away with content. Also ensure it uses a high enough z-index to stay above page headers.

---

### Fix 5: Homepage-specific scroll progress bar

**File:** `src/pages/Index.tsx`

Since the homepage is outside AppShell, it needs its own scroll progress bar. Add a ref to the `SpaceBackground` scrollable container or use a `window` scroll listener to track progress, and render a `ScrollProgressBar`-like indicator at the top of the page.

---

### Summary of Changes

| File | Change |
|------|--------|
| `SpaceBackground.tsx` | Replace `overflow-hidden` with `overflow-x-hidden` to allow vertical scroll |
| `AppShell.tsx` | Add ref to scroll container + render `ScrollProgressBar` globally |
| `ScrollProgressBar.tsx` | Change to `sticky` positioning so it stays at viewport top |
| `Index.tsx` | Add window-scroll-based progress bar for the homepage |

### Technical Details

- The `PullToRefresh` component will continue to have its own `ScrollProgressBar` inside its nested scroll container. The AppShell-level bar covers all non-PullToRefresh pages.
- Pages using `PullToRefresh` already have their progress bar via that component, so no duplication occurs -- the AppShell scroll container doesn't scroll when PullToRefresh handles it internally.
- The homepage uses `window.scroll` since it renders outside AppShell entirely.
- No changes to the `PullToRefresh` component are needed.

