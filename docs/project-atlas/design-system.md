# WiseResume Design System
*Last updated: 2026-05-19 | App version: 4.6.0*

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Breakpoints](#breakpoints)
6. [Z-Index Scale](#z-index-scale)
7. [Border Radius](#border-radius)
8. [Shadows](#shadows)
9. [Surface System](#surface-system)
10. [Component Library](#component-library)
11. [Icons](#icons)
12. [Animation & Motion](#animation--motion)
13. [Portfolio Themes](#portfolio-themes)
14. [Naming Conventions](#naming-conventions)
15. [Accessibility](#accessibility)
16. [Mobile & Native Considerations](#mobile--native-considerations)

---

## Overview

WiseResume uses a token-based design system built on:

- **Tailwind CSS** — utility-first styling with semantic color tokens
- **shadcn/ui** — headless component primitives (Radix UI)
- **CSS custom properties** — theme tokens via `hsl(var(--token))`
- **framer-motion** — animation library
- **lucide-react** — icon set

**Rule:** Never use raw hex or RGB color values in components. Always use Tailwind semantic classes that map to CSS custom properties.

---

## Color System

### How Tokens Work

All colors are defined as HSL triplets (no `hsl()` wrapper) in CSS custom properties. Tailwind resolves them via `hsl(var(--token))`.

```css
/* Definition */
--primary: 357 71% 36%;

/* Usage in Tailwind */
bg-primary          → background-color: hsl(var(--primary))
text-primary        → color: hsl(var(--primary))
border-primary      → border-color: hsl(var(--primary))
```

### Light Mode Tokens (`:root` / `.light`)

| Token | HSL Value | Description |
|---|---|---|
| `--background` | `0 0% 100%` | Page background (white) |
| `--foreground` | `240 6% 10%` | Body text (near-black) |
| `--card` | `220 14% 96%` | Card / surface background |
| `--card-foreground` | `240 6% 10%` | Text on cards |
| `--popover` | `0 0% 100%` | Popover / dropdown background |
| `--popover-foreground` | `240 6% 10%` | Text in popovers |
| `--primary` | `357 71% 36%` | Crimson red — primary brand color |
| `--primary-foreground` | `0 0% 100%` | Text on primary surfaces |
| `--secondary` | `215 20% 65%` | Slate blue |
| `--secondary-foreground` | `0 0% 100%` | Text on secondary surfaces |
| `--muted` | `220 14% 96%` | Muted backgrounds |
| `--muted-foreground` | `220 9% 46%` | Secondary / helper text |
| `--accent` | `38 92% 50%` | Warm amber — highlight / XP rewards |
| `--accent-foreground` | `0 0% 100%` | Text on accent surfaces |
| `--destructive` | `0 72% 51%` | Error / danger red |
| `--destructive-foreground` | `0 0% 100%` | Text on destructive surfaces |
| `--border` | `220 13% 91%` | Default border color |
| `--input` | `220 13% 91%` | Input field border |
| `--ring` | `357 71% 36%` | Focus ring (matches primary) |
| `--radius` | `0.75rem` | Default border radius |

### Dark Mode Tokens (`.dark`)

| Token | HSL Value | Description |
|---|---|---|
| `--background` | `240 6% 7%` | Dark page background |
| `--foreground` | `220 14% 96%` | Light body text |
| `--card` | `240 5% 11%` | Dark card surface |
| `--muted` | `240 4% 16%` | Elevated muted surface |
| `--muted-foreground` | `220 9% 60%` | Secondary text (lighter than light mode) |
| `--border` | `240 4% 18%` | Subtle dark border |
| `--input` | `240 4% 16%` | Input background (sunken) |

*Primary, accent, destructive, secondary remain the same across light/dark.*

### App Shell Overrides

The `.app-theme` class (wraps all non-landing routes) applies deeper surfaces for a focused app feel.

**Light app shell (`.light .app-theme`):**

| Token | Value | Hex approx |
|---|---|---|
| `--background` | `240 4% 97%` | `#F7F7F8` |
| `--card` | `0 0% 94%` | `#EFEFEF` |
| `--border` | `220 13% 88%` | slightly darker |

**Dark app shell (`.dark .app-theme`):**

| Token | Value | Hex approx |
|---|---|---|
| `--background` | `240 6% 5%` | `#0C0C0E` — base layer |
| `--card` | `240 3% 9%` | `#161618` — surface layer |
| `--popover` | `240 5% 13%` | `#1F1F23` — elevated layer |
| `--muted` | `240 5% 13%` | `#1F1F23` |
| `--border` | `240 7% 18%` | `#2A2A30` |
| `--input` | `240 9% 4%` | `#0A0A0C` — sunken |

### Semantic Status Colors

Available in both light and dark; same token names, slightly adjusted values:

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `--success` | `142 71% 45%` | `142 71% 45%` | Success states, green indicators |
| `--warning` | `38 92% 50%` | `38 92% 50%` | Warnings, amber alerts |
| `--error` | `0 72% 51%` | `0 84% 60%` | Errors (brighter in dark) |
| `--info` | `210 80% 50%` | `217 91% 60%` | Info states, blue highlights |

### Reward / XP Convention

- XP labels, earned badges, trophy icons: `text-primary`
- `AchievementToast`: `bg-card border-border` card, `text-foreground` body, `text-muted-foreground` secondary, `text-primary` reward highlight
- **Never** use hardcoded amber/gold hex values for XP rewards

### Gradient Utilities

| Class | Description |
|---|---|
| `.gradient-primary` | Diagonal crimson → rose gradient (for CTA backgrounds) |
| `.gradient-secondary` | Diagonal slate → crimson gradient |
| `.gradient-text` | Same gradient applied as text fill |
| `.text-shimmer` | Animated shimmer sweep on text (premium headings) |

---

## Typography

### Font

**Primary:** Inter (loaded via Google Fonts preload in `index.html`)  
**Fallback:** `system-ui, sans-serif`  
**Base size:** 16px  
**Smoothing:** `-webkit-font-smoothing: antialiased`

### Type Scale (Tailwind)

| Class | Size | Line Height |
|---|---|---|
| `text-2xs` | 0.625rem (10px) | 0.875rem |
| `text-xs` | 0.75rem (12px) | 1rem |
| `text-sm` | 0.875rem (14px) | 1.25rem |
| `text-base` | 1rem (16px) | 1.5rem |
| `text-lg` | 1.125rem (18px) | 1.75rem |
| `text-xl` | 1.25rem (20px) | 1.75rem |
| `text-2xl` | 1.5rem (24px) | 2rem |
| `text-3xl` | 1.875rem (30px) | 2.25rem |
| `text-4xl` | 2.25rem (36px) | 2.5rem |
| `text-5xl` | 3rem (48px) | 1 |
| `text-6xl` | 3.75rem (60px) | 1 |

### Semantic Typography Utilities

| Utility | Definition | Use case |
|---|---|---|
| `.text-h1` | `font-semibold tracking-tight`, `clamp(1.75rem, 7vw, 2.25rem)`, lh 1.2 | Top-level page headings |
| `.text-h2` | `text-2xl font-semibold`, lh 1.3 | Section headings |
| `.text-h3` | `text-xl font-semibold`, lh 1.35 | Sub-section headings |
| `.text-body` | `text-base font-normal`, lh 1.6 | Paragraph body text |
| `.text-caption` | `text-sm font-medium uppercase tracking-wider`, lh 1.4 | Labels, metadata |
| `.text-tiny` | `text-xs font-medium`, lh 1.25 | Badges, tiny labels |
| `.text-page-title` | `font-semibold`, `clamp(1.125rem, 4.5vw, 1.375rem)`, lh 1.3 | Mobile app page titles |
| `.text-section-header` | `font-semibold`, `clamp(1rem, 4vw, 1.125rem)`, lh 1.3 | App section headers |
| `.text-label` | `text-xs font-medium text-muted-foreground`, lh 1.4 | Form labels, secondary labels |

### Fluid Typography

For responsive text that scales smoothly between viewports:

| Utility | Range |
|---|---|
| `.text-fluid-sm` | 14px → 16px |
| `.text-fluid-base` | 16px → 18px |
| `.text-fluid-lg` | 18px → 24px |
| `.text-fluid-xl` | 20px → 32px |
| `.text-fluid-2xl` | 24px → 40px |
| `.text-fluid-3xl` | 30px → 48px |
| `.text-fluid-4xl` | 36px → 64px |

### Component Typography Patterns

| Context | Classes |
|---|---|
| Page title `<h1>` | `text-page-title` |
| Section heading `<h2>` | `text-sm font-semibold text-muted-foreground uppercase tracking-wider` |
| Card body | `text-sm text-foreground` |
| Caption / helper | `text-xs text-muted-foreground` |
| Tiny label / badge | `text-[10px] text-muted-foreground` |

---

## Spacing & Layout

### Page Structure

| Pattern | Class |
|---|---|
| Page horizontal padding | `px-4` (use `.px-edge` = `px-3 md:px-4`) |
| Section vertical spacing | `space-y-4` to `space-y-6` |
| Standard card padding | `p-4` (use `.p-card` = `p-3 md:p-4`) |
| Compact card padding | `p-3` |
| Spacious card padding | `p-6` |
| Flex item gap (standard) | `gap-3` |
| Flex item gap (tight) | `gap-2` |

### Semantic Spacing Utilities

| Utility | Definition | Use case |
|---|---|---|
| `.px-edge` | `px-3 md:px-4` | Page horizontal padding |
| `.space-section` | `mb-4 md:mb-6` | Between major sections |
| `.p-card` | `p-3 md:p-4` | Default card padding |
| `.px-mobile` | `px-4 sm:px-6 lg:px-8` | Responsive horizontal padding |
| `.py-mobile` | `py-6 sm:py-8 lg:py-12` | Responsive vertical padding |
| `.container-responsive` | `w-full mx-auto px-4 sm:px-6 lg:px-8`, max `1280px` | Full-width responsive container |

### Custom Spacing Tokens (Tailwind `spacing`)

| Token | Value |
|---|---|
| `18` | 4.5rem |
| `22` | 5.5rem |
| `26` | 6.5rem |
| `30` | 7.5rem |
| `safe-top` | `env(safe-area-inset-top)` |
| `safe-bottom` | `env(safe-area-inset-bottom)` |
| `safe-left` | `env(safe-area-inset-left)` |
| `safe-right` | `env(safe-area-inset-right)` |

### Responsive Grid Patterns

| Utility | Behavior |
|---|---|
| `.grid-mobile-1-desktop-2` | 1 col → 2 col at `md` |
| `.grid-mobile-1-tablet-2-desktop-3` | 1 → 2 at `sm` → 3 at `lg` |
| `.grid-mobile-1-desktop-4` | 1 → 2 at `sm` → 4 at `lg` |
| `.stack-mobile-horizontal-desktop` | `flex-col` → `flex-row` at `md` |
| `.mobile-full-desktop-constrained` | Full width → max `4xl` centered |

---

## Breakpoints

| Name | Min-width | Notes |
|---|---|---|
| `xs` | 375px | Small phones |
| `sm` | 640px | Large phones / small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Desktops |
| `2xl` | 1400px | Large desktops |

Container max-widths match breakpoints. Default container padding: `1rem` → `1.5rem` → `2rem` → `3rem`.

---

## Z-Index Scale

Custom z-index tokens for the app shell layer stack:

| Token | Value | Layer |
|---|---|---|
| `z-editor-shell` | 40 | Resume editor outer shell |
| `z-editor-header` | 50 | Editor sticky header |
| `z-keyboard-toolbar` | 60 | Mobile keyboard toolbar |
| `z-ai-dialog` | 65 | AI suggestion dialogs |
| `z-toast` | 70 | Toast notifications (topmost) |

Standard Tailwind z-values (`z-10`, `z-20`, `z-30`) are used for general layering below these named layers.

---

## Border Radius

| Token | Value | Tailwind class |
|---|---|---|
| `--radius` | `0.75rem` | — |
| `rounded-lg` | `var(--radius)` = 0.75rem | Standard cards, buttons |
| `rounded-md` | `calc(var(--radius) - 4px)` = 0.5rem | Smaller elements |
| `rounded-sm` | `calc(var(--radius) - 8px)` = 0.25rem | Tight elements |
| `rounded-xl` | 0.75rem (Tailwind default) | Mobile cards |
| `rounded-2xl` | 1rem | Large cards, drawers |
| `rounded-full` | 9999px | Avatars, pill badges |

Mobile responsive pattern: `.rounded-mobile` = `rounded-xl sm:rounded-2xl`

---

## Shadows

Custom shadow scale extending Tailwind (all use very low-opacity blacks for subtlety):

| Token | Value | Use case |
|---|---|---|
| `shadow-soft-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Barely-there lift |
| `shadow-soft` | `0 1px 3px + 0 1px 2px` | Default card shadow |
| `shadow-soft-md` | `0 4px 6px + 0 2px 4px` | Modals, dropdowns |
| `shadow-soft-lg` | `0 10px 15px + 0 4px 6px` | Elevated panels |
| `shadow-soft-xl` | `0 20px 25px + 0 8px 10px` | Full-screen modals |

### Glow Effects

| Utility | Effect |
|---|---|
| `.glow-primary` | `box-shadow: 0 4px 14px -2px hsl(var(--primary) / 0.25)` |
| `.glow-accent` | `box-shadow: 0 4px 14px -2px hsl(var(--accent) / 0.25)` |
| `.glow-subtle` | `box-shadow: 0 1px 3px rgb(0 0 0 / 0.06)` |
| `.glow-subtle-hover` | Applies glow on `:hover` |
| `.glow-ring-focus` | 2px background ring + 4px primary ring on `:focus-visible` |
| `.border-glow` | Gradient border via CSS mask (primary → accent → transparent) |
| `.border-glow-pulse` | Animated version — fades in/out on 3s loop |

---

## Surface System

Surfaces replace glassmorphism with token-based solid backgrounds. The `.glass-*` class names are preserved for backward compatibility but now render solid surfaces.

| Class | Light | Dark | Use case |
|---|---|---|---|
| `.glass` | `bg-card` + subtle border + `shadow-soft` | same | General elevated surface |
| `.glass-card` | `bg-card` + border + slightly deeper shadow | same | Card containers |
| `.glass-surface` | `bg-card` + border | same | Flat surface panels |
| `.glass-surface-alt` | `bg-muted` + negative margin bleed | same | Full-bleed section backgrounds |
| `.glass-elevated` | `bg-card` + border + `shadow-soft-md` | same | Modals, popovers |
| `.glass-input` | `bg-input` + border, focus → primary ring | sunken `bg-input` | Text inputs, textareas |
| `.glass-header` | `bg-background/95` + backdrop-blur + border-bottom | same | Sticky app headers |

**Native APK:** All `backdrop-filter` is disabled via `.native-app` body class for WebView performance.

---

## Component Library

### File Structure

| Pattern | Path |
|---|---|
| Page components | `src/pages/*Page.tsx` |
| Layout wrappers | `src/components/layout/*.tsx` |
| Shared UI primitives | `src/components/ui/*.tsx` (shadcn/ui) |
| Feature components | `src/components/{feature}/*.tsx` |
| Hooks | `src/hooks/use*.ts` / `src/hooks/use*.tsx` |
| Zustand stores | `src/store/*Store.ts` |

### Button

**Import:** `src/components/ui/button.tsx`  
**Props:** `variant`, `size`, `asChild`, all native button attributes

#### Variants

| `variant` | Tailwind | Use case |
|---|---|---|
| `default` | `bg-primary text-primary-foreground` | Primary CTA |
| `secondary` | `bg-secondary text-secondary-foreground` | Secondary action |
| `outline` | `border border-input bg-background` | Tertiary / cancel |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Icon buttons, subtle actions |
| `destructive` | `bg-destructive text-destructive-foreground` | Delete / danger |
| `link` | `text-primary underline-offset-4 hover:underline` | Inline text links |

#### Sizes

| `size` | Dimensions |
|---|---|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 px-3 text-sm` |
| `lg` | `h-11 px-8` |
| `icon` | `h-9 w-9` (square) |

### Badge

**Import:** `src/components/ui/badge.tsx`  
**Props:** `variant`, all native div attributes

| `variant` | Style | Use case |
|---|---|---|
| `default` | `bg-primary text-primary-foreground` | Status, count |
| `secondary` | `bg-secondary text-secondary-foreground` | Tags |
| `destructive` | `bg-destructive text-destructive-foreground` | Error counts |
| `outline` | `border text-foreground` | Neutral labels |
| `glass` | Glass surface style | Overlay badges |

### Card

**Import:** `src/components/ui/card.tsx`  
**Composition:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

No variant system — cards are composed manually. Standard pattern:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle or description</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

### Input

**Import:** `src/components/ui/input.tsx`  
No variants. Accepts all native `<input>` attributes. Auto-applies `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}` for form inputs. Wrap with `.glass-input` for the focus ring effect.

### Avatar

**Import:** `src/components/ui/avatar.tsx`  
**Composition:** `Avatar`, `AvatarImage`, `AvatarFallback`  
Standard Radix UI Avatar. Size is controlled by width/height classes on `Avatar`.

### Other Primitives (all in `src/components/ui/`)

`Accordion` · `AlertDialog` · `Alert` · `Calendar` · `Chart` · `Checkbox` · `Collapsible` · `Command` · `Dialog` · `Drawer` · `DropdownMenu` · `FloatingPanel` · `Form` · `FormField` · `Label` · `Popover` · `Progress` · `PullToRefresh` · `RadioGroup` · `Resizable` · `ScrollArea` · `Select` · `Separator` · `Sheet` · `Skeleton` · `SkeletonCard` · `Slider` · `Sonner` (toasts) · `Switch` · `Table` · `Tabs` · `Textarea` · `Toggle` · `ToggleGroup` · `Tooltip`

### Custom App Components (also in `src/components/ui/`)

| Component | Purpose |
|---|---|
| `AITrustBadge` | "AI-verified" trust indicator badge |
| `AchievementToast` | XP reward toast notification |
| `BackButton` | Standard back navigation button |
| `ElectricBorder` | Animated electric border effect |
| `GlassSurface` | Pre-composed glass surface wrapper |
| `LoadingButton` | Button with built-in loading state |
| `MiniSpinner` | Small inline spinner |
| `PageLoadingSpinner` | Full-page loading state |
| `PlanAvatar` | Avatar with plan tier indicator ring |
| `PlanChip` | Subscription plan badge chip |
| `ToastContent` | Structured toast body component |
| `TrialCountdownBadge` | Trial expiry countdown display |

### Plan Avatar Glow Rings

Animated plan-tier rings on `PlanAvatar`:

| Class | Animation | Tier |
|---|---|---|
| `.plan-glow-premium` | Gold glow pulse, 2.2s | Premium |
| `.plan-glow-pro` | Blue glow pulse, 2.2s | Pro |

---

## Icons

**Library:** `lucide-react` — the only permitted icon library.

**Never** import from `@heroicons/react` or `react-icons`.

### Standard Sizes

| Context | Size classes |
|---|---|
| Inline / text-adjacent | `w-4 h-4` |
| Feature icons | `w-5 h-5` |
| Navigation / hero icons | `w-6 h-6` |

---

## Animation & Motion

### Library

**framer-motion** — all interactive animations use this library.

### Reduced Motion

A `MotionConfig` wraps `AppInterior.tsx` with `reducedMotion: 'always'` when the OS preference is set. All child `motion.*` elements automatically inherit this.

**Rule:** CSS `@keyframes` animations do **not** automatically respect reduced motion. Always add:
```css
@media (prefers-reduced-motion: reduce) {
  .your-animation { animation: none; }
}
```
Or check `useReducedMotion()` from framer-motion before triggering JS animations.

The global rule in `index.css` already collapses all animation/transition durations to `0.01ms` when `prefers-reduced-motion: reduce` is active.

### Tailwind Animation Utilities

| Class | Keyframe | Duration |
|---|---|---|
| `animate-fade-in` | `opacity 0 + translateY(10px)` → normal | 0.5s ease-out |
| `animate-slide-up` | `translateY(20px)` → normal | 0.6s ease-out |
| `animate-scale-in` | `scale(0.95)` → normal | 0.3s ease-out |
| `animate-shimmer` | Background position sweep | 2s infinite linear |
| `animate-gradient-shift` | Gradient position cycle | 20s ease infinite |
| `animate-float` | `translateY(0 → -8px → 0)` | 3s ease-in-out infinite |
| `animate-glow-pulse` | Box shadow pulse | 2s ease-in-out infinite |
| `animate-draw-line` | Width 0 → 100% | 1s ease-out forwards |
| `animate-marquee` | Horizontal ticker scroll | 32s linear infinite |
| `animate-slide-up-in` | Sheet/drawer slide in | 0.35s ease-out |
| `animate-slide-down-out` | Sheet/drawer slide out | 0.25s ease-in |
| `animate-accordion-down` | Height 0 → content | 0.2s ease-out |
| `animate-accordion-up` | Height content → 0 | 0.2s ease-out |

### CSS Utility Animations

| Class | Effect |
|---|---|
| `.animate-fade-in` | `fade-in` — 0.25s (hero/section elements) |
| `.animate-fade-in-up` | `fade-in-up` — 0.5s (landing sections) |
| `.animate-scale-in` | `scale-in` — 0.4s (logo entrance) |
| `.animate-bounce-gentle` | 6px bounce — 1.5s infinite (scroll indicators) |
| `.animate-float` | Float 0→-8px — 6s infinite |
| `.animate-pulse-glow` | Scale + opacity pulse — 2s infinite |
| `.animate-gradient-shift` | Gradient background shift — 8s infinite |
| `.text-shimmer` | Animated text gradient sweep — 4s infinite |

### Performance Hints

| Class | Effect |
|---|---|
| `.will-change-transform` | `will-change: transform` |
| `.will-change-opacity` | `will-change: opacity` |
| `.gpu-accelerated` | `translateZ(0) + backface-visibility: hidden` |
| `.section-containment` | `content-visibility: auto` + intrinsic size hint |

### Easing Reference

| Easing | Value | Use case |
|---|---|---|
| Spring snap | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Badges, skill tags, popups |
| Smooth decelerate | `cubic-bezier(0.22, 1, 0.36, 1)` | Cards, panels, slides |
| Linear | `linear` | Marquees, continuous loops |
| Ease-in | `ease-in` | Exits |
| Ease-out | `ease-out` | Entrances |

---

## Portfolio Themes

Portfolio pages support per-user themes applied via `data-theme` attribute on `<html>`:

```ts
document.documentElement.setAttribute("data-theme", profile.theme);
```

Cleaned up on unmount in `usePortfolioSEO.ts`.

### Theme Definitions (`portfolioThemes.ts`)

| Theme ID | Display Name | Visual Style |
|---|---|---|
| `minimal` | Minimal | Clean, whitespace-heavy |
| `developer-terminal` | Developer Terminal | Dark, monospace, terminal green |
| `neon-cyber` | Neon Cyber | Dark, neon glows, pulsing accents |
| `creative-spotlight` | Creative Spotlight | Light, bold typography |

### Portfolio CSS Token (`--pf-accent`)

Portfolio themes use `--pf-accent` as a per-theme override color, distinct from the main `--primary`. Components reference `var(--pf-accent, fallback)`.

### Portfolio-Specific CSS Classes

#### Section Animations (scroll-triggered)
| Class | Trigger class | Effect |
|---|---|---|
| `.pf-section-title` | `.title-revealed` | Underline draws left-to-right on scroll |
| `.pf-exp-card` | `.pf-card-revealed` | Slide-up on mobile, slide-left on desktop |
| `.pf-edu-card` | `.pf-edu-revealed` | Fade-up on scroll |
| `.pf-skill-tag` | `.pf-skill-revealed` | Pop-in with spring bounce |
| `.pf-bio-line-inner` | `.pf-bio-revealed` | Line-by-line text reveal |
| `.pf-section-line` | `.pf-section-line-drawn` | Divider draws left-to-right |
| `.pf-stats-strip` | `.pf-stats-visible` | Fade + slide up |
| `.pf-timeline-dot` | `.pf-dot-visible` | Scale pop on scroll |
| `.pf-timeline-line` | (`.pf-timeline-drawn` on parent) | scaleY 0→1 |

#### Hero Entrance
| Class | Effect | Easing |
|---|---|---|
| `.pf-badge-entrance` | Scale + slide up | Spring 400ms |
| `.pf-cta-entrance` | Slide up | Decelerate 450ms |
| `.pf-fade-entrance` | Fade in | Ease-out 500ms |
| `.pf-availability-entrance` | Scale pop | Spring 350ms |

#### Theme Card Classes
| Class | Theme | Card style |
|---|---|---|
| `.pf-terminal-card` | Developer Terminal | Dark glass, monospace font, scanline hover |
| `.pf-neon-card` | Neon Cyber | Semi-transparent, accent border pulse |
| `.pf-spotlight-card` | Creative Spotlight | Warm white, no border, subtle shadow, scale hover |
| `.pf-executive-card` | Executive (future) | White, 1px border, border-line hover animation |
| `.pf-starter-card` | Starter (future) | White, rounded-3xl, gradient border hover |

#### CTA Shimmer
`.pf-cta-shimmer` — Repeating shimmer sweep with delay variants:
- `.pf-cta-shimmer-d1` — 1s delay
- `.pf-cta-shimmer-d2` — 2.8s delay
- `.pf-cta-shimmer-subtle` — lower opacity

#### Sticky Header
`.pf-sticky-header` / `.pf-sticky-visible` — translateY(-100%) → 0 on scroll, 350ms decelerate easing.

#### Contact CTA Floating Button
`.pf-contact-cta` / `.pf-contact-visible` — fixed position, scale + translateY entrance on scroll.

#### Holographic Shimmer
`.pf-holo-shimmer` — absolute overlay, screen blend mode, animated iridescent shimmer (6s loop). Used on premium portfolio cards.

---

## Naming Conventions

### Files

| Type | Convention | Example |
|---|---|---|
| Page component | `*Page.tsx` in `src/pages/` | `DashboardPage.tsx` |
| Layout wrapper | `*.tsx` in `src/components/layout/` | `AppShell.tsx` |
| UI primitive | `*.tsx` in `src/components/ui/` | `button.tsx` |
| Feature component | `*.tsx` in `src/components/{feature}/` | `ResumeCard.tsx` |
| Hook | `use*.ts` or `use*.tsx` | `usePortfolioSEO.ts` |
| Zustand store | `*Store.ts` in `src/store/` | `resumeStore.ts` |

### CSS Classes

| Pattern | Convention |
|---|---|
| Portfolio-specific | `pf-*` prefix |
| Landing page | `lp-*` prefix |
| App shell | `app-theme` wrapper class |
| Semantic utilities | descriptive names (`.glass-card`, `.text-page-title`) |
| Animation utilities | `animate-*` |

### Theme Data Attribute

`data-theme="minimal|developer-terminal|neon-cyber|creative-spotlight"` on `<html>`.

---

## Accessibility

### Focus Ring

Global `:focus-visible` sets a 2px solid primary-color outline with 2px offset. Applied in `@layer base`.

Custom focus utility: `.focus-visible-custom` = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`

### Reduced Motion

- Global CSS: `@media (prefers-reduced-motion: reduce)` collapses all durations to `0.01ms`
- framer-motion: `MotionConfig reducedMotion="always"` wraps `AppInterior.tsx`
- Portfolio: All `pf-*` animations have explicit `prefers-reduced-motion` overrides

### Touch Targets

`.touch-target` — enforces minimum `44px × 44px` touch area per WCAG 2.5.5.

### Scrollbar

Custom 4px scrollbar styled with `--muted` track and semi-transparent `--muted-foreground` thumb.

---

## Mobile & Native Considerations

### Safe Area Insets

| Utility | Purpose |
|---|---|
| `.pt-safe` | `padding-top: max(16px, env(safe-area-inset-top))` — sticky headers |
| `.pb-safe` | `padding-bottom: max(1rem, env(safe-area-inset-bottom))` — bottom nav |
| `.p-safe` | All four sides |
| `.keyboard-safe-bottom` | Bottom padding accounts for virtual keyboard height |

### Keyboard Awareness

When `.keyboard-open` is on `<body>`:
- `.bottom-tab-bar` is hidden
- `.editor-header` reduces padding
- `.keyboard-hide` elements are hidden
- Scroll containers get extra bottom padding equal to `var(--keyboard-height)`

### Native APK WebView

When `.native-app` is on `<body>`:
- All `backdrop-filter` / `-webkit-backdrop-filter` disabled on glass surfaces
- `[class*="backdrop-blur"]` also stripped

### Android WebView Scroll Fix

Scroll containers use:
```css
-webkit-overflow-scrolling: touch;
overscroll-behavior-y: contain;
touch-action: pan-y;
```

Applied to: `.main-scroll-container`, `.bottom-sheet-scroll`, `[data-radix-scroll-area-viewport]`

### Touch Interaction Utilities

| Class | Behavior |
|---|---|
| `.touch-manipulation` | `touch-action: manipulation` — removes 300ms tap delay |
| `.touch-active:active` | `scale(0.98) opacity(0.9)` — visual press feedback |
| `.touch-feedback` | `active:scale-[0.97] transition-transform duration-100` |
| `.touch-ripple` | Radial ripple effect on `:active` |
| `.no-select` | `-webkit-user-select: none` — prevents text selection |

### Performance

| Class | Use case |
|---|---|
| `.section-containment` | `content-visibility: auto` for off-screen sections |
| `.editor-scroll-container > *` | `content-visibility: auto` for editor tab sections |
| `.will-change-transform` | Pre-paint hint for animated elements |
| `.gpu-accelerated` | Force GPU compositing for critical animations |

### Security

`.wr-security-curtain` on `<body>` — `blur(20px)` + `pointer-events: none` to hide content from OS app-switcher screenshots. `[data-biometric-lock]` elements override this to stay crisp.

### Print Styles

Interview Summary page has scoped print styles via `:has(#interview-summary-content)` — prevents blank PDF pages from Puppeteer resume rendering.
