

# Parallax Scroll Effect for Hero Section Background

## What Changes

The hero section background will gain a multi-layered parallax depth effect: as you scroll down, different background layers (gradients, nebula glows) move at different speeds, creating an illusion of depth -- closer layers scroll faster, distant layers scroll slower.

## Approach

Use framer-motion's `useScroll` and `useTransform` hooks to track the page scroll position and apply different `translateY` offsets to each background layer in `SpaceBackground`. The content stays at normal scroll speed while background layers drift at slower rates.

## What You'll See

- The deep space gradient barely moves (farthest layer)
- The nebula glow drifts slightly as you scroll (mid layer)
- A new set of subtle floating orbs move at a faster parallax rate (near layer)
- The hero content scrolls normally, creating a sense of depth between foreground and background

## Technical Details

### File: `src/components/landing/SpaceBackground.tsx`

**1. Add framer-motion imports and scroll tracking**

Import `motion`, `useScroll`, and `useTransform` from framer-motion. Set up scroll progress tracking on the outer container using `useRef`.

**2. Create parallax transform values**

Map `scrollYProgress` (0 to 1) to different Y offsets for each layer:
- Deep space gradient: `useTransform(scrollYProgress, [0, 1], ['0%', '-5%'])` -- barely moves
- Nebula overlay: `useTransform(scrollYProgress, [0, 1], ['0%', '-15%'])` -- drifts moderately  
- New floating orbs layer: `useTransform(scrollYProgress, [0, 1], ['0%', '-25%'])` -- moves more noticeably

**3. Add a new "floating orbs" layer**

Add 3-4 large, soft radial gradient circles (using `motion.div`) positioned at different spots. These use the fastest parallax rate and add visual richness. They will be subtle (low opacity, large blur) so they feel atmospheric, not distracting.

**4. Convert static divs to motion.div**

Replace the existing gradient and nebula `<div>` elements with `<motion.div>` and apply the corresponding `style={{ y: parallaxValue }}` to each.

**5. Respect reduced motion**

Use `useReducedMotion()` to skip all parallax transforms when the user prefers reduced motion -- layers stay static in that case.

### No changes to:
- `Index.tsx` or any other page
- Hero section content or animations
- Any other components
- Existing nebula colors or gradients (preserved exactly)

### Stacking order (back to front):

```text
Layer 0: Deep space gradient     -- translateY up to -5%  (barely moves)
Layer 1: Nebula radial gradients -- translateY up to -15% (moderate drift)
Layer 2: Floating orbs (new)     -- translateY up to -25% (noticeable drift)
Layer 3: Content (children)      -- normal scroll (no parallax)
```

| File | Change |
|---|---|
| `SpaceBackground.tsx` | Add framer-motion parallax transforms to background layers, add floating orbs layer |

