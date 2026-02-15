

## Mobile Responsiveness Fix: Global Mobile Enhancements

### Overview

Apply targeted global mobile improvements to the viewport meta tag, CSS globals, toast notifications, and the Applications/Jobs page. Most global enhancements (safe areas, overflow-x hidden, momentum scrolling, settings row touch targets) are already well-implemented.

### Changes

**File 1: `index.html`**

Update viewport meta tag to allow zoom up to 5x for accessibility:

- Change `content="width=device-width, initial-scale=1.0, viewport-fit=cover"` to `content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"`
- This improves accessibility by allowing users to pinch-zoom

**File 2: `src/index.css`**

Add smooth scrolling and minor global improvements:

- Add `scroll-behavior: smooth;` to the `html` rule (currently only has font-family and font-smoothing)
- No other global CSS changes needed -- safe areas, overflow-x hidden, momentum scrolling, and overscroll-behavior are already implemented on the body

**File 3: `src/index.css` (toast section)**

Improve toast mobile styling in the existing `@media (max-width: 640px)` block:

- Add `font-size: 14px !important;` to `.toast-premium` within the media query so text is comfortably readable on small screens
- Add `padding-top: env(safe-area-inset-top)` to `[data-sonner-toaster]` within the media query so toasts respect the notch

**File 4: `src/components/applications/JobActivityStats.tsx`**

Optimize the 2x2 stats grid for very small screens:

- Change `grid grid-cols-2 gap-3` to `grid grid-cols-1 sm:grid-cols-2 gap-3` so cards stack single-column on screens under 640px
- Change `min-h-[48px]` to `min-h-[100px]` for comfortable card height on mobile
- The icon/label/value layout within each card is already well-structured

**File 5: `src/pages/ApplicationsPage.tsx`**

Optimize tabs and activity feed for mobile touch:

- **Tab buttons**: Change from `px-3 py-1.5 text-xs` to `px-4 py-2.5 text-sm min-h-[48px] flex-1` so tabs are full-width and have 48px touch targets
- **Tab container**: Change from `flex gap-2` to `flex gap-2 w-full`
- **Application cards**: Add `min-h-[80px]` to each application card button for comfortable touch
- **Save Job FAB**: Change from `w-14 h-14 bottom-20` to `w-16 h-16 bottom-24 sm:bottom-20` for a larger (64px) touch target with nav bar clearance

**File 6: `src/components/applications/ActivityTimeline.tsx`**

Make timeline entries more tappable on mobile:

- Add `min-h-[80px]` to each timeline entry container for comfortable touch interaction
- Add `cursor-pointer` to all entries (not just resume types) so they feel interactive
- The existing layout with icon + text + badge is already well-optimized

### What Does NOT Change

- Resume CRUD operations, version history, ATS scoring
- Navigation routing, deep linking, tab persistence
- All dialog/sheet modals and their animations
- Toast auto-dismiss duration (already 4000ms / 4 seconds)
- Toast swipe-to-dismiss (already built into Sonner library)
- Settings page toggles (already min-h 56px with proper touch targets)
- Settings Switch component (already h-7 w-12 -- adequate)
- Loading skeletons and spinners (already centered and visible)
- Desktop layouts (640px+/768px+) -- identical behavior and appearance
- All AI features and data operations

### Technical Notes

- Viewport `maximum-scale=5.0` maintains WCAG 2.1 AA compliance for zoom accessibility
- `scroll-behavior: smooth` on html enables smooth anchor scrolling (used by activity stats scroll-to-timeline)
- Toast safe-area padding uses `env(safe-area-inset-top)` which gracefully falls back to 0 on non-notched devices
- Stats grid uses `sm:` breakpoint (640px) for single-to-double column transition
- Tab buttons use `flex-1` to distribute width evenly across the tab bar
- All changes use Tailwind responsive prefixes or CSS media queries only

