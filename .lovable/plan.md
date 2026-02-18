
# Public Portfolio Redesign: From Utility Screen to Standalone Product

## What's Weak About the Current Portfolio (Honest Audit)

### Visual & Layout Problems
1. **No identity beyond "app wrapper"**: The public page uses the exact same `bg-background` + `glass-elevated` system as the internal app. A visitor sees what looks like an internal dark-mode app screen, not a personal website.
2. **No themed pages**: The only "theming" is `dark`, `light`, or `system` — all of which apply the WiseResume app colors (vibrant red primary, cyan accent). A "Corporate" user ends up with a hot-pink-accented portfolio. There is no portfolio-specific color or typography system.
3. **Hero section is weak**: Small 96px avatar, name, job title, a row of text links, and a plain `Download Resume` button. No visual punch. No sense of the person. No ambient background or personality.
4. **Section headings are utility labels**: `EXPERIENCE`, `TECH STACK`, `PROJECTS` in uppercase muted text with a small icon — this looks like an internal admin panel, not a showcase.
5. **Skills rendered as small secondary badges**: Plain `Badge variant="secondary"` chips. No visual weight. On dark mode they're barely readable.
6. **Bento grid col-span is arbitrary**: The `md:col-span-3 / md:col-span-2` split for Experience vs Skills is not intentional design — it just happens to look like a grid.
7. **No layout choice**: Every user gets the same single rigid layout regardless of whether they're a designer, a developer, or a student.
8. **"Portfolio Settings" page** is buried inside Profile → Portfolio Card → /portfolio. There is no top-level nav item or feature positioning. The page is named "Portfolio Settings" (utility naming) rather than "My Portfolio Website" (product naming).
9. **Theme picker in settings offers only 3 options** that aren't portfolio themes — they're just the app's light/dark mode. This is confusing.
10. **No layout variant**: One-column vs two-column is not exposed. Everyone gets the same layout.
11. **"Open to Work" / availability**: Not present at all despite the user asking for it.
12. **Section headings are a list**: Experience, Projects, Education, Certifications all appear as flat vertical lists. No visual hierarchy separates "featured" content from secondary content.

### Product Positioning Problems
1. **Feature is called "Public Portfolio"** everywhere but the `/portfolio` route title says "Portfolio Settings" — it feels administrative rather than creative.
2. **Not discoverable**: The BottomTabBar has 5 tabs (Home, Editor, Studio, Activity, Settings) but no Portfolio tab. The only entry point is buried in Profile.
3. **No "value moment"**: When a user first goes to `/portfolio`, there's no hero pitch explaining why they should care or what a great portfolio looks like.

---

## Your Discovery Answers → Design Decisions

| Question | Your Answer | Design Decision |
|----------|-------------|-----------------|
| Visual vibe | Both — multiple named themes | Ship 4 named portfolio themes with distinct visual identities |
| Customization depth | Full controls | Theme + accent color + font + layout toggle (1-col / 2-col) |
| Target audience | Job seekers + Freelancers + Students | Keep PDF download prominent; add "Hire Me" CTA and "Open to Work" badge |
| Hero extras | Yes — add availability + short headline | Add `open_to_work` boolean + `availability_status` text field |

---

## The 4 Portfolio Themes

Each theme is a named CSS class applied to the root of the public portfolio page. They override only portfolio-specific visual tokens, not the app. They're isolated so they never bleed into the editor or dashboard.

### Theme 1: `Minimal` (default)
- White/off-white background in light, deep charcoal in dark
- System-default font (Inter)
- Subtle borders, no glass, no backdrop blur (pure CSS — no expensive render)
- Accent: user-chosen color (defaults to brand red)
- Layout: 1-column, spacious

### Theme 2: `Bold Dark`
- Always dark background (#0a0a0f) regardless of system theme
- Heading font: Space Grotesk (heavy weight)
- Hero gets a subtle ambient gradient behind the avatar
- Cards have a glow border in the chosen accent color
- Layout: 1-column, compact

### Theme 3: `Glass Pro`
- Uses the existing `glass-elevated` system but applied intentionally to the public page
- Light frosted overlay above a faint radial gradient background
- Clean typography, no heavy borders
- Skills rendered as colored chips with the accent color
- Layout: 2-column optional

### Theme 4: `Classic Clean`
- Pure white background, no glass
- Serif-adjacent heading font (Georgia fallback or system serif)
- Left-border accent lines on section headers instead of uppercase labels
- Very formal, suitable for legal, finance, academic portfolios
- Layout: 1-column, generous vertical rhythm

---

## Full Technical Implementation Plan

### Files to Create: 2
1. `src/components/portfolio/PortfolioTheme.tsx` — the 4 portfolio CSS theme injection component + all sub-components per theme
2. `src/hooks/usePortfolioSettings.ts` — typed hook for the extended portfolio settings

### Files to Modify: 5
1. `src/pages/PublicPortfolioPage.tsx` — full redesign of the public page
2. `src/pages/PortfolioEditorPage.tsx` — redesign with theme picker, accent color, font, layout, open-to-work fields
3. `src/hooks/usePublicPortfolio.ts` — extend `PublicProfile` type with new fields
4. `src/index.css` — add 4 portfolio theme CSS classes (`.portfolio-theme-minimal`, `.portfolio-theme-bold-dark`, `.portfolio-theme-glass-pro`, `.portfolio-theme-classic-clean`)
5. `src/pages/ProfilePage.tsx` — improve the portfolio entry point card with a more compelling description

### Database: 1 migration
Add 5 new columns to `profiles` table (all nullable, backward-compatible):
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_layout text DEFAULT 'single',           -- 'single' | 'two-col'
  ADD COLUMN IF NOT EXISTS portfolio_accent_color text DEFAULT NULL,          -- hex string e.g. '#e84545'
  ADD COLUMN IF NOT EXISTS portfolio_font text DEFAULT 'inter',               -- 'inter' | 'space-grotesk' | 'serif'
  ADD COLUMN IF NOT EXISTS portfolio_style text DEFAULT 'minimal',            -- 'minimal' | 'bold-dark' | 'glass-pro' | 'classic-clean'
  ADD COLUMN IF NOT EXISTS open_to_work boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_headline text DEFAULT NULL;           -- 'Open to remote contracts · Available March 2025'
```
The existing `portfolio_theme` column (`dark`/`light`/`system`) is preserved and kept for backward compat. The new `portfolio_style` is the portfolio-level visual theme (separate concept).

### Update `get_public_portfolio` RPC
Add the 5 new columns to the SELECT and RETURN JSONB in the existing stored function.

---

## Detailed Component Changes

### `PublicPortfolioPage.tsx` — New Structure

**Hero section (completely redesigned):**
```
┌─────────────────────────────────────────┐
│  [Theme-specific ambient background]    │
│                                         │
│         ┌──── Avatar ────┐              │
│         │  120px circle  │              │
│         │  + ring accent │              │
│         └────────────────┘              │
│                                         │
│    John Smith                           │ ← text-fluid-3xl, bold
│    Senior Product Designer              │ ← text-fluid-lg, accent color
│    📍 London · 💼 Open to Work ✓        │ ← inline chips
│                                         │
│    "Available for full-time roles       │ ← availability_headline in italic
│     starting April 2025"               │
│                                         │
│  [LinkedIn] [GitHub] [Website] [Email]  │ ← icon-only pill buttons, 44px min
│                                         │
│  [Hire Me] [Download Resume PDF]        │ ← primary + outline CTAs
└─────────────────────────────────────────┘
```

**Section headers (new look):**
- Instead of `EXPERIENCE` uppercase gray label → use a left-side colored accent bar + larger heading
- Theme `classic-clean`: thin left border in accent color
- Theme `bold-dark`: gradient text heading
- Theme `minimal` / `glass-pro`: clean medium-weight label with a small decorative line

**Skills section (new look):**
- Replace plain secondary badges with colored pill chips that use the user's accent color at 15% opacity with accent-colored text
- In 2-column layout: skills panel moves to a sticky right sidebar
- Group skills (if commas or semicolons detected in the raw string, split into skill groups)

**Projects section (new look):**
- Project cards get a visual header area: project name large, role smaller, then description
- Tech badges keep color-coded look
- Live / GitHub links become actual icon buttons (ExternalLink, Github icons), not text underlines

**Experience cards (new look):**
- Company name moved to be more prominent (same size as position on smaller screen)
- Date range pulled to a styled chip, not raw text
- Description truncated with a `Show more` expand for long entries (avoids overwhelming mobile)
- `current` badge ("Now") shown in accent color

**New: 2-column layout variant:**
When `portfolioLayout === 'two-col'`:
```
Desktop (≥768px):
┌──────────────────┬─────────────────┐
│  Left col (60%)  │  Right col(40%) │
│  Experience      │  Skills         │
│  Projects        │  Education      │
│                  │  Certifications │
│                  │  Contact CTA    │
└──────────────────┴─────────────────┘

Mobile (always 1-column regardless of setting)
```

**"Open to Work" badge:**
- If `open_to_work === true`: show a green pulsing dot + "Open to Work" pill next to job title in hero
- If `availability_headline` set: show it as a styled italic line below the social links

### `PortfolioEditorPage.tsx` — Redesigned Editor

**New sections added:**
1. **Theme Gallery**: Horizontal scroll of 4 theme cards with visual preview thumbnails (colored thumbnail, name, description). Currently selected has a primary border ring. Tap to select.
2. **Customization Panel** (below theme picker):
   - Accent Color: 8 preset swatches + custom hex input (color picker)
   - Font Style: 3 buttons — `Sans` (Inter), `Display` (Space Grotesk), `Serif` (Georgia)
   - Layout: 2 buttons — `Single Column` / `Two Column` (only active on desktop)
3. **Availability section** (new card):
   - Toggle: "Show 'Open to Work' badge"
   - Input: "Availability headline" (placeholder: "Open to remote full-time · From June 2025")
4. **Entry point improvements**: Header renamed from "Portfolio Settings" to "My Portfolio Website"

**Moved/renamed:**
- The old `Portfolio Theme` dropdown (dark/light/system) is kept but demoted to under "SEO & Sharing" → "Page Color Mode" — separate from the visual style.

### `index.css` — 4 New Portfolio Theme Classes

```css
/* Applied as data-portfolio-style="minimal|bold-dark|glass-pro|classic-clean" on root div */

[data-portfolio-style="minimal"] { ... }
[data-portfolio-style="bold-dark"] { ... }
[data-portfolio-style="glass-pro"] { ... }
[data-portfolio-style="classic-clean"] { ... }
```

Each class scopes: `--pf-bg`, `--pf-card`, `--pf-border`, `--pf-accent` (overrideable by user's accent color), `--pf-heading-font`, `--pf-body-font`. These are namespaced with `--pf-` prefix so they never collide with the app's CSS variables.

### `ProfilePage.tsx` — Better Entry Point

The portfolio card in Profile becomes more compelling:
```
┌────────────────────────────────────────┐
│ 🌐  My Portfolio Website          Live │
│     wiseresume.lovable.app/p/john      │
│     👁 234 views this month            │
│                                        │
│  [Preview]  [Share]  [Edit Settings]   │
└────────────────────────────────────────┘
```
Three action buttons instead of a single chevron arrow. View count shown prominently.

---

## What Is NOT Changed

- The `/p/:username` URL structure — all existing public links continue to work
- The `get_public_portfolio` RPC signature — new columns added to output JSON but existing keys unchanged
- All existing `portfolio_sections` visibility toggles
- All existing `portfolio_meta_title` / `portfolio_meta_description` SEO fields
- The `portfolio_bio` / AI bio generation feature
- The `username` validation and uniqueness logic
- The PDF download from the public page
- The off-screen template renderer (still uses the same pattern)
- The `linkedin_url` from the main profile (portfolio social links still pull from the same fields)
- All RLS policies

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|-----------|
| New DB columns (nullable) | Very low | All nullable with defaults; existing rows unaffected |
| New CSS theme classes scoped to `[data-portfolio-style]` | Very low | Namespace `--pf-` prevents collision |
| Updated RPC to include new columns | Low | Additive only — new keys added to existing JSON |
| PublicPortfolioPage redesign | Low | Same route (`/p/:username`), same data model, same PDF render |
| PortfolioEditorPage new fields | Low | New fields saved alongside existing ones via `updateProfile` |
| 2-column layout | Very low | Always collapses to 1-column on mobile |

---

## Summary of What This Becomes

**Before**: An internal-looking screen that dumps resume data into glassmorphism cards. Theming means "dark or light". No brand, no personality, no sense of standing out.

**After**: A genuine public profile product with:
- 4 distinct visual identities (Minimal, Bold Dark, Glass Pro, Classic Clean)
- Full accent color + font + layout controls
- A hero section with ambient design, availability status, and a "Hire Me" primary CTA
- Experience and project cards that feel like a real portfolio, not a settings panel
- A 2-column layout option for desktop
- Clear product positioning ("My Portfolio Website" not "Portfolio Settings")
- Better entry point from Profile with view count and 3 quick actions
- All changes backward-compatible — zero existing links broken
