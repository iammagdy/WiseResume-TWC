

# Scroll-Driven Fade In/Out Animations for Landing Page

## What Changes

Currently, all landing page sections use `viewport: { once: true }` which means they animate in once and stay visible forever. You want sections to fade in when scrolling down and fade out when scrolling back up, creating a more dynamic, immersive experience.

## Approach

1. **Update the `inView` helper** to use `once: false` so animations reverse when sections leave the viewport
2. **Add unique animation variants per section** instead of the same fade-up for everything -- each major section gets a distinct entrance style:
   - **Hero**: stays as-is (always visible at top)
   - **Comparison Strip**: slides in from the left with a slight rotation
   - **See It in Action cards**: scale up from center with a blur-to-clear effect
   - **Why WiseResume features**: staggered cascade from bottom with increasing delay
   - **Bonus chips**: pop in with a spring bounce
   - **Footer**: gentle fade up

3. **Use `whileInView` + `initial`** on all `motion.div` wrappers with `viewport: { once: false, amount: 0.2 }` so they re-trigger both ways

## Technical Details

### File: `src/pages/Index.tsx`

**1. Update `inView` helper (lines 223-231)**

Change `once: true` to `once: false` and reduce the margin:

```tsx
const inView = (delay: number) =>
  prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: false, amount: 0.2 },
        transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
      };
```

**2. Add unique section animation factories (after `inView`)**

```tsx
// Slide from left with slight rotate
const slideIn = (delay: number) =>
  prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -30, rotate: -1 },
        whileInView: { opacity: 1, x: 0, rotate: 0 },
        viewport: { once: false, amount: 0.2 },
        transition: { delay, duration: 0.5, ease: 'easeOut' as Easing },
      };

// Scale up with blur clear
const scaleIn = (delay: number) =>
  prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
        whileInView: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        viewport: { once: false, amount: 0.2 },
        transition: { delay, duration: 0.6, ease: 'easeOut' as Easing },
      };

// Spring pop
const popIn = (delay: number) =>
  prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.8, y: 10 },
        whileInView: { opacity: 1, scale: 1, y: 0 },
        viewport: { once: false, amount: 0.3 },
        transition: { delay, type: 'spring', stiffness: 300, damping: 20 },
      };
```

**3. Apply unique animations to each section**

| Section | Current | New Animation |
|---|---|---|
| Comparison Strip (line 385) | `inView(0)` | `inView(0)` (same fade, now reversible) |
| Each comparison row (line 393) | `inView(0.05 * i)` | `slideIn(0.06 * i)` -- slides from left |
| "See It in Action" heading (line 415) | `inView(0)` | `inView(0)` |
| Editor Demo card (line 427) | `inView(0.05)` | `scaleIn(0.05)` -- scales up with blur |
| Portfolio Demo card (line 452) | `inView(0.1)` | `scaleIn(0.15)` -- scales up with blur |
| "Why WiseResume" heading (line 480) | `inView(0)` | `inView(0)` |
| Feature cards (line 492) | `inView(0.08 * i)` | `inView(0.1 * i)` -- staggered fade, now reversible |
| Bonus chips (line 505) | `inView(0.3)` | `popIn(0.1)` -- spring bounce |

### No changes to:
- Hero section (stays as initial fade-in, always visible)
- SpaceBackground or any background effects
- Footer component
- Any functionality, navigation, or auth logic
- Any other pages or components

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Update `inView` to `once: false`, add `slideIn`/`scaleIn`/`popIn` helpers, apply unique animations per section |

