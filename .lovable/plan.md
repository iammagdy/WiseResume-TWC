

# Fix "See It in Action" Static Animation Bug

## Root Cause

The badge elements ("AI-Powered" and "Live Website") have a **Framer Motion prop conflict** that breaks their entrance animations and can affect the perceived animation of surrounding content:

1. **`transition` prop override**: The spread `{...(!prefersReducedMotion && { transition: {...} })}` on the badge motion.div completely **replaces** the earlier `transition` prop (which controls the entrance fade/slide). This means the entrance animation loses its duration/delay config.

2. **`animate` vs `whileInView` conflict**: Having both `animate` (for the glow pulse) and `whileInView` (for the entrance) on the same element causes Framer Motion to fight over control. The `animate` prop takes priority as the resting state, which can prevent the `initial` -> `whileInView` entrance from running properly.

## Fix

Separate the entrance animation from the glow animation by nesting them in two elements:
- **Outer `motion.div`**: handles entrance animation (`initial`, `whileInView`, `viewport`, `transition`)
- **Inner `motion.span`**: handles the repeating glow pulse (`animate` with `boxShadow` and `repeat: Infinity`)

This eliminates the prop conflict entirely.

### Card A badge (lines 426-437):
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.4, delay: 0.2 }}
>
  <motion.span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2"
    animate={{ boxShadow: ['0 0 0px hsl(var(--primary)/0)', '0 0 14px hsl(var(--primary)/0.35)', '0 0 0px hsl(var(--primary)/0)'] }}
    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
  >
    <Sparkles className="w-3 h-3" />
    AI-Powered
  </motion.span>
</motion.div>
```

### Card B badge (lines 494-505):
Same pattern with emerald color for the "Live Website" badge.

## Additional Visual Polish

While fixing the bug, also improve the CTA buttons to feel more alive:
- Add a subtle shimmer gradient animation using CSS `@keyframes` on the CTA button backgrounds
- This is lightweight (CSS-only, no JS) and adds visual interest

## Changes

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Index.tsx` | 426-437 | Split badge into outer entrance + inner glow elements |
| `src/pages/Index.tsx` | 494-505 | Same split for second badge |

No new dependencies. No database changes. Single file edit.
