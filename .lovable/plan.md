

## Fix Dashboard (Home Tab) Scroll Interception by Buttons

### Root Cause

The Dashboard page is densely packed with interactive elements that use framer-motion's `whileTap` and `drag` handlers. When a user places their finger on one of these elements to scroll vertically, framer-motion captures the touch event for its own gesture system (tap detection, drag), preventing the browser from initiating a native scroll. The browser needs `touch-action: pan-y` on these elements to know that vertical panning (scrolling) should take priority over JavaScript-driven gestures.

### Affected Components

1. **ActionCard** (`src/components/home/ActionCard.tsx`) -- Uses `motion.button` with `whileTap={{ scale: 0.98 }}`. Covers most of the empty-state dashboard.
2. **QuickActionChips** (`src/components/dashboard/QuickActionChips.tsx`) -- Uses `motion.button` with `whileTap={{ scale: 0.93 }}`. Three chips spanning the full width.
3. **DailyTipCard** (`src/components/dashboard/DailyTipCard.tsx`) -- Uses `drag="x"` on the tip card, which can fight with vertical scrolling.
4. **ChoiceCard** (`src/components/home/ChoiceCard.tsx`) -- Uses `motion.button` with `whileTap={{ scale: 0.98 }}`.
5. **DashboardStats** (`src/components/dashboard/DashboardStats.tsx`) -- Less problematic but its glass card covers significant area.
6. **ResumeListCard** (`src/components/dashboard/ResumeListCard.tsx`) -- Uses `drag="x"` for swipe gestures; needs `touch-action: pan-y` so vertical scrolling passes through.

### Fix Strategy

Add `style={{ touchAction: 'pan-y' }}` (or the CSS equivalent) to all interactive motion elements within the scroll container. This tells the browser: "Vertical panning is handled natively (scrolling); only capture horizontal gestures in JavaScript."

### Technical Changes

**`src/components/home/ActionCard.tsx`**
- Add `style={{ touchAction: 'pan-y' }}` to the `motion.button` element

**`src/components/dashboard/QuickActionChips.tsx`**
- Add `style={{ touchAction: 'pan-y' }}` to each `motion.button` chip

**`src/components/dashboard/DailyTipCard.tsx`**
- Add `style={{ touchAction: 'pan-y' }}` to the `motion.div` with `drag="x"`
- This allows vertical scrolling to pass through while still permitting horizontal swipe-to-dismiss

**`src/components/home/ChoiceCard.tsx`**
- Add `style={{ touchAction: 'pan-y' }}` to the `motion.button`

**`src/components/dashboard/ResumeListCard.tsx`**
- Add `touchAction: 'pan-y'` to the draggable `motion.div` (the one with `drag="x"`)
- This preserves horizontal swipe gestures while allowing vertical scroll passthrough

### Why This Works

The CSS `touch-action` property controls which touch gestures are handled by the browser vs. JavaScript. Setting `pan-y` means:
- Vertical finger movement triggers native scrolling (browser handles it)
- Horizontal finger movement is available for JavaScript gesture handlers (framer-motion drag)
- Tap/press events still fire normally for button clicks

This is the standard web platform solution for scroll-vs-gesture conflicts and does not require any changes to event handlers or component logic.
