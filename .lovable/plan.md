

# Dashboard (Home Page) Improvements

## Issues Found

### 1. Performance: Remaining infinite animation loops
- **EmptyState.tsx line 76**: Floating icon has `y: { repeat: Infinity }` -- another infinite Framer Motion loop we missed in previous passes
- **EmptyState.tsx line 84**: `animate-ring-pulse` and `animate-pulse` CSS classes running infinitely on elements that should settle
- **DashboardStats.tsx**: The `conic-gradient` border uses a CSS `animation: rotate-gradient 6s linear infinite` -- an infinite CSS animation on the main stats card

### 2. Performance: localStorage reads during render
- **DashboardPage.tsx lines 581-606**: The trust banner IIFE runs `localStorage.getItem` and `localStorage.setItem` directly inside the render function on every re-render. This should be moved to state initialized once.
- **DashboardPage.tsx line 499**: `localStorage.getItem('wr-profile-pulse-seen')` is read inline during render

### 3. Performance: Stagger animations doing nothing
- **DashboardPage.tsx lines 801-806 and 873-877**: The `staggerChildren: 0.05` variants reference `itemVariants` (lines 415-418) that set `opacity: 1, y: 0` for both `hidden` and `visible` -- meaning Framer Motion processes stagger overhead for zero visual effect. Either remove the motion wrappers or add actual entrance animations.

### 4. UX: DashboardStats card is too dense
- The glass hero card crams greeting, streak, daily tip, motivational subtitle, and stat badges into one card. On xs (375px) screens the tip text truncates aggressively and the dismiss button is hard to tap.
- **Fix**: Move the daily tip outside the stats card into a standalone dismissible banner below it, giving each element breathing room.

### 5. UX: Empty state has too many CTAs
- When no resumes exist, users see: 4 ActionCards grid + EmptyState with 3 steps + 3 template previews + 2 CTA buttons + tips carousel. That's 12+ tap targets competing for attention.
- **Fix**: Consolidate -- remove the ActionCards grid from the empty state (keep it only when resumes exist as QuickActionChips already does), and let the EmptyState component be the single focus.

### 6. UX: WhatsNextCard lacks visual hierarchy
- It's a plain glass card that blends with everything else. Since it's the primary CTA for returning users, it should stand out more.
- **Fix**: Add a subtle gradient left border or a primary-tinted background to make it visually distinct from resume cards.

### 7. Code: 1076-line monolith page component
- DashboardPage.tsx is over 1000 lines with inline handlers, render logic, and state management all in one file. This hurts maintainability and increases bundle parse time.
- **Fix**: Extract the header, trust banner, selection toolbar, and tab content into separate components.

---

## Proposed Changes

### File: `src/components/dashboard/EmptyState.tsx`
- Remove `repeat: Infinity` from the floating icon's y animation (line 76) -- animate once and hold
- Remove `animate-ring-pulse` infinite animation from the icon border
- Keep the tips carousel as-is (it's CSS-based AnimatePresence, lightweight)

### File: `src/components/dashboard/DashboardStats.tsx`
- Remove the `rotate-gradient` infinite CSS animation on the conic-gradient border -- use a static gradient border instead
- Separate the daily tip into its own small component below the stats card for better spacing on xs screens

### File: `src/pages/DashboardPage.tsx`
- **Trust banner**: Move localStorage reads into a `useState` initializer so they only run once
- **Profile pulse**: Same -- cache in state, not inline render
- **Stagger variants**: Either add real entrance animations (opacity 0 to 1) or remove the motion wrappers to avoid overhead
- **Empty state simplification**: Remove the 4-card ActionCards grid when `resumes.length === 0` -- the EmptyState component already provides all necessary entry points
- **Extract DashboardHeader**: Move the header (lines 471-575) into its own component to reduce file size

### File: `src/components/dashboard/WhatsNextCard.tsx`
- Add a primary-tinted left border and slightly stronger background to differentiate it from resume cards
- Add a subtle "Suggested next step" label above the title for clarity

---

## Summary

| Area | Issue | Fix |
|---|---|---|
| EmptyState | Infinite float loop | Animate once |
| DashboardStats | Infinite gradient rotation | Static gradient |
| DashboardPage | localStorage in render | useState initializer |
| DashboardPage | No-op stagger variants | Real animations or remove |
| DashboardPage | Duplicate CTAs in empty state | Remove ActionCards grid |
| WhatsNextCard | Low visual hierarchy | Tinted border + label |
| DashboardPage | 1076-line monolith | Extract header component |

All changes are visual parity or improvement -- no features removed, just cleaner UX and fewer wasted CPU cycles.

