
# Electric Border for Developer Credit Card

## Overview
Replace the current CSS rotating-gradient border on the Developer Credit Card with a canvas-based ElectricBorder component from React Bits. All internal card animations (particles, holo sweep, sparkles, 3D tilt, orbit, avatar glow) remain unchanged.

## Changes

### 1. Create `src/components/ui/ElectricBorder.tsx`
- New component using a canvas element to draw a procedurally animated "electric" border around its children
- Uses ResizeObserver for responsive sizing, requestAnimationFrame for smooth animation
- Canvas has `pointer-events: none` so touch/click events pass through
- Props: `color`, `speed`, `chaos`, `borderRadius`, `className`, `style`, `children`
- Capped `devicePixelRatio` at 2 for mobile performance

### 2. Create `src/components/ui/ElectricBorder.css`
- Styles for the electric border wrapper, canvas positioning, glow layers, and content container
- Uses `oklch()` color function for glow effects derived from the provided color prop
- All overlay layers use `pointer-events: none` to preserve interactivity

### 3. Update `src/components/settings/DeveloperCreditCard.tsx`
- Import `ElectricBorder`
- Wrap the outer `motion.div` (`.dev-card-wrapper`) content inside `<ElectricBorder>` with theme-appropriate color (`hsl(var(--primary))` mapped to a hex value like `#7C3AED`), `borderRadius={20}` to match the card's `1.25rem` radius
- The ElectricBorder wraps around the `.dev-card` element, replacing the old `.dev-card-border` div

### 4. Update `src/components/settings/DeveloperCreditCard.css`
- Remove or hide the `.dev-card-border` styles (the old CSS gradient border), since ElectricBorder now handles the border effect
- Keep all other styles (sparkles, particles, holo sweep, 3D tilt, avatar, buttons) exactly as they are

## What stays the same
- All internal card animations (holographic sweep, floating particles, sparkles, 3D tilt, orbit ring, avatar glow, button shine, name shimmer)
- All interactivity (Contact button, GitHub button, website link, haptic feedback)
- Responsive behavior at 360px breakpoint
- Component props and API

## Technical Details

- The ElectricBorder canvas is positioned absolutely around the card with a configurable `borderOffset` (60px default) so the electric line can extend slightly beyond the card edges
- The noise-based displacement creates the "electric" jagged line effect; `chaos` controls intensity, `speed` controls animation rate
- `overflow: visible` on the wrapper ensures the electric effect is not clipped
- The component cleans up its `requestAnimationFrame` and `ResizeObserver` on unmount
- DPR capped at 2 to avoid excessive canvas sizes on high-density mobile screens
