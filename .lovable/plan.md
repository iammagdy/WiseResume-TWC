

# Add Star Twinkle Animation to SpaceBackground

## What Changes

The component already generates 25 stars with positions, sizes, opacity, and delay values -- but never renders them. We'll add a star layer that displays these as tiny glowing dots with a CSS `twinkle` keyframe animation, creating a subtle shimmer effect across the space background.

## What You'll See

Small dots scattered across the dark background that gently pulse in and out (opacity + slight scale change) at staggered intervals, giving a realistic starfield feel.

## Technical Details

### File: `src/components/landing/SpaceBackground.tsx`

**1. Add a star field layer between the floating orbs and the content (after line 90)**

Insert a new `<div>` layer that maps over the pre-generated `stars` array and renders each as a small, absolutely-positioned circle with the CSS `twinkle` animation applied:

```tsx
{/* Layer 3: Twinkling stars */}
<div className="absolute inset-0 pointer-events-none" aria-hidden="true">
  {stars.map((star) => (
    <div
      key={star.id}
      className="absolute rounded-full bg-white/80"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        opacity: star.opacity,
        animation: prefersReducedMotion
          ? 'none'
          : `twinkle ${3 + star.delay}s ease-in-out ${star.delay}s infinite`,
      }}
    />
  ))}
</div>
```

**2. Add CSS keyframes via an inline `<style>` tag (before closing `</div>`)**

```tsx
<style>{`
  @keyframes twinkle {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.4); }
  }
`}</style>
```

This matches the pattern already used in `HomeBackground.tsx`.

**3. No other changes**
- Parallax layers remain untouched
- Star generation logic already exists and is reused as-is
- Reduced motion users see static dots (no animation)

| File | Change |
|---|---|
| `SpaceBackground.tsx` | Render star elements with CSS twinkle keyframe animation, add inline style tag |

