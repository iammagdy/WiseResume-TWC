

# Step 5: Update OG Image Edge Function for 5 New Themes

## Problem

The `og-image` edge function generates the social sharing preview image (1200x630 SVG) when portfolios are shared on LinkedIn, Twitter, etc. It currently only handles 4 themes (`minimal`, `bold-dark`, `glass-pro`, `classic-clean`). The 5 new themes all fall through to the `minimal` default, meaning users who pick Terminal, Spotlight, Executive, Starter, or Neon will get a generic OG image that doesn't match their portfolio.

## What Changes

All changes are in a single file: `supabase/functions/og-image/index.ts`

### 1. Update `styleToBg` / `styleToFg` / `styleToMuted`

Add cases for the 5 new theme IDs using their colors from the theme registry:

| Theme | Background | Foreground | Muted |
|-------|-----------|-----------|-------|
| `developer-terminal` | `#1a1b26` | `#c0caf5` | `#565f89` |
| `creative-spotlight` | `#faf9f6` | `#1a1a2e` | `#6b7280` |
| `executive-suite` | `#fefefe` | `#0f172a` | `#64748b` |
| `freelancer-starter` | `#ffffff` | `#18181b` | `#71717a` |
| `neon-cyber` | `#0a0a0a` | `#e4e4e7` | `#71717a` |

### 2. Update `styleToDecoLayer` -- 5 new decoration cases

Each theme gets a unique SVG decoration layer matching the portfolio's visual identity:

- **Terminal**: Scanline pattern + monospace font hint, top bar with terminal dots (red/yellow/green circles), dark charcoal aesthetic
- **Spotlight**: Warm gradient mesh background (subtle purple/pink hues), elevated card shadow effect, warm neutral feel
- **Executive**: Clean dot grid pattern (like classic-clean but more refined), thin navy accent line, serif-appropriate whitespace
- **Starter**: Vibrant accent gradient bar at top, rounded card outline with shadow effect, energetic feel
- **Neon**: Radial neon glow from center, subtle grid/scanline overlay, cyberpunk border glow effect

### 3. Update `buildSkillPills` -- 5 new pill styles

Each theme gets matching skill pill styling:

- **Terminal**: Monospace-feel, green border on dark bg
- **Spotlight**: White elevated pills with shadow, accent text
- **Executive**: White pills with thin navy border
- **Starter**: Solid accent fill pills, white text (like bold-dark)
- **Neon**: Transparent pills with neon glow border

### 4. Update `buildSVG` font references

The monogram and name text elements should use theme-appropriate font-family hints (e.g., `monospace` for Terminal, `serif` for Executive) in the SVG `font-family` attributes.

## No other files change

The `portfolio-meta` function doesn't need updates -- it only handles HTML meta tags, not visuals. The theme registry in `src/lib/portfolioThemes.ts` is frontend-only and not imported by edge functions (Deno runtime), so the OG function maintains its own color mappings.

## Technical Notes

- Edge function will be auto-deployed after changes
- SVG output is cached (`Cache-Control: public, max-age=3600`) so changes take up to 1 hour to propagate for existing users
- All SVG decorations use inline elements (gradients, patterns, shapes) -- no external dependencies

