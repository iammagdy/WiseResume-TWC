

# Make Portfolio Themes Visually Distinct and Animated

## Problem

All 9 portfolio themes look nearly identical because:
- Generic sections (Certifications, Awards, Publications, Volunteering, About) use the same hardcoded card styling regardless of theme
- The hero ambient background is always dark-colored, even for light themes (Classic Clean, Executive, Spotlight, Starter)
- The sticky header always uses a dark background (`rgba(10,10,20,0.85)`)
- The theme's `animation` property (e.g. `terminal-type`, `neon-pulse`, `slide-in`) defined in `portfolioThemes.ts` is never actually used
- No scroll-triggered entrance animations differentiate the themes -- every section uses the same `fadeUp` variant

## Planned Changes

### 1. Theme-Aware Generic Section Cards
**File:** `src/pages/PublicPortfolioPage.tsx`

Create a helper function `getGenericCardClass(style)` that returns the correct theme-specific CSS class for sections that currently use hardcoded inline styles (Certifications, Awards, Publications, Volunteering, About). Each theme's cards will get the proper visual treatment:
- Terminal: `.pf-terminal-card` with dots
- Neon: `.pf-neon-card` with glow-on-hover
- Spotlight: `.pf-spotlight-card` with hover lift
- Executive: `.pf-executive-card` with subtle border
- Starter: `.pf-starter-card` with rounded corners and float
- Others: existing inline styles as fallback

### 2. Theme-Specific Motion Variants
**File:** `src/pages/PublicPortfolioPage.tsx`

Replace the single `fadeUp` variant with a `getThemeVariants(style)` function that returns different framer-motion variants per theme:
- **Terminal**: slide from left with slight delay (typewriter feel)
- **Neon**: scale up from 0.9 with glow opacity ramp
- **Spotlight**: slide in from right with overshoot spring
- **Executive**: clean fade up with longer duration (refined)
- **Starter**: scale-pop with bouncy spring
- **Default/Minimal/Bold-Dark/Glass-Pro**: current fadeUp

### 3. Light-Aware Hero Ambient
**File:** `src/index.css`

Add theme-specific hero ambient styles via `data-portfolio-style` attribute:
- Light themes (classic-clean, executive, spotlight, starter) get a warm gradient using light colors
- Dark themes keep the current dark gradient

### 4. Theme-Aware Sticky Header
**File:** `src/components/portfolio/public/StickyHeader.tsx`

Pass the `pStyle` prop and derive background color from the theme config. Light themes get a white/cream frosted header; dark themes keep the current dark one.

### 5. Enhanced Theme CSS Animations
**File:** `src/index.css`

Add distinctive hover/entrance effects per theme:
- **Terminal cards**: green scanline sweep on hover, monospace text flicker on reveal
- **Neon cards**: pulsing border glow animation (already exists but strengthen it)
- **Spotlight cards**: subtle parallax shadow shift on hover
- **Executive cards**: gold/navy accent underline on hover
- **Starter cards**: gradient border reveal on hover

### 6. Section Entrance Stagger Animations
**File:** `src/pages/PublicPortfolioPage.tsx`

Add `whileInView` with theme-appropriate variants to all `motion.section` wrappers so each section animates distinctly when scrolling into view, not just appearing instantly.

## Technical Details

### getGenericCardProps helper
```text
function getGenericCardProps(style: string): { className: string; style: React.CSSProperties }
Maps style string to the correct pf-*-card class
Used for: About, Certifications, Awards, Publications, Volunteering sections
Replaces 5 instances of hardcoded inline card styles
```

### getThemeMotion helper
```text
function getThemeMotion(style: string): { item: Variants; container: Variants }
Returns framer-motion variants tailored to each theme's animation property
terminal-type -> translateX(-20) slide
neon-pulse -> scale(0.92) with glow
slide-in -> translateX(40) spring
scale-pop -> scale(0.85) spring bounce
fade-up -> current default
```

### Light-aware ambient via data attribute
```text
[data-portfolio-style="classic-clean"] .pf-hero-ambient,
[data-portfolio-style="executive-suite"] .pf-hero-ambient,
[data-portfolio-style="creative-spotlight"] .pf-hero-ambient,
[data-portfolio-style="freelancer-starter"] .pf-hero-ambient {
  background: linear-gradient(135deg, #fefefe, #f8f6f0, #f0eaff, #fefefe);
}
```

### Sticky header theme awareness
```text
StickyHeader receives pStyle prop
Light themes: background rgba(255,255,255,0.92), dark text, light border
Dark themes: current rgba(10,10,20,0.85), light text, dark border
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` | Theme-aware card helper, motion variants per theme, pass pStyle to StickyHeader, apply themed cards to generic sections |
| `src/components/portfolio/public/StickyHeader.tsx` | Accept pStyle prop, derive light/dark header styling |
| `src/index.css` | Light-aware hero ambient, enhanced theme hover/entrance effects, terminal scanline, neon pulse strengthen, executive accent underline |

