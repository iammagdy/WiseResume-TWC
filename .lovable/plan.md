
# Improve Developer Credit Card Visual Design

## Overview
Refine the DeveloperCreditCard component to match the dark, focused magdysaber.com style while preserving all existing functionality, animations, and the ElectricBorder wrapper.

## Changes

### 1. Update `src/components/settings/DeveloperCreditCard.tsx` -- Layout restructure

Reorganize the card content into a two-section flex column layout:

- **Top section**: Avatar (left) + name/title/buttons (right) in a horizontal flex row
- **Bottom section**: Website link, left-aligned, visually separated with a subtle top border

Key changes to JSX structure:
- Wrap everything inside `dev-card-content` in a `flex flex-col` container
- Move the website link out of `.dev-info` into its own bottom row after the top section
- Replace the old avatar glow/orbit with a cleaner gradient-ring avatar (gradient border ring from pink to orange with outer box-shadow glow)
- Keep all motion variants, handlers, and ElectricBorder wrapper untouched

### 2. Update `src/components/settings/DeveloperCreditCard.css` -- Styling refinements

**Avatar area**:
- Replace `.dev-avatar-glow` multi-color blur with a tighter, warmer gradient ring (`from-pink-500 via-red-500 to-orange-400` equivalent)
- Add a warm outer glow via `box-shadow: 0 0 24px rgba(248,113,113,0.45)`
- Reduce avatar size slightly to `w-16 h-16` (64px) on mobile, scaling up on larger screens
- Remove the orbit ring and orbit dot elements (and their CSS) to declutter the avatar area

**Buttons**:
- Restyle Contact button: `bg-red-500/20` background, `text-red-300` color, `border-red-500/40` border -- warmer tone to match the example
- Restyle GitHub button: `bg-zinc-900/60` background, `text-zinc-100` color, `border-zinc-700` border -- neutral dark pill
- Remove the `::before` shine animation and `dev-btn-glow` animation from buttons for a cleaner look
- Keep `active:scale-[0.98]` for haptic feel, keep `min-height: 44px` for touch targets
- Increase gap between buttons from `0.5rem` to `0.75rem`

**Name/Title**:
- Keep the shimmer gradient on the name but make it slightly warmer (add pink/red tones)
- Keep `dev-title` style as-is

**Website link (bottom)**:
- Move from inline under buttons to a separate bottom row
- Add a subtle top border separator (`border-t border-white/5 pt-3 mt-1`)
- Style: `text-xs text-zinc-400`, with `ExternalLink` icon at `w-3 h-3`
- Apply `truncate` to the hostname text to prevent overflow on narrow screens

**Card background**:
- Darken the glass card background slightly for better contrast: use `rgba(0,0,0,0.6)` base instead of `hsl(var(--background) / 0.8)`

### 3. What stays the same
- ElectricBorder wrapper with `color="#7C3AED"`, `borderRadius={20}`
- Sparkle elements outside the border
- Holographic sweep animation inside the card
- Floating particles animation
- 3D tilt animation on `.dev-card`
- All event handlers (haptics, openExternal, onContactClick)
- Component props interface (`DeveloperCreditCardProps`)
- Framer Motion entry/stagger animations

### 4. What gets removed
- `.dev-orbit-ring`, `.dev-orbit-dot`, and related `@keyframes dev-orbit` CSS (cleaner avatar)
- `.dev-avatar-glow` replaced with a tighter gradient ring approach
- `dev-btn-glow`, `dev-btn-shine`, `dev-icon-bounce` keyframe animations (cleaner buttons)
- The `::before` pseudo-element on `.dev-contact-btn`

### 5. Files modified
- `src/components/settings/DeveloperCreditCard.tsx` -- JSX restructure (layout, avatar, button classes, website link position)
- `src/components/settings/DeveloperCreditCard.css` -- Remove orbit/glow animations, update button styles, darken card, add bottom link separator
