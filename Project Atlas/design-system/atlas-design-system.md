# WiseResume Design System
*Last updated: 2026-05-16 | App version: 4.6.0*

## Color Token Map

All colors use CSS custom properties via `hsl(var(--token))`. Never use raw hex values in components. Always use Tailwind semantic classes.

| Semantic Role | CSS Variable | Tailwind Class |
|---|---|---|
| Page background | `--background` | `bg-background` / `text-background` |
| Card/surface | `--card` | `bg-card` / `text-card` |
| Card text | `--card-foreground` | `text-card-foreground` |
| Foreground (body text) | `--foreground` | `text-foreground` |
| Muted backgrounds | `--muted` | `bg-muted` |
| Muted text (secondary) | `--muted-foreground` | `text-muted-foreground` |
| Primary action | `--primary` | `bg-primary` / `text-primary` |
| Primary foreground | `--primary-foreground` | `text-primary-foreground` |
| Secondary action | `--secondary` | `bg-secondary` / `text-secondary` |
| Accent | `--accent` | `bg-accent` / `text-accent` |
| Destructive/error | `--destructive` | `bg-destructive` / `text-destructive` |
| Border | `--border` | `border-border` |
| Input | `--input` | `border-input` |
| Ring (focus) | `--ring` | `ring-ring` |
| Popover | `--popover` | `bg-popover` |

### Theme Switching

Themes are applied via `data-theme` attribute on `<html>`. The portfolio page sets this per-user via `usePortfolioSEO.ts`. The main app uses system dark/light preference.

## Reward / XP Color Convention

Achievements use `text-primary` for XP labels and earned badges (`+{xp} XP` text, trophy icons, progress bars). The `AchievementToast` component should match this pattern:
- Toast card: `bg-card border border-border`
- Body text: `text-foreground`
- Muted/secondary text: `text-muted-foreground`
- XP/reward highlight: `text-primary` (matches AchievementsPage pattern) — do NOT use hardcoded amber/gold hex values

## Typography Scale

Use Tailwind's default scale + custom utilities:

| Usage | Class |
|---|---|
| Page title (`<h1>`) | `text-page-title` (custom utility) |
| Section heading (`<h2>`) | `text-sm font-semibold text-muted-foreground uppercase tracking-wider` |
| Card body | `text-sm text-foreground` |
| Caption / helper | `text-xs text-muted-foreground` |
| Tiny label / badge | `text-[10px] text-muted-foreground` |

## Spacing Conventions

- Page horizontal padding: `px-4`
- Section vertical spacing: `space-y-4` to `space-y-6`
- Card padding: `p-4` (standard) / `p-3` (compact) / `p-6` (spacious)
- Gap between flex items: `gap-3` (standard) / `gap-2` (tight)
- Safe area insets: `pt-safe` on sticky headers (applies `env(safe-area-inset-top)`)

## Component Naming

| Pattern | Convention |
|---|---|
| Page components | `src/pages/*Page.tsx` |
| Layout wrappers | `src/components/layout/*.tsx` |
| Shared UI primitives | `src/components/ui/*.tsx` (shadcn/ui) |
| Feature components | `src/components/{feature}/*.tsx` |
| Hooks | `src/hooks/use*.ts` or `src/hooks/use*.tsx` |
| Stores (Zustand) | `src/store/*Store.ts` |

## Button Hierarchy

| Variant | Use case | Tailwind |
|---|---|---|
| `variant="default"` | Primary CTA | `bg-primary text-primary-foreground` |
| `variant="secondary"` | Secondary action | `bg-secondary text-secondary-foreground` |
| `variant="outline"` | Tertiary / cancel | `border border-input bg-background` |
| `variant="ghost"` | Icon buttons, subtle | `hover:bg-accent hover:text-accent-foreground` |
| `variant="destructive"` | Delete / danger | `bg-destructive text-destructive-foreground` |
| `variant="link"` | Text links in body | `text-primary underline` |

Standard sizes: `size="default"` · `size="sm"` · `size="lg"` · `size="icon"` (square, `w-9 h-9`)

## Icon Set

All icons from `lucide-react`. Standard size: `w-4 h-4` inline, `w-5 h-5` for feature icons, `w-6 h-6` for nav/hero icons.

Never import from `@heroicons` or `react-icons` — keep the codebase on a single icon library.

## Theme Data-Attribute Pattern

Portfolio pages support per-user themes set via:
```ts
document.documentElement.setAttribute("data-theme", profile.theme);
```

Available themes (defined in `portfolioThemes.ts`): `minimal`, `developer-terminal`, `neon-cyber`, `creative-spotlight`. Each overrides CSS variables for that page session. Cleaned up on unmount in `usePortfolioSEO.ts`.

## Animation

- Animation library: `framer-motion`
- Global reduced-motion: `MotionConfig` wraps `AppInterior.tsx` — all child animations inherit `reducedMotion: 'always'` when the OS preference is set
- Never use `setInterval` for animations without checking `useReducedMotion()` from framer-motion first
- CSS keyframe animations (`@keyframes` in Tailwind or `<style>`) do NOT automatically respect reduced motion — must add `@media (prefers-reduced-motion: reduce)` override or check the hook
