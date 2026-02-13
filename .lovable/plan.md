

## Settings Page Scroll Enhancements

### Overview
Add three scroll-related UX improvements to the Settings page: a scroll-to-top FAB, smooth scroll anchoring for section headers, and a sticky current-section indicator.

### Changes to `src/pages/SettingsPage.tsx`

#### 1. Scroll-to-Top Floating Button

Add a floating "scroll to top" button that appears when the user scrolls past the Appearance section (~200px from top).

- Add a `useRef` for the scrollable container (`div.overflow-y-auto` at line 225) and a `showScrollTop` boolean state
- Attach an `onScroll` handler to the container that sets `showScrollTop = scrollTop > 300`
- Render a fixed `ArrowUp` icon button at the bottom-right corner (above the bottom tab bar), wrapped in `AnimatePresence` + `motion.button` for fade+scale entry/exit
- On click: `scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })`
- Styled as a 44px glass-elevated circle with primary icon, positioned `bottom-24 right-5` (above tab bar)

**New import:** `ArrowUp` from `lucide-react`

#### 2. Smooth Scroll Anchoring via Section IDs

Add `id` attributes to each section wrapper so they can be scroll-targeted:

| Section | ID |
|---------|-----|
| Appearance | `section-appearance` |
| AI & Voice | `section-ai-voice` |
| Editor & Export | `section-editor-export` |
| Notifications | `section-notifications` |
| Privacy & Security | `section-privacy` |
| Account | `section-account` |
| About & Help | `section-about` |

These IDs enable future deep-linking and programmatic scrolling. The scroll container gets `scroll-behavior: smooth` via inline style.

#### 3. Sticky Current-Section Header

Add a small sticky header bar at the top of the scroll container that shows the name of the section currently in view.

- Define a `SECTIONS` array: `[{ id, label, icon }]` matching the section IDs above
- Use an `IntersectionObserver` (in a `useEffect`) observing each section element with `threshold: 0.1` and `rootMargin: '-80px 0px -80% 0px'` (biased toward the top)
- Track `activeSection` state (string ID of the currently visible section)
- Render a small bar just below the main header, inside the scroll container but with `sticky top-0 z-10`:
  - Shows the section icon + label (e.g., "Appearance", "AI & Voice")
  - Uses `glass-header backdrop-blur-md` for the frosted glass look
  - Animated text swap via `AnimatePresence` with `mode="wait"` and a quick fade
  - Only visible when `showScrollTop` is true (i.e., user has scrolled past the first section) to avoid redundancy at the top

### Layout Structure

```text
+---------------------------+
| <- Settings     (header)  |
+---------------------------+
| [Palette] Appearance      |  <-- sticky section indicator (appears on scroll)
+---------------------------+
|                           |
|   [scrollable content]    |
|                           |
|                           |
|                     [^]   |  <-- scroll-to-top FAB
+---------------------------+
|  Home  Editor  Jobs  Set  |  <-- bottom tab bar
+---------------------------+
```

### Technical Details

| Area | Detail |
|------|--------|
| New state | `showScrollTop: boolean`, `activeSection: string` |
| New ref | `scrollRef: useRef<HTMLDivElement>` |
| New import | `ArrowUp` from lucide-react |
| Observer | `IntersectionObserver` in `useEffect`, cleaned up on unmount |
| Scroll container | Add `ref={scrollRef}`, `onScroll` handler, `scroll-behavior: smooth` style, to the `div` at line 225 |
| Sticky bar | Rendered as first child inside the scroll container, `sticky top-0 z-10` |
| FAB position | `fixed bottom-24 right-5 z-20` to clear the bottom tab bar |
| File | Only `src/pages/SettingsPage.tsx` |

