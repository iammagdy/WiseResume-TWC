

# Add Scroll-Driven Entrance Animation to Developer Credit Card

## What It Does

The developer card will fade in and slide up as you scroll it into view, and reverse (fade out, slide down) when you scroll back up past it. This creates a polished, app-like reveal effect.

## Approach

Use framer-motion's `useInView` or the `whileInView` prop on a `motion.div` wrapper. The card will animate from `opacity: 0, y: 30` to `opacity: 1, y: 0` when it enters the viewport, and reverse when it leaves.

## Technical Details

### File: `src/components/settings/DeveloperCreditCard.tsx`

1. Import `motion` from `framer-motion`
2. Replace the outer `<div className="dev-card-wrapper">` with `<motion.div>` that uses `whileInView` for scroll-triggered animation:

```tsx
<motion.div
  className="dev-card-wrapper"
  initial={{ opacity: 0, y: 30, scale: 0.97 }}
  whileInView={{ opacity: 1, y: 0, scale: 1 }}
  viewport={{ once: false, amount: 0.3 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
```

- `initial` -- starting state (faded, shifted down, slightly smaller)
- `whileInView` -- target state when visible
- `viewport.once: false` -- re-triggers on every scroll in/out (fade out when scrolling up)
- `viewport.amount: 0.3` -- triggers when 30% of the card is visible
- `transition` -- smooth 0.5s ease-out

### No changes to:
- CSS file (all existing animations stay)
- Any functionality (haptics, click handlers, links)
- Component props or internal structure
- Any existing CSS animations (sparkles, particles, orbit, holographic sweep, 3D tilt)

| File | Change |
|---|---|
| `DeveloperCreditCard.tsx` | Import `motion`, wrap outer div as `motion.div` with `whileInView` scroll animation |
