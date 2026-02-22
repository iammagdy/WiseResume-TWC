

# Enhance "See It in Action" Section Animations

## Current State
The "See It in Action" section has two animated phone demos (EditorDemo and PortfolioDemo) inside cards, but several elements are completely static:

- **Section heading and subtitle** use a basic CSS `animate-fade-in-up` that fires on page load (not on scroll into view)
- **Badge pills** ("AI-Powered" and "Live Website") are static
- **Card titles and descriptions** have no entrance animation
- **CTA buttons** ("Try the AI Editor" / "Build Your Portfolio") are static with no hover or entrance effects
- The cards use `scaleIn` which is good, but the inner content all appears at once instead of staggering in

## Planned Changes

All changes are in **`src/pages/Index.tsx`**, lines 395-455.

### 1. Scroll-triggered section header
Replace the CSS `animate-fade-in-up` class on the section with a Framer Motion `useInView`-powered animation so the heading and subtitle animate in only when scrolled into view, with a staggered fade+slide effect.

### 2. Staggered card content
Inside each card, stagger the inner elements so they cascade in after the card scales in:
- Badge pill fades in and slides up (delay 0.1s)
- Title fades in (delay 0.15s)
- Description fades in (delay 0.2s)
- Phone demo appears (delay 0.25s)
- CTA button slides up from below (delay 0.3s)

### 3. Animated CTA buttons
Add a subtle shimmer/glow pulse on the CTA buttons and a hover scale effect using Framer Motion `whileHover` and `whileTap`.

### 4. Badge pulse glow
Add a subtle repeating glow/pulse animation on the "AI-Powered" and "Live Website" badge pills to draw attention, using Framer Motion's `animate` with `repeat: Infinity`.

## Technical Details

- Use `motion.div` wrappers with `initial`, `whileInView`, and `viewport={{ once: true }}` for scroll-triggered animations -- avoids adding new state or refs
- Stagger children using incremental `transition.delay` values
- Add `whileHover={{ scale: 1.05 }}` and `whileTap={{ scale: 0.95 }}` on CTA buttons
- Add a subtle `boxShadow` pulse animation on badges using Framer Motion `animate` with `repeat: Infinity`
- All animations respect `prefersReducedMotion` (already available in the component)
- No new dependencies needed

## Summary

| Element | Before | After |
|---------|--------|-------|
| Section heading | CSS fade on page load | Scroll-triggered fade+slide |
| Subtitle | CSS fade on page load | Scroll-triggered with stagger |
| Card content (badge, title, desc) | All appear at once | Staggered cascade inside card |
| CTA buttons | Static | Shimmer hover + scale tap + entrance slide |
| Badge pills | Static | Subtle glow pulse |

Single file change: `src/pages/Index.tsx` (lines 395-455).

