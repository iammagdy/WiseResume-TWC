

# Step 3: Extend PublicPortfolioPage + Card Components + CSS for 5 New Themes

## Overview
Wire the theme registry into the public portfolio rendering so all 9 themes produce distinct visual experiences -- different hero layouts, card styles, section headers, and animations.

## Changes

### 1. PublicPortfolioPage.tsx

**Refactor rootStyle**: Replace the hardcoded `pStyle === 'bold-dark' ? ...` chain with a call to `getThemeById(pStyle)` + `buildThemeCSSVars(theme, accentColor)`. Add `--pf-bg-alpha` per theme. This eliminates ~30 lines of switch logic.

**Refactor heroBg**: Use theme config to generate hero backgrounds:
- Terminal: subtle green scanline gradient, left-aligned
- Spotlight: mesh gradient (purple/pink/warm), left-aligned with oversized text
- Executive: clean linear gradient with navy accent line
- Starter: split layout hero (avatar left, text+CTA right on md+)
- Neon: radial neon glow from center with subtle grid overlay

**Hero alignment**: Read `theme.layout.heroAlign` and conditionally change the hero's flex alignment:
- `center`: current centered hero (default)
- `left`: text-align left, items-start
- `split`: md:flex-row with avatar on left column, text on right

**Font override**: Use `theme.typography.headingFont` and `theme.typography.bodyFont` from the registry instead of the manual `fontFamilies` map in `getThemeVars`.

### 2. Card Components (6 files)

Each card already switches on `style` for 4 cases. Add cases for the 5 new theme IDs using CSS variables from the theme registry where possible. Key visual differences per theme:

**ExperienceCard.tsx**
- `developer-terminal`: Terminal window card with dot titlebar (red/yellow/green dots), monospace, dark bg
- `creative-spotlight`: Elevated shadow card, no border, rounded-xl, warm bg
- `executive-suite`: Thin border, generous whitespace, serif heading, minimal
- `freelancer-starter`: Rounded-3xl, elevated shadow, hover lift effect
- `neon-cyber`: Neon border glow on hover via box-shadow with accent color

**EducationCard.tsx** -- Same pattern, simpler cards

**ProjectCard.tsx** -- Same pattern. Spotlight gets hover zoom. Neon gets glow border.

**CaseStudyCard.tsx** -- Same pattern with theme-appropriate styling

**ServiceCard.tsx** -- Same pattern. Starter gets gradient CTA-style cards.

**TestimonialCard.tsx** -- Same pattern. Terminal gets code-block quote style.

### 3. SectionHeader.tsx

Add theme-specific header variants:
- `developer-terminal`: Prefix title with `>_` in monospace, green accent
- `neon-cyber`: Neon underline glow animation instead of standard line
- `creative-spotlight`: Oversized bold title, no icon, gradient text
- `executive-suite`: Thin horizontal rule, serif font, muted icon
- `freelancer-starter`: Standard but with rounded accent dot instead of line

### 4. index.css -- New Theme Animations

Add CSS for:
- **Terminal cursor blink**: `@keyframes pf-cursor-blink` for the typewriter cursor
- **Neon glow pulse**: `@keyframes pf-neon-glow` for card hover glow + section header underline
- **Neon scanline**: Subtle repeating-linear-gradient overlay for neon theme
- **Terminal window dots**: `.pf-terminal-dots` with red/yellow/green circles
- **Spotlight hover zoom**: `.pf-spotlight-zoom` scale transform on hover
- **Starter hover lift**: `.pf-starter-lift` translateY(-4px) on hover
- Reduced-motion overrides for all new animations

### 5. Google Fonts Loading

Add a `<link>` tag in the `useEffect` SEO block (or a small helper) to load Fira Code and Space Grotesk from Google Fonts when Terminal, Spotlight, or Neon themes are active. This ensures custom fonts render correctly.

## Implementation Order

1. Update `index.css` with new CSS classes/animations
2. Update `SectionHeader.tsx` with 5 new style cases
3. Update all 6 card components with 5 new style cases each
4. Refactor `PublicPortfolioPage.tsx` to use theme registry + new hero layouts

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` | Use theme registry for rootStyle/heroBg, add hero alignment variants, font loading |
| `src/components/portfolio/public/SectionHeader.tsx` | 5 new style cases (terminal prefix, neon glow, spotlight gradient, etc.) |
| `src/components/portfolio/public/cards/ExperienceCard.tsx` | 5 new card style cases |
| `src/components/portfolio/public/cards/EducationCard.tsx` | 5 new card style cases |
| `src/components/portfolio/public/cards/ProjectCard.tsx` | 5 new card style cases |
| `src/components/portfolio/public/cards/CaseStudyCard.tsx` | 5 new card style cases |
| `src/components/portfolio/public/cards/ServiceCard.tsx` | 5 new card style cases |
| `src/components/portfolio/public/cards/TestimonialCard.tsx` | 5 new card style cases |
| `src/index.css` | Terminal dots, neon glow keyframes, scanline overlay, spotlight zoom, starter lift, reduced-motion |

