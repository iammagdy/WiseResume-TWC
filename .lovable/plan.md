

# Smooth Theme Toggle with Morph Animation

## What Changes

Redesign the `ThemeToggle` component with an animated sun/moon icon morph and a smooth full-page color transition when switching themes.

---

## 1. Animated Icon Morph

Replace the static Sun/Moon/Monitor icons with an animated SVG that morphs between states:
- **Sun to Moon**: Sun rays retract and fade while a crescent shadow slides in
- **Moon to Sun**: Crescent slides out, rays extend with a staggered spring animation
- Uses `framer-motion` `AnimatePresence` + `motion.svg` for the morph

## 2. Sliding Pill Indicator

The existing `layoutId="theme-indicator"` border overlay will be replaced with a filled gradient pill background that slides between the three options using `layoutId` -- matching the premium tab bar style already in the app.

## 3. Full-Page Color Transition

Add a CSS transition on the `:root` / `.dark` / `.light` CSS custom properties so the entire page smoothly cross-fades between color palettes instead of snapping instantly:
- Add `transition: background-color 0.4s ease, color 0.3s ease` to `body` and key elements
- A brief circular ripple overlay expands from the toggle button's position outward (using a `clip-path: circle()` animation) for a "paint splash" effect

## 4. Toggle Button Glow

The active theme button gets a subtle glow matching its meaning:
- Light: warm amber glow
- Dark: cool purple glow  
- System: neutral blue glow

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/settings/ThemeToggle.tsx` | Complete rewrite with animated icon morph, sliding pill, ripple trigger |
| `src/index.css` | Add `transition` rules to `body`, `.dark`, `.light` for smooth color crossfade; add `@keyframes theme-ripple` for the circular clip-path expansion |

### No New Files or Dependencies

Everything uses existing `framer-motion` and CSS animations.

### Implementation Approach

**ThemeToggle.tsx**:
- Animated sun/moon icon component using `motion.circle`, `motion.line` for rays
- Sun state: circle + 8 rotating rays; Moon state: circle with crescent mask sliding in
- `AnimatePresence` with `mode="wait"` for clean icon swap
- `motion.div` with `layoutId="theme-pill"` as the sliding background pill
- On click: trigger haptic, update theme, and spawn a full-screen `motion.div` overlay that animates `clipPath` from `circle(0%)` to `circle(150%)` with the theme's target background color, then removes itself

**index.css**:
- Add smooth `transition` on CSS custom property consumers: `body { transition: background-color 0.4s ease; }` and similar for `card`, `popover` backgrounds
- The ripple overlay handles the visual "morph" while CSS transitions handle the underlying property changes

