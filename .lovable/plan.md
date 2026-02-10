

# Dynamic HeroSection with Animated Gradient Background

## What Changes

The HeroSection will get a vibrant, animated gradient mesh background that pulses and shifts colors behind the hero content, plus floating particle orbs that drift gently across the section. This creates a more dynamic, premium feel while staying performant (CSS-only, no JS animation loops).

## Visual Enhancements

### 1. Animated Gradient Mesh Background
- Add a multi-stop radial gradient mesh behind the hero content that slowly shifts position and opacity
- Uses 3 overlapping radial gradients (purple, cyan, pink) that animate independently with different timing
- Creates a living, breathing nebula effect that complements the existing space theme

### 2. Floating Particle Orbs
- Add 5-6 small glowing orbs (CSS-only) that float gently across the hero area
- Each orb has a different size (4px-12px), color (primary/secondary/accent), blur amount, and animation timing
- Uses the existing `float-slow` keyframe with varied delays and durations

### 3. Animated Ring Behind PlanetLogo
- Add a pulsing concentric ring effect behind the planet logo
- Two rings with different sizes and animation delays for depth

### 4. Enhanced CTA Glass Card
- Add a subtle rotating gradient border effect to the CTA container using the existing `.rotating-border` class
- Add a soft glow pulse to the primary "Create New Resume" button

## Technical Details

### File: `src/components/landing/HeroSection.tsx`
- Add 3 animated gradient blobs as absolutely positioned divs behind the content
- Add 6 floating particle orbs with varied CSS animation properties
- Add pulsing ring elements around the PlanetLogo wrapper
- Apply `rotating-border` class to the CTA glass card for an animated border

### File: `src/index.css`
- Add `@keyframes gradient-blob` -- a slow position/scale animation for the gradient mesh blobs (20s+ duration)
- Add `@keyframes float-particle` -- gentle random-path float for orbs (10-15s duration)
- Add `@keyframes ring-pulse` -- concentric ring expand + fade animation
- Add corresponding utility classes: `.animate-gradient-blob`, `.animate-float-particle`, `.animate-ring-pulse`

### Performance Notes
- All animations are CSS-only using `transform` and `opacity` (GPU-accelerated)
- Respects `prefers-reduced-motion` via the existing media query that disables all animations
- No JavaScript animation loops -- zero main-thread cost
- Blobs use `will-change: transform` for smooth compositing

### No new files needed. No backend changes.
