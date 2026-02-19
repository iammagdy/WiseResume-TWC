
# Add Subtle Parallax to Hero Section Content

## What Changes
Add scroll-based parallax to the hero section's content elements so that as the user scrolls down, the planet logo, title, tagline, and CTA button move at slightly different speeds -- creating a layered depth effect that complements the existing space background parallax.

## How It Works
- The planet logo (farthest "back") scrolls slightly slower than the page
- The title and tagline scroll at a medium rate
- The CTA button and trust text (closest to viewer) scroll at normal speed
- All parallax is disabled when the user prefers reduced motion

The effect is subtle (10-30px range) so it adds depth without causing lag or motion sickness.

## Technical Details

### File: `src/components/landing/HeroSection.tsx`

1. Import `useRef` from React and `motion, useScroll, useTransform, useReducedMotion` from Framer Motion
2. Add a `ref` on the `<section>` element and set up `useScroll` targeting it
3. Create three `useTransform` values for different scroll speeds:
   - `yLogo`: maps scroll 0-1 to 0 to -30px (slowest, feels farthest back)
   - `yText`: maps scroll 0-1 to 0 to -15px (medium)
   - `yButton`: maps scroll 0-1 to 0 to -5px (barely moves, feels closest)
4. Also add a subtle `opacity` transform so the hero fades out slightly as user scrolls past (1 to 0.85)
5. Wrap the planet logo div in `motion.div` with `style={{ y: yLogo }}`
6. Wrap the title + tagline in `motion.div` with `style={{ y: yText }}`
7. CTA + trust text get `motion.div` with `style={{ y: yButton }}`
8. All transforms fall back to `0` when `prefersReducedMotion` is true
9. Add a subtle scale transform on the overall content container: scales from 1 to 0.98 as user scrolls, adding to the depth illusion
