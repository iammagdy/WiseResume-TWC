

## Dashboard Polish: Daily Tip, Profile Avatar, and Transitions

### Overview

Three areas of improvement: (1) enhance the daily tip banner with better touch targets, swipe-to-dismiss, and localStorage persistence, (2) make the profile avatar more interactive with a dropdown menu, incomplete-profile badge, and first-visit pulse, (3) add smooth transitions for tab navigation and editor section switching.

---

### 1. Daily Tip Banner Enhancements

**File: `src/components/dashboard/DailyTipCard.tsx`**

Current issues:
- Close button is only ~24px (p-1 + 14px icon) -- needs 44px touch target
- Uses `sessionStorage` (resets on refresh) -- switch to `localStorage`
- No swipe gesture -- add drag-to-dismiss via framer-motion
- Already has collapse/expand behavior -- keep and improve animations

Changes:
- Increase close button to `w-11 h-11` (44px) with centered icon, keep icon at 16px (`w-4 h-4`)
- Replace `sessionStorage` with `localStorage` key `wr-tip-dismissed`
- Add `drag="x"` on the banner with `dragConstraints={{ left: 0, right: 0 }}` and `onDragEnd` handler: if drag velocity or offset exceeds threshold (e.g., deltaX > 80 or velocity > 300), trigger dismiss
- Improve enter animation to fade+slide from top: `initial={{ opacity: 0, y: -20 }}`, `animate={{ opacity: 1, y: 0 }}`
- Improve exit animation: `exit={{ opacity: 0, x: 200 }}` for swipe-dismiss, `exit={{ opacity: 0, height: 0 }}` for button-dismiss
- Keep the collapsed "Tip" button with lightbulb icon as-is (already implemented)

---

### 2. Profile Avatar with Dropdown Menu, Badge, and Pulse

**File: `src/pages/DashboardPage.tsx`**

Current: Avatar navigates directly to `/settings` on tap. No dropdown, no badge, no first-visit indicator.

Changes:
- Replace the direct `navigate('/settings')` with a `DropdownMenu` from the existing Radix dropdown component
- Menu items: "My Profile" (navigates to `/settings`), "Account Settings" (navigates to `/settings`), separator, "Sign Out" (calls auth signOut) -- for guests, show "Sign In" instead of "Sign Out"
- Add `whileTap={{ scale: 0.9 }}` animation (already present -- keep)
- Add a first-visit pulsing ring: check `localStorage` for `wr-profile-pulse-seen`. If not seen, render a pulsing ring animation around the avatar (CSS `animate-pulse` ring with `border-primary/40`). On first dropdown open, mark as seen
- Add incomplete profile badge: use `calculateProfileCompletion(profile)` (already imported via `useProfile`). If completion < 50%, show a small red dot (8px) at top-right of avatar using absolute positioning
- Import `calculateProfileCompletion` from `useProfile` hook

---

### 3. Tab Navigation Fade Transitions

**File: `src/components/layout/AppShell.tsx`**

Current: No transition animation between routes. Uses raw `{currentOutlet}`.

Changes:
- Wrap the outlet in `AnimatePresence` with `mode="popLayout"` (avoids the "wait" deadlock issue noted in memory)
- Add a `motion.div` wrapper with `key={location.pathname}` for route-based transitions
- Animation: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`, `transition={{ duration: 0.2 }}`
- Use `initial={false}` on `AnimatePresence` to skip entrance animation on first load (per memory: transition-optimization)
- Keep it simple -- fade only, no slide (slides conflict with bottom tab navigation mental model)

---

### Technical Details

**Swipe-to-dismiss implementation:**
Using framer-motion's `drag` prop with `onDragEnd`:
```typescript
onDragEnd={(_, info) => {
  if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 300) {
    handleDismiss();
  }
}}
```

**Profile completion badge:**
Reuses the existing `calculateProfileCompletion()` function. The red dot only appears when authenticated (guests have no profile to complete).

**First-visit pulse:**
A simple CSS ring animation that runs 3-4 times then stops, using `animate-[ping_1.5s_ease-out_4]` or a framer-motion loop with `repeat: 4`.

**Tab transition considerations:**
- `initial={false}` prevents the white flash on first load
- `mode="popLayout"` avoids the deadlock issue with `mode="wait"` noted in editor stability memory
- 200ms duration matches the bottom tab bar's own `duration-200` transitions

### Files Modified

- `src/components/dashboard/DailyTipCard.tsx` -- 44px close button, swipe gesture, localStorage, improved animations
- `src/pages/DashboardPage.tsx` -- profile avatar dropdown menu, completion badge, first-visit pulse
- `src/components/layout/AppShell.tsx` -- fade transitions between tab routes

