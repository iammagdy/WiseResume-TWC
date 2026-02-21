

# Redesign Animated Splash Screen

## The Problem
The current splash has Framer Motion animations but they feel flat and instant:
- Logo springs in too fast (0.6s) with no dramatic build-up
- Glow ring is barely visible (0.3 opacity max)
- Stars drift so subtly they're imperceptible
- Text just fades in -- no wow factor
- Everything happens almost simultaneously, so nothing feels sequenced

## The Solution
A cinematic 3-second sequence with clear visual stages that feel like a premium app launch.

---

## Animation Sequence (timeline)

```text
0.0s  -- Screen appears dark, particles begin floating inward
0.3s  -- Expanding light burst from center (like a star igniting)
0.5s  -- Logo scales up from 0 with a bounce + rotation, glow ring pulses bright
1.0s  -- Logo settles, orbital ring spins around it
1.2s  -- "WiseResume" text types in letter-by-letter with gradient shimmer
1.8s  -- Tagline fades up with a soft slide
2.2s  -- Subtle breathing pulse on the whole composition
3.0s  -- Auto-dismiss (or tap to skip anytime)
```

## Changes

### File: `src/components/AnimatedSplash.tsx` (full rewrite)

**Phase 1 -- Light Burst (0-0.5s)**
- A bright radial gradient expands from the center (scale 0 to 1.5), creating a "star ignition" effect
- Particles (stars) rush inward toward the center instead of just twinkling in place

**Phase 2 -- Logo Entrance (0.3-1.0s)**
- Logo scales from 0.3 to 1.15 (overshoot) then settles to 1.0 with a spring
- Adds a subtle 15-degree rotation during the scale-up for dynamism
- Glow ring pulses from 0 to full brightness (opacity 0.8) then settles to a breathing pulse
- An orbital ring (like in PlanetLogo) rotates continuously around the logo

**Phase 3 -- Text Reveal (1.0-2.0s)**
- "WiseResume" letters animate in one by one (staggered 0.04s per letter) with slight y-offset
- Each letter has the gradient shimmer effect (background-position animation)
- Tagline slides up from 20px below with a fade

**Phase 4 -- Ambient Loop (2.0-3.0s)**
- Gentle breathing scale pulse on the logo (1.0 to 1.03 and back)
- Stars continue twinkling
- Glow ring continues breathing

### Visual Enhancements
- Brighter glow ring (peak opacity 0.8 instead of 0.4)
- More visible nebula overlays (opacity 0.15 instead of 0.08)
- Add 3 concentric ripple rings that expand outward from center at staggered times
- Particle count stays at 30 but with more visible sizes (1-3px instead of 0.5-2px)

### Reduced Motion
- All animations collapse to simple fade-in (no motion, no stagger)
- Respects `prefers-reduced-motion: reduce`

---

## Technical Details

### No new files or dependencies
Everything uses the existing `framer-motion` library and `AppIcon` component.

### Key animation techniques used
- `motion.div` with keyframe arrays for multi-step animations (e.g., `scale: [0.3, 1.15, 1.0]`)
- `staggerChildren` on the text container for letter-by-letter reveal
- CSS `@keyframes` for the continuous orbital ring rotation (avoids JS overhead)
- `useMotionValue` + `useTransform` not needed -- simple declarative animations suffice

### File changes summary

| File | Change |
|---|---|
| `src/components/AnimatedSplash.tsx` | Rewrite animation sequence with cinematic phases: light burst, bouncy logo entrance with rotation, letter-by-letter text reveal, breathing ambient loop, brighter glow effects, ripple rings |

