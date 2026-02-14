

## Fix Resume Card Swipe Animation and Confirmation

### Problems Found

1. **Drag is too restricted**: `dragConstraints` is set to `{ left: 0, right: 0 }` with `dragElastic: 0.1`, meaning the card can barely move (only 10% of finger movement). This makes the swipe feel broken and unresponsive.

2. **Card snaps back instantly**: After a swipe action triggers, `x.set(0)` resets the card position with no animation -- it just jumps back.

3. **Duplicate has no confirmation**: Swiping right to duplicate triggers immediately without any confirmation dialog, unlike delete which correctly shows a confirmation.

### Fixes

**File: `src/components/dashboard/ResumeListCard.tsx`**

- Widen `dragConstraints` to allow free horizontal movement (e.g., `left: -150, right: 150`) and increase `dragElastic` to `0.5` so the card actually follows the finger during the swipe.
- Replace `x.set(0)` with `animate(x, 0, { type: "spring", stiffness: 500, damping: 30 })` so the card springs back smoothly when the swipe doesn't exceed the threshold.
- When a swipe action IS triggered (delete or duplicate), animate the card off-screen first before invoking the callback: animate the card to -300 or +300, then call the handler.

**File: `src/pages/DashboardPage.tsx`**

- Add a duplicate confirmation dialog (similar to the existing delete confirmation) so swiping right also asks for confirmation before duplicating.

### Technical Details

- Uses framer-motion's imperative `animate` function from `useAnimate` or the `x` motion value's built-in animate method
- Spring-back animation uses `type: "spring"` for a natural bounce feel
- Swipe-away animation uses `type: "tween"` with a short 200ms duration before triggering the action
- The SWIPE_THRESHOLD remains at 80px for consistent trigger distance
