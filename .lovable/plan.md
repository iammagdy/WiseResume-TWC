

# Redesign Footer and Fix Scroll Lag

## 1. Footer Redesign

The current footer is a flat, centered layout with placeholder text icons ("X", "Li", "Gh") that looks out of place with the polished space theme. The new footer will be a visually rich component matching the landing page aesthetic.

**Changes to `src/components/landing/Footer.tsx`:**

- Replace the Globe icon brand mark with the actual `wise-ai-logo.png` asset for brand consistency
- Use proper Lucide icons for social links (Twitter/X uses an "X" text styled as icon, LinkedIn and GitHub get their own styled icons)
- Add a gradient divider line at the top instead of plain border
- Add a subtle "Built with AI" tagline with a soft glow accent
- Stack layout vertically on mobile: logo + tagline at top, links in the middle, social icons below, copyright at bottom
- Add a faint radial glow behind the logo for visual depth
- Use glass-style background (`bg-card/40 backdrop-blur-sm`) to match landing page cards
- Update copyright year to 2026

## 2. Fix Scroll Lag

The lag comes from the SpaceBackground component rendering 60 individually animated star elements plus 3 parallax motion layers with `useScroll`/`useTransform`. Combined with `backdrop-blur` on multiple cards throughout the page, this overwhelms mobile GPUs.

**Changes to `src/components/landing/SpaceBackground.tsx`:**

- Reduce star count from 60 to 30 (still looks full but halves DOM nodes and animations)
- Reduce shooting stars from 3 to 2
- Add `will-change: transform` to all parallax motion layers so the browser promotes them to GPU-composited layers upfront (avoids expensive repaints)
- Add `contain: layout style paint` CSS to the star container to limit browser repaint scope

**Changes to `src/pages/Index.tsx`:**

- Remove `backdrop-blur-sm` from comparison strip cards and feature cards (these are the most numerous blurred elements and contribute heavily to lag on mobile)
- Keep backdrop-blur only on the sticky header and the two "See It in Action" cards where the glass effect is most impactful

## Technical Details

### Files Modified

| File | Changes |
|---|---|
| `src/components/landing/Footer.tsx` | Full redesign with logo import, gradient divider, proper social icons, vertical mobile stack, glow accent |
| `src/components/landing/SpaceBackground.tsx` | Stars 60 to 30, shooting stars 3 to 2, add `will-change: transform` on parallax layers |
| `src/pages/Index.tsx` | Remove `backdrop-blur-sm` from comparison and feature cards to reduce composite layer count |

