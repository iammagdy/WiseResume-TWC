
# Increase Star Count and Add Shooting Stars to SpaceBackground

## What Changes

1. Increase the twinkling star count from 25 to 60 for a denser starfield.
2. Add 3 shooting stars that streak diagonally across the background at staggered intervals using CSS keyframe animations.

## What You'll See

- A richer, more populated starfield with 60 twinkling dots instead of 25.
- Occasional shooting stars that streak from the upper-right area toward the lower-left, each on a long staggered loop so they feel random and organic.

## Technical Details

### File: `src/components/landing/SpaceBackground.tsx`

**1. Increase star count (line 25)**

Change `generateStars(25)` to `generateStars(60)`.

**2. Add a shooting star data generator**

Create a small helper that pre-generates 3 shooting stars with varied start positions, animation delays, and durations:

```tsx
interface ShootingStar {
  id: number;
  top: number;      // % from top (5-35%)
  left: number;     // % from left (60-95%)
  delay: number;    // stagger in seconds
  duration: number; // 1-2s streak duration
}

function generateShootingStars(count: number): ShootingStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: 5 + Math.random() * 30,
    left: 60 + Math.random() * 35,
    delay: i * 6 + Math.random() * 4,
    duration: 1 + Math.random() * 1,
  }));
}
```

**3. Memoize the shooting stars alongside the regular stars**

Add `const shootingStars = useMemo(() => generateShootingStars(3), []);` inside the component.

**4. Add a shooting stars layer (after the twinkling stars layer)**

```tsx
{/* Layer 4: Shooting stars */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  {shootingStars.map((s) => (
    <div
      key={s.id}
      className="absolute w-[80px] h-[1px] rounded-full"
      style={{
        top: `${s.top}%`,
        left: `${s.left}%`,
        background: 'linear-gradient(to left, white 0%, transparent 100%)',
        opacity: 0,
        animation: prefersReducedMotion
          ? 'none'
          : `shootingStar ${s.duration}s ease-in ${s.delay}s infinite`,
      }}
    />
  ))}
</div>
```

**5. Add the shooting star CSS keyframe to the existing style tag**

```css
@keyframes shootingStar {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(-35deg);
  }
  5% {
    opacity: 1;
  }
  20% {
    opacity: 0;
    transform: translate(-200px, 120px) rotate(-35deg);
  }
  100% {
    opacity: 0;
    transform: translate(-200px, 120px) rotate(-35deg);
  }
}
```

The 0-20% active window with a long 20-100% idle tail means each shooting star streaks briefly then waits before repeating, creating a natural sporadic feel.

**6. Reduced motion**

Shooting stars get `animation: 'none'` when `prefersReducedMotion` is true, same as the twinkling stars.

### No changes to:
- Parallax layers, nebula gradients, or floating orbs
- Any other files

| File | Change |
|---|---|
| `SpaceBackground.tsx` | Increase star count to 60, add shooting star generator + layer + CSS keyframe |
