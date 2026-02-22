

# Make the Loading Spinner Visually Striking

## Problem
The current "futuristic" spinner looks like a small boring circle because:
- Orbital ring borders are only 1px -- nearly invisible on dark backgrounds
- Tilted rings using CSS `rotateX`/`rotateY` collapse into thin lines or ellipses in 2D rendering
- Particles are tiny (1.5x1.5 = 6px) and semi-transparent
- Outer glow at 5% opacity is invisible
- Container at w-28 (112px) is undersized for a full-page spinner
- The AppIcon logo blends into the background without enough contrast

## Solution
Rewrite the spinner to be unmistakably futuristic and branded with bolder, more visible effects.

## Changes to `src/components/ui/PageLoadingSpinner.tsx`

### Make the spinner container larger
- Change from `w-28 h-28` (112px) to `w-36 h-36` (144px) for more visual presence

### Make orbital rings bolder and more visible
- Use `border-2` instead of `border` (2px instead of 1px) for all three rings
- Remove the `rotateX`/`rotateY` transforms (they collapse rings to near-invisible lines in 2D)
- Instead, use different inset values and rotation speeds to create a multi-ring effect
- Use higher opacity values for the ring colors (e.g., `primary/50` instead of `primary/20`)

### Make the AppIcon logo pop
- Increase logo size from 32px to 40px
- Add a circular glowing backdrop behind the icon (a semi-transparent primary circle)
- Enhance the drop-shadow glow intensity

### Make particles bigger and brighter
- Increase particle size from `w-1.5 h-1.5` (6px) to `w-2 h-2` (8px)
- Increase particle opacity from 60% to 80%
- Increase orbital radius from 52 to 62 to match larger container

### Make outer glow more visible
- Increase glow from `bg-primary/5` to `bg-primary/10`
- Increase opacity range from `[0.3, 0.6, 0.3]` to `[0.4, 0.8, 0.4]`

### Reduced-motion fallback
- Keep the static AppIcon at 20px in a circle -- this is fine as-is since it's a simple fallback

## Technical Details

The full component rewrite:

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { AppIcon } from '@/components/brand/AppIcon';

const particles = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angle: (360 / 8) * i,
  delay: i * 0.25,
  radius: 62,
}));

export function PageLoadingSpinner() {
  const prefersReduced = useReducedMotion();

  // Reduced-motion fallback stays the same (static logo + "Loading...")
  if (prefersReduced) { /* unchanged */ }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
      <motion.div ...>
        {/* Spinner container — now w-36 h-36 */}
        <div className="relative w-36 h-36 flex items-center justify-center">

          {/* Outer glow — stronger opacity */}
          <motion.div className="absolute inset-0 rounded-full bg-primary/10" ... />

          {/* Ring 1 — outer, 2px border, higher opacity */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-primary/15"
            style={{ borderTopColor: 'hsl(var(--primary))' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Ring 2 — middle, counter-rotate */}
          <motion.div
            className="absolute inset-5 rounded-full border-2 border-primary/10"
            style={{ borderTopColor: 'hsl(var(--primary) / 0.7)', borderLeftColor: 'hsl(var(--primary) / 0.4)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Ring 3 — inner, same direction as ring 1 */}
          <motion.div
            className="absolute inset-8 rounded-full border-2 border-primary/10"
            style={{ borderBottomColor: 'hsl(var(--primary) / 0.6)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Logo with glowing backdrop */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute w-14 h-14 rounded-full bg-primary/10" />
            <div style={{ filter: 'drop-shadow(0 0 24px hsl(var(--primary) / 0.6))' }}>
              <AppIcon size={40} />
            </div>
          </motion.div>

          {/* Particles — 8 particles, bigger, brighter */}
          {particles.map(p => (
            <motion.div className="absolute w-2 h-2 rounded-full bg-primary/80" ... />
          ))}
        </div>

        {/* Shimmer text — unchanged */}
      </motion.div>
    </div>
  );
}
```

## Result
- Orbital rings are clearly visible (2px borders, no collapsed 3D transforms)
- Logo is prominently centered with a glowing backdrop
- Particles are larger and brighter
- Overall spinner is bigger (144px vs 112px)
- The spinner is unmistakably different from a default loading circle
