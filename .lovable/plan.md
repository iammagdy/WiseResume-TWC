

# Portfolio Theme Store -- Phase 1 (5 Premium Themes)

## The Vision

Transform the current 4-style picker into a **Theme Store** where users browse beautiful, real-world-inspired portfolio designs with live mini-previews and apply them in one tap. Each theme isn't just a color swap -- it changes the **layout structure, typography, card styles, hero design, and animations** to feel like a completely different portfolio website.

## The 5 Themes (Phase 1)

| # | Theme ID | Name | Inspired By | Category |
|---|----------|------|-------------|----------|
| 1 | `developer-terminal` | **Terminal** | Brittany Chiang (v4.brittanychiang.com), Josh Comeau | Developer |
| 2 | `creative-spotlight` | **Spotlight** | Behance/Dribbble artist portfolios, Apple keynote style | Creative / Designer |
| 3 | `executive-suite` | **Executive** | McKinsey-style, premium LinkedIn profiles | Corporate |
| 4 | `freelancer-starter` | **Starter** | Top freelancer landing pages, agency sites | Freelancer |
| 5 | `neon-cyber` | **Neon** | Cyberpunk-inspired dev portfolios, synthwave aesthetic | Developer / Creative |

### Theme Breakdown

**1. Terminal** (Developer)
- Monospace font (JetBrains Mono / Fira Code via Google Fonts)
- Dark charcoal background (#1a1b26) with green/amber accent options
- Cards styled like terminal windows with title bars (dots + filename)
- Hero: left-aligned with a blinking cursor typewriter effect
- Section headers prefixed with `>_` like terminal commands
- Code-block-style skill badges

**2. Spotlight** (Creative)
- Large hero with oversized bold typography (Clash Display / Syne feel via Space Grotesk)
- Gradient mesh background in the hero area
- Masonry-style project grid with hover zoom
- Experience shown as a horizontal scroll timeline
- Cards with subtle shadow elevation, no borders
- Warm neutral palette (#faf9f6 bg, deep charcoal text)

**3. Executive** (Corporate)
- Serif heading font (Playfair Display feel via Georgia/serif)
- Clean white background with navy/slate accents
- Structured layout with horizontal rules between sections
- Hero: centered with a subtle gold/navy gradient line underneath the name
- Cards with thin borders and generous whitespace
- Professional stat counters with subtle count-up animation

**4. Starter** (Freelancer)
- Services section promoted to top, above experience
- CTA buttons more prominent with gradient fills
- Testimonials displayed in a card carousel
- Hero: split layout with avatar on left, text + CTA on right
- Pricing-friendly card design with hover lift effect
- Vibrant accent colors, rounded-3xl cards

**5. Neon** (Developer/Creative)
- Deep black background (#0a0a0a) with neon glow effects
- Cards with neon border glow on hover (box-shadow with accent color)
- Hero: centered with a glowing ring avatar and animated particles
- Section headers with neon underline animation
- Skill badges with glow pulse effect
- Cyberpunk-inspired grid/scanline subtle overlay

## Architecture

### How It Works (No Rewrite Needed)

The current system already uses CSS variables (`--pf-bg`, `--pf-fg`, `--pf-card`, etc.) and a `style` prop on every card component. We **extend this pattern** rather than rewrite:

1. **Theme Registry** (`src/lib/portfolioThemes.ts`) -- A single file defining all theme configurations
2. **Card components** -- Each card already checks `style` for rendering differences; we add new cases
3. **PublicPortfolioPage** -- The `rootStyle` and `heroBg` logic already switches on `pStyle`; we add new cases
4. **AppearanceSection** -- Replace the small horizontal card picker with a richer 2-column grid

```text
Theme Registry (config)
        |
        v
+------------------+     +--------------------+
| Editor UI        |     | Public Portfolio    |
| (Theme Store     | --> | (reads pStyle from  |
|  grid picker)    |     |  profile, applies   |
+------------------+     |  CSS vars + layout) |
                          +--------------------+
                                   |
                          +--------+--------+
                          |  Card Components |
                          |  (switch on      |
                          |   style prop)    |
                          +-----------------+
```

### Theme Config Shape

Each theme defines:
- **Colors**: Full CSS variable set (bg, fg, card, border, muted, accent defaults)
- **Typography**: Heading font family, body font family, heading weight
- **Layout flags**: Hero alignment (center/left/split), section order override, card border radius
- **Animation preset**: Entry animation style (fade-up, slide-in, scale-pop, terminal-type)
- **Card variant**: How cards render (bordered, elevated, terminal-window, glassmorphism, neon-glow)
- **Preview**: Thumbnail mini-preview colors for the editor picker

### Database

No schema changes needed. The existing `portfolio_style` column on `profiles` stores a text value -- we just store the new theme IDs (e.g., `developer-terminal`) in the same column.

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/portfolioThemes.ts` | Theme registry with all 9 theme configs (4 existing + 5 new) |
| `src/components/portfolio/editor/ThemeStorePicker.tsx` | New grid-based theme picker with live mini-previews (replaces the horizontal scroll) |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/portfolio/editor/AppearanceSection.tsx` | Replace `ThemePreviewCard` horizontal scroll with `ThemeStorePicker`; update `PortfolioStyle` type to include 5 new IDs |
| `src/pages/PublicPortfolioPage.tsx` | Extend `rootStyle` and `heroBg` switch to handle 5 new themes; add layout variant logic (hero alignment, section reordering for Starter) |
| `src/components/portfolio/public/cards/ExperienceCard.tsx` | Add card style cases for terminal, spotlight, executive, starter, neon |
| `src/components/portfolio/public/cards/EducationCard.tsx` | Add card style cases for 5 new themes |
| `src/components/portfolio/public/cards/ProjectCard.tsx` | Add card style cases for 5 new themes |
| `src/components/portfolio/public/cards/CaseStudyCard.tsx` | Add card style cases for 5 new themes |
| `src/components/portfolio/public/cards/ServiceCard.tsx` | Add card style cases for 5 new themes |
| `src/components/portfolio/public/cards/TestimonialCard.tsx` | Add card style cases for 5 new themes |
| `src/components/portfolio/public/SectionHeader.tsx` | Add style variants (terminal prefix, neon underline, etc.) |
| `src/components/portfolio/editor/LivePreviewCard.tsx` | Update preview card to reflect new theme styles |
| `src/index.css` | Add CSS animations for new themes (neon glow keyframes, terminal cursor blink, scanline overlay) |
| `src/pages/PortfolioEditorPage.tsx` | Update `PortfolioStyle` type usage to accept new theme IDs |

## Theme Store Picker UI

The new picker replaces the current horizontal scroll with a **2-column grid** of rich theme cards:

- Each card shows a **live CSS mini-preview** (same approach as current ThemePreviewCard but taller ~120px with more detail)
- Theme name + one-line description below
- Selected theme has a gradient ring + checkmark
- "NEW" badge on the 5 new themes
- Category chips at the top for filtering (All / Developer / Creative / Corporate / Freelancer)
- Scrollable within the Appearance section

## Implementation Order

Due to the size, this will be implemented across multiple steps:

1. **Theme Registry** -- Create the config file with all 9 themes
2. **Theme Store Picker** -- Build the new editor UI component
3. **PublicPortfolioPage core** -- Extend CSS vars + hero for all 5 new themes
4. **Card components** -- Update all 6 card components with new style cases
5. **CSS animations** -- Add neon glow, terminal cursor, and other theme-specific animations
6. **Polish** -- Section header variants, section reordering for Starter theme

## What Users Will Experience

1. Open Portfolio Editor, tap "Appearance"
2. See a beautiful 2-column theme grid with 9 options (4 existing + 5 new)
3. Filter by category (Developer, Creative, Corporate, Freelancer)
4. Tap a theme to select it -- the live preview card updates instantly
5. Tap "Save Portfolio Settings" -- the theme is saved
6. Visit the live portfolio -- the entire look and feel changes: different hero, card styles, fonts, animations, and color palette

