

## Revamp Daily Tip Banner: Auto-Hide + Pulsing Create Button

### What Changes

1. **Move the DailyTipCard** from its current position (between QuickActionChips and Search) to **directly below the header**, before DashboardStats
2. **Auto-hide after 3 seconds** with a smooth exit animation, leaving a small "tap to show tip" indicator dot
3. **Pulsing border on FloatingCreateButton** while the banner is visible, drawing attention to the CTA
4. **Convert DailyTipCard to accept props** so the parent (DashboardPage) can coordinate the banner visibility state with the FloatingCreateButton's pulse

### Technical Details

**File: `src/components/dashboard/DailyTipCard.tsx`**

- Add an `onVisibilityChange?: (visible: boolean) => void` prop
- Replace manual `dismissed` state with an auto-hide timer:
  - `useState(true)` for `visible`, starts shown
  - `useEffect` sets a 3-second `setTimeout` to set `visible = false` and call `onVisibilityChange(false)`
  - Still allow manual dismiss via the X button
- After auto-hide, render a small collapsed indicator: a tiny pill with a Lightbulb icon that expands the tip again on tap
- Use `AnimatePresence` with `exit` animation for smooth collapse
- Track session dismissal in `sessionStorage('wr-tip-dismissed')` so it doesn't reappear after manual dismiss

**File: `src/components/dashboard/FloatingCreateButton.tsx`**

- Add `pulse?: boolean` prop (default `false`)
- When `pulse` is true, render an animated ring behind the button using `motion.span` with `animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}` and `border-2 border-primary/50`
- The ring pulses only while the banner is visible (3 seconds), then stops

**File: `src/pages/DashboardPage.tsx`**

- Add `tipVisible` state, defaulting to `true`
- Move `<DailyTipCard />` from line 362 to line 348 (right after `</header>`)
- Pass `onVisibilityChange={(v) => setTipVisible(v)}` to DailyTipCard
- Pass `pulse={tipVisible}` to `<FloatingCreateButton />`

### Visual Behavior

```text
[Header: WiseResume logo + buttons]
[Daily Tip banner - slides in, auto-hides after 3s]  <-- NEW position
   After hide: tiny Lightbulb dot indicator (tap to expand)
[DashboardStats hero card]
[QuickActionChips]
[Search pill]
[Resume list]
                              [+ New Resume] <-- pulsing border while tip visible
```

### No Database or Backend Changes
This is purely a frontend UI/animation change across 3 files.
