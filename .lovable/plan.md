
## Adding Smooth Entrance Animations to SectionEmptyState

### Overview
Enhance the `SectionEmptyState` component with polished framer-motion entrance animations. The component currently uses Tailwind's `animate-in` utilities, which will be replaced with framer-motion for more granular control and better choreography.

### Changes to `src/components/editor/SectionEmptyState.tsx`

**1. Import framer-motion**
```typescript
import { motion } from 'framer-motion';
```

**2. Wrap main container with motion.div**
Replace the static `<div>` wrapper with `<motion.div>` featuring:
- **Initial state**: `opacity: 0, y: 20` (starts invisible, 20px lower)
- **Animate state**: `opacity: 1, y: 0` (fades in, slides up)
- **Transition**: `duration: 0.4, ease: [0.25, 0.1, 0.25, 1]` (easeInOutExpo-like curve for smooth deceleration)

**3. Staggered icon animation**
Wrap the icon in a `motion.div` with:
- **Initial**: `scale: 0.8, opacity: 0`
- **Animate**: `scale: 1, opacity: 1`
- **Transition**: `delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200` (spring physics for playful entry)

**4. Title animation**
Wrap the title `<p>` in a `motion.p` with:
- **Initial**: `opacity: 0`
- **Animate**: `opacity: 1`
- **Transition**: `delay: 0.15, duration: 0.3`

**5. Collapsible section animation**
Wrap the `<Collapsible>` in a `motion.div` with:
- **Initial**: `opacity: 0`
- **Animate**: `opacity: 1`
- **Transition**: `delay: 0.2, duration: 0.3`

**6. Action buttons staggered animation**
Wrap the buttons container `<div>` in a `motion.div` with:
- **Initial**: `opacity: 0`
- **Animate**: `opacity: 1`
- **Transition**: `delay: 0.25, duration: 0.3`

### Animation Timeline
- **0ms**: Main container fades in + slides up (0.4s)
- **100ms**: Icon scales in with spring (0.3s)
- **150ms**: Title fades in (0.3s)
- **200ms**: Collapsible section fades in (0.3s)
- **250ms**: Action buttons fade in (0.3s)

This creates a elegant cascade effect that feels responsive and modern, with the icon leading the animation sequence.

### Implementation Notes
- All `motion` components maintain existing className and key props
- The Tailwind `animate-in` utilities are removed from the main div
- No functional changes — purely visual enhancement
- Animation timings align with existing animation utilities in the codebase
- Spring physics on the icon adds a subtle, playful accent to the entrance

