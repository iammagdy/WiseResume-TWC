
# Add Smooth Expand/Collapse Animations to CollapsibleCard

## What Changes

The `CollapsibleCard` in `src/components/portfolio/editor/shared.tsx` currently uses a simple conditional render (`{isOpen && ...}`) with no animation. We'll replace this with Framer Motion's `AnimatePresence` + `motion.div` for a smooth height + opacity transition, plus animate the chevron rotation.

## Technical Details

### File: `src/components/portfolio/editor/shared.tsx`

1. **Import** `motion, AnimatePresence` from `framer-motion`
2. **Replace** the conditional `{isOpen && <div>...}` with:
   - `AnimatePresence` wrapper with `initial={false}`
   - `motion.div` with animated height (0 to "auto"), opacity (0 to 1), and overflow hidden
   - Exit animation reverses the same properties
3. **Animate the chevron** using `motion.div` with `animate={{ rotate: isOpen ? 180 : 0 }}` instead of the CSS class toggle
4. **Respect reduced motion** via `useReducedMotion()` -- skip animations when the user prefers reduced motion

### Animation Specs
- **Duration**: 0.25s with `easeInOut` easing
- **Height**: animates from 0 to `"auto"` (Framer Motion supports this natively)
- **Opacity**: 0 to 1, slightly staggered (starts at 0.3s into the height animation)
- **Exit**: reverse of enter
- **Chevron**: smooth 180-degree rotation with spring physics

### No other files change
Since all 6 components (ProfileSection, AppearanceSection, ContentVisibilitySection, and the 3 remaining inline sections) use `CollapsibleCard` from shared.tsx, they all get the animation automatically.
