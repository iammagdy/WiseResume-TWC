

## Fix: Non-Scrollable Job Details and Application Details Pages

### Root Cause
The `AppShell` layout uses a flex column with `overflow-hidden` on the `<main>` element, and wraps page content in a `motion.div` with `min-h-0`. For scrolling to work, the page's own root element must also participate in the flex layout correctly.

Both `ApplicationTrackerPage` and `JobDetailPage` use `overflow-y-auto` on their root `motion.div`, but they lack `min-h-0` and explicit height constraints. This causes the element to grow beyond the viewport rather than becoming scrollable.

### Fix

**File: `src/pages/ApplicationTrackerPage.tsx` (line 74)**
Add `min-h-0 h-full` to the root motion.div:
```tsx
// Before
<motion.div ... className="flex-1 overflow-y-auto overscroll-y-contain pb-6">

// After
<motion.div ... className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain pb-6">
```

**File: `src/pages/JobDetailPage.tsx` (line 57)**
Same fix -- add `min-h-0 h-full`:
```tsx
// Before
<motion.div ... className="flex-1 overflow-y-auto overscroll-y-contain pb-6">

// After
<motion.div ... className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain pb-6">
```

These two single-line class additions will enable proper scrolling on both detail pages by ensuring the flex child constrains its height instead of overflowing.

