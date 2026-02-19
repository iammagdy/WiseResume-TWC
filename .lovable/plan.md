

# Add Glow Trail Effect to Shooting Stars

## What Changes

Each shooting star will gain a soft, glowing trail behind it -- a wider, blurred gradient element that follows the same animation path, creating a realistic comet-like streak with atmospheric depth.

## What You'll See

Instead of a thin 1px white line, each shooting star will appear as a bright head with a soft, diffused glow trail fading behind it. The effect is subtle and atmospheric, not overpowering.

## Technical Details

### File: `src/components/landing/SpaceBackground.tsx`

**1. Enhance each shooting star element (lines 131-146)**

Replace the single `div` per shooting star with a wrapper containing two elements:
- **Glow trail**: A wider (80px x 3px), blurred element with reduced opacity and a cyan/white gradient, animated with the same `shootingStar` keyframe.
- **Core streak**: The existing 80px x 1px bright white line (unchanged animation).

Both share the same animation timing so they move together as one unit.

```tsx
{shootingStars.map((s) => (
  <div
    key={s.id}
    className="absolute"
    style={{
      top: `${s.top}%`,
      left: `${s.left}%`,
      opacity: 0,
      animation: prefersReducedMotion
        ? 'none'
        : `shootingStar ${s.duration}s ease-in ${s.delay}s infinite`,
    }}
  >
    {/* Glow trail */}
    <div
      className="absolute w-[80px] h-[3px] rounded-full blur-[3px]"
      style={{
        background: 'linear-gradient(to left, rgba(200, 220, 255, 0.6) 0%, transparent 100%)',
      }}
    />
    {/* Core streak */}
    <div
      className="absolute w-[80px] h-[1px] rounded-full"
      style={{
        background: 'linear-gradient(to left, white 0%, transparent 100%)',
      }}
    />
  </div>
))}
```

This moves the animation to the parent wrapper so both children animate together. No keyframe changes needed.

**2. No other changes**
- Star count, parallax layers, and twinkle animation remain untouched.
- Reduced motion handling stays the same (parent wrapper gets `animation: 'none'`).

| File | Change |
|---|---|
| `SpaceBackground.tsx` | Wrap each shooting star in a container with a blurred glow trail element alongside the core streak |

