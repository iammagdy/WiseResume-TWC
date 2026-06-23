---
name: WiseResume
description: AI-powered career toolkit — resume builder, cover letter editor, interview coach, portfolio builder.
colors:
  crimson: "#9E1B22"
  crimson-hover: "#8A1720"
  crimson-eyebrow-dark: "#E53E3E"
  wisehire-blue: "#1D4ED8"
  wisehire-eyebrow-dark: "#3B82F6"
  surface-light: "#F7F7F8"
  surface-elevated-light: "#F0F0F2"
  surface-dark: "#0C0C0E"
  surface-card-dark: "#161618"
  surface-elevated-dark: "#1F1F23"
  lp-dark-base: "#0A0A0F"
  lp-dark-card: "#111118"
  lp-light-base: "#FFF5F5"
  lp-wisehire-dark-base: "#060912"
  lp-wisehire-light-base: "#F0F5FF"
  ink: "#14141A"
  ink-muted: "#6B7280"
  ink-light: "#F5F6FA"
  border-light: "#E3E5EC"
  border-dark: "#2A2A30"
  amber-accent: "#F59E0B"
  success: "#22C55E"
  error: "#EF4444"
  info: "#3B82F6"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  mono:
    fontFamily: "Fira Code, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  card: "16px"
  card-stack: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.crimson}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.crimson-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-stack:
    backgroundColor: "{colors.lp-dark-card}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.card-stack}"
    padding: "0px"
  input:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px"
---

# Design System: WiseResume

## 1. Overview

**Creative North Star: "The Confident Edge"**

WiseResume's design system is built for people whose careers are on the line. The interface must feel sharper, more capable, and more trustworthy than anything a user has encountered from a job board or a resume template mill. Crimson is the identity anchor — not a highlight color, not a CTA button tint, but a deliberate statement of confidence. Every surface, every transition, every typographic decision should whisper: *you're already ahead*.

The system is inherently dual-mode. Dark mode is the primary workspace — deep near-black backgrounds with precise layering (`#0C0C0E` → `#161618` → `#1F1F23`) that creates hierarchy without shadow noise. Light mode is clean and airy, defaulting to soft cool-grays (`#F7F7F8`, `#F0F0F2`) that step back and let content lead. Motion is responsive and purposeful — never decorative, always a reply to user action.

This system explicitly rejects: the corporate blue density of job boards (LinkedIn, Indeed); the cold monochrome of developer-first SaaS (Notion, Linear); the cluttered low-trust feel of legacy resume template sites. Those registers communicate utility. WiseResume communicates *edge*.

**Key Characteristics:**
- Crimson as identity, used with restraint (≤15% of any screen surface)
- Deep tonal layering in dark mode; cool-gray lift in light mode
- Inter across all type roles — differentiated by weight and size, not by font pairing
- Rounded-xl (12px) as the default component radius; 16px for cards; full-pill for chips and badges
- Motion is state-responsive: ease-out-quart transitions, no bounce, no spring excess
- Touch-first sizing — all interactive targets minimum 44px

## 2. Colors: The Crimson Identity Palette

Two primary product identities sharing one neutral vocabulary. Crimson owns WiseResume. Blue owns WiseHire. Neither bleeds into the other.

### Primary
- **Confident Crimson** (`#9E1B22` / `hsl(357 71% 36%)`): The WiseResume brand identity. Used on primary buttons, focus rings, active states, sidebar accents, and key interactive affordances. Not used decoratively — every crimson pixel should be earning its presence.
- **Crimson Hover** (`#8A1720` / `~hsl(357 71% 31%)`): Hover and active state deepening of the primary. Never used at rest.

### Secondary
- **WiseHire Royal Blue** (`#1D4ED8` / `hsl(224 76% 48%)`): The WiseHire sub-product identity, applied via `data-product="wisehire"`. Swaps out everywhere `--primary` is consumed. Never used in WiseResume surfaces.
- **Slate Mist** (`hsl(215 20% 65%)` / approx `#8FA3B8`): Secondary UI elements, supporting chips, inactive states. Subdued and non-competing.

### Tertiary
- **Warm Amber** (`#F59E0B` / `hsl(38 92% 50%)`): Warning states and the accent token. Also carries motivational UI moments (achievement unlocks, completion indicators). Used sparingly.

### Neutral
- **Deep Ink** (`#14141A` / `hsl(240 6% 10%)`): Body text in light mode. Near-black with a cool-blue tint — never pure `#000000`.
- **Ink Muted** (approx `#6B7280` / `hsl(220 9% 46%)`): Secondary text, captions, metadata. Must always pass 4.5:1 against its background — never rely on the browser default gray.
- **Cool Surface Light** (`#F7F7F8` / `hsl(240 4% 97%)`): App-shell page background, light mode. Cool-leaning, not warm — intentionally distinct from any cream/paper register.
- **Elevated Surface Light** (`#F0F0F2` / `hsl(0 0% 94%)`): Card and muted surfaces in light mode.
- **Deep Base Dark** (`#0C0C0E` / `hsl(240 6% 5%)`): Page background, dark mode. Not pure black — retains subtle blue-gray character.
- **Surface Card Dark** (`#161618` / `hsl(240 3% 9%)`): Card and panel surface, dark mode.
- **Elevated Dark** (`#1F1F23` / `hsl(240 5% 13%)`): Popover, modal, elevated surfaces, dark mode.
- **Cool Border Light** (`#E3E5EC` / `hsl(220 13% 91%)`): Dividers and input strokes in light mode.
- **Deep Border Dark** (`#2A2A30` / `hsl(240 7% 18%)`): Dividers and input strokes in dark mode.

### Semantic
- **Success Green** (`#22C55E`), **Error Red** (`#EF4444`), **Info Blue** (`#3B82F6`) — standard semantic roles, consistent across themes.

### Landing Page Token System
The landing page (`.lp-root`) uses a separate CSS custom property layer registered with `@property` (typed CSS variables) that sits on top of the app token system. These tokens are **animatable** (CSS transitions work between values). Key roles:

**Core brand**
- **`--lp-brand`** (`@property <color>`): Primary CTA background. WiseResume: `#9E1B22`. WiseHire: `#1D4ED8`. Never use raw hex in component files.
- **`--lp-eyebrow`** (`@property <color>`): Brand accent for text, icons, focus rings. WiseResume dark: `#E53E3E` (brighter, legible on dark). WiseResume light: `#9E1B22`. WiseHire dark: `#3B82F6`. WiseHire light: `#1D4ED8`.
- **`--lp-hero-glow`** (`@property <color>`): Radial hero glow color. Crimson-tinted for WiseResume; blue-tinted for WiseHire.
- **`--lp-trust-icon`**: Trust badge and icon accent color.

**Surfaces & text**
- **`--lp-bg`**: Page background. Transparent in dark (aurora shows through); `rgba(255,245,245,0.62)` in WiseResume light; `rgba(240,245,255,0.62)` in WiseHire light.
- **`--lp-card` / `--lp-card-glass`**: Card surface and its glass tint.
- **`--lp-text` / `--lp-text-muted` / `--lp-text-subtle`**: Three text opacity steps, theme-responsive.
- **`--lp-border` / `--lp-border-card`**: Border alphas at the page and card level.
- **`--lp-section-alt` / `--lp-section-alt2`**: Alternating section backgrounds for subtle rhythm.
- **`--lp-ticker-edge`**: Edge-fade color for the feature ticker gradient. Must match the body `background-color` exactly — NOT `--lp-bg` (which is transparent in dark mode).

**Navigation**
- **`--lp-header-scrolled-bg` / `--lp-header-scrolled-border`**: Frosted header state after scroll threshold.
- **`--lp-nav-h`**: True outer height of the fixed nav bar (`4rem` mobile / `4.25rem` sm+, including `env(safe-area-inset-top)`). Used by sticky sub-headers to pin flush below the nav.
- **`--lp-header-h`**: Total hero top-padding anchor (nav height + breathing room). `4rem` mobile / `7.25rem` sm+.
- **`--lp-safe-top`**: `env(safe-area-inset-top)` declared once; all layout consumers read this alias.

**Interactive controls**
- **`--lp-toggle-bg` / `--lp-toggle-border` / `--lp-toggle-color`**: Theme-toggle button resting state.
- **`--lp-signin-bg` / `--lp-signin-border` / `--lp-signin-color`**: Sign-in button in unauthenticated state.
- **`--lp-logo-text`**: Brand wordmark text color.

**Brand pill / badge**
- **`--lp-brand-pill-bg` / `--lp-brand-pill-border` / `--lp-brand-pill-glow`**: The pill/badge chip component tokens. Alpha-based — product-identity-aware.

**Scroll-stack section**
- **`--lp-stack-section-bg`**: Ambient tinted background for the scroll-stack feature section.
- **`--lp-stack-glow` / `--lp-stack-bridge`**: Radial glow and hero→stack bridge gradient colors.
- **`--lp-stack-card-ring`**: 1px inset ring on stacked cards.
- **`--lp-stack-card-shadow`**: Multi-layer shadow on stacked cards (outer + brand glow + inset highlight).
- **`--lp-stack-pane-bg` / `--lp-stack-pane-border`**: Inner content pane tokens within stack cards.
- **`--lp-stack-gap`**: Inter-card distance (JS-driven; read by the hairline divider pseudo-element).

**WiseHire override** (`data-lp-product="wisehire"`): All `--lp-brand`, `--lp-eyebrow`, `--lp-hero-glow`, `--lp-stack-*`, `--lp-section-alt*` and `--lp-ticker-edge` tokens cascade to their WiseHire blue equivalents automatically. Never hardcode `#1D4ED8` or `#3B82F6` in component files — always reference `var(--lp-brand)` / `var(--lp-eyebrow)`.

### Named Rules
**The One Crimson Rule.** Crimson is the brand, not the accent. It appears on primary actions and active states only. If crimson is visible on more than 15% of the viewport at once, something is wrong. Its rarity is what makes it land.

**The Eyebrow Split Rule.** `--lp-eyebrow` is NOT the same hex in both themes. Dark mode brightens the crimson to `#E53E3E` (and WiseHire to `#3B82F6`) for contrast against dark backgrounds. Light mode uses `#9E1B22` / `#1D4ED8`. Always reference the token — never hardcode either value.

**The No Warm Neutral Rule.** This system's neutrals lean cool, not warm. The beige/cream/sand/paper family is prohibited. Cool-gray backgrounds (`#F7F7F8`, not `#FAF7F2`) signal precision and capability. Warmth is carried by imagery and the amber accent, not by surface color.

### Auth Shell Token Layer
The `AuthBold.tsx` component uses a self-contained CSS token scope for its custom design. These tokens are declared inline and do not inherit from the app's Tailwind theme:
- **`--bg`**: Page background (`#0b0b0d` dark / CSS-driven for light).
- **`--fg`**: Primary text (`#fafafa`).
- **`--sub`**: Muted secondary text (`#a1a1aa`).
- **`--pill-fg` / `--pill-bg` / `--pill-bd`**: Status pill chip tokens.
- **`--card-bg` / `--card-bd` / `--card-sh`**: Auth card surface, border, and shadow.
- **`--field-bg` / `--field-bd` / `--field-fg` / `--field-ph` / `--field-icon` / `--field-icon-on`**: Form field tokens at rest and focus-within states.
- **`--glow` / `--glow2`**: CTA button glow shadows.
- **`--stat-n` / `--stat-l`**: Stat counter number and label colors.
- **`--check-bd` / `--check-bg`**: Custom checkbox tokens.

## 3. Typography

**Display / Body Font:** Inter (system-ui fallback)
**Mono Font:** Fira Code (monospace fallback) — used in code snippets, resume field labels, and technical UI contexts.

**Character:** A single-family system differentiated entirely by weight and scale. Inter's geometric-humanist character reads as intelligent and direct — appropriate for a tool that works on your behalf. No display serifs, no decorative pairings. Clarity is the brand.

### Hierarchy
- **Display** (700 weight, `clamp(2rem, 5vw, 3.75rem)`, line-height 1, tracking -0.025em): Hero headlines, landing page primary headings only. Never used inside the app shell.
- **Headline** (600 weight, 1.875rem, line-height 1.2, tracking -0.02em): Page titles, modal headers, section anchors inside the app.
- **Title** (600 weight, 1.25rem, line-height 1.4, tracking -0.01em): Card headings, panel labels, sub-section titles.
- **Body** (400 weight, 1rem, line-height 1.5): All running prose. Cap line length at 65–75ch. Apply `text-wrap: pretty` on multi-line body blocks.
- **Label** (500 weight, 0.875rem, line-height 1.25): Form labels, nav items, button text, chips. Medium-weight keeps legibility at small sizes.
- **Mono** (Fira Code 400, 0.875rem, line-height 1.5): Resume field content preview, code blocks, ATS score readouts.

### Named Rules
**The Weight-First Rule.** Inter offers no design differentiation between sizes close together unless weight differs. Never pair two adjacent hierarchy levels at the same weight (e.g. a 600-weight Title immediately followed by a 600-weight body copy block). Drop to 400 or step up to 700 — contrast is the only lever available in a single-family system.

**The 16px Floor Rule.** No interactive input or body text below 16px on mobile. The browser default font size is respected; we never shrink below it for legibility on touch.

**The 12px Muted Floor Rule.** Metadata, captions, and label text using `text-muted-foreground` must be no smaller than `text-xs` (12px / 0.75rem). At 10–11px, `text-muted-foreground` on `bg-card` fails WCAG 1.4.3 (4.5:1) in both light and dark themes. `text-xs` at 500 weight is the proven minimum that passes. Avoid `text-[10px]` and `text-[11px]` on muted text entirely.

### Named Rules
**The Gradient-Text Exception.** The blanket prohibition on `background-clip: text` gradient applies to *typographic body and headline use* (AI slop). The landing page's `.lp-gradient-text` / `.wh-gradient-text` animated shimmer is an explicit brand moment on the hero typewriter word only — one element, one deliberate choice, gated on reduced-motion. Anywhere else: prohibited.

## 4. Elevation

WiseResume uses **soft ambient shadows** in light mode and **tonal background layering** as the primary elevation strategy in dark mode. Shadows are low-opacity, multi-layered, and never decorative.

In dark mode, depth is conveyed by surface color steps: `#0C0C0E` (page) → `#161618` (card) → `#1F1F23` (popover/modal) → white/crimson at maximum contrast. Shadows are effectively invisible on dark backgrounds and are therefore not load-bearing in dark mode.

In light mode, the shadow vocabulary is the structural signal:

### Shadow Vocabulary
- **soft-sm** (`0 1px 2px 0 rgb(0 0 0 / 0.04)`): Subtle lift for chips, badges, inline interactive elements.
- **soft** (`0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)`): Default card resting state.
- **soft-md** (`0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)`): Cards on hover, focused inputs.
- **soft-lg** (`0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)`): Dropdowns, popovers in light mode.
- **soft-xl** (`0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)`): Modals, dialogs in light mode.

### Scroll-Stack Card Elevation
The scroll-stack landing section uses an elevated card recipe distinct from the app-shell card:
- **Border-radius:** 28px (`rounded-card-stack`) — significantly rounder than the standard 16px to read as a "panel" floating in 3D space
- **Shadow:** three-layer — deep outer (`0 30px 60px -28px rgba(0,0,0,0.85)`) + brand-glow mid (`0 14px 36px -18px var(--lp-stack-glow)`) + inset 1px highlight — all driven by `--lp-stack-card-shadow`
- **No CSS transition on the card element itself** — intentional. The card is composited (`will-change: transform`); CSS transitions on paint properties on composited layers cause Chromium frame-paint mismatches at scroll speed. Theme transitions are handled by the parent `.lp-stack-section` wrapper and the View Transitions snapshot.

### Named Rules
**The Flat-at-Rest Rule.** Surfaces are flat by default. Shadows appear only as a response to elevation state (hover, focus, modal layer). A card at rest uses `shadow-soft`; the same card on hover steps to `shadow-soft-md`. Shadow escalation tracks user intent, not visual decoration.

**The Dark-Mode Tonal Rule.** In dark mode, reach for a darker/lighter background step before reaching for a shadow. If tonal contrast achieves the hierarchy, shadows are forbidden. The three-level step system (`#0C0C0E` → `#161618` → `#1F1F23`) is the entire elevation vocabulary in dark mode.

## 5. Components

### Buttons
Tactile and decisive. Every button has a minimum 44px tap target. Active state scales to 97% — a physical press without skeuomorphism.

- **Shape:** Rounded-xl (12px radius) default; rounded-lg (8px) for small/compact contexts; pill for chip-style actions
- **Primary:** Crimson background (`#9E1B22`) + white text, `shadow-soft` at rest, `shadow-soft-md` on hover, `bg-primary/90` on hover, `bg-primary/80` on active. `transition-all 200ms`
- **Hover / Focus:** Hover deepens the crimson. Focus shows a 2px crimson ring with 2px offset — never hidden, never styled away
- **Outline:** Transparent background, `border-border` stroke, muted hover fill. For secondary actions that shouldn't compete with the primary
- **Ghost:** No border, no background, muted hover fill. Navigation, icon-only actions, inline secondary controls
- **Destructive:** `bg-destructive` (red `#EF4444`), same shape and motion as primary
- **Disabled:** 50% opacity, pointer-events none — never change shape or color to signal disabled state

### Cards / Containers
- **Corner Style:** Rounded-2xl (16px) — slightly softer than buttons to distinguish container from action
- **Background:** `bg-card` token (light: `#F0F0F2`; dark: `#161618`)
- **Shadow Strategy:** `shadow-soft` at rest in light mode; no shadow in dark mode (tonal differentiation instead)
- **Border:** `border border-border` — always present, 1px, low-opacity. Never use border-left stripe accents
- **Score/State Accents:** Encode score or status via a full-width top bar (`h-1 w-full bg-primary`) or a very-low-opacity background tint (`bg-success/[0.04]`). Never a left-stripe `border-l-*`. The tint is invisible enough to read as a hint, not a decoration.
- **Internal Padding:** 24px (`p-6`) standard; header and footer 24px with 0 top padding on content

### Inputs / Fields
- **Style:** Rounded-xl (12px), `border-border` stroke, `bg-input` background (slightly elevated above page)
- **Focus:** 2px crimson ring (`focus-visible:ring-2 focus-visible:ring-primary`) with 2px offset. Border shifts to crimson on focus. `transition-all 200ms`
- **Placeholder:** `text-muted-foreground/60` — must pass 4.5:1 contrast. If it doesn't, use a darker muted value
- **Disabled:** 50% opacity, `cursor-not-allowed`
- **Error:** Border shifts to `--error` (red), ring to red. Never communicated by color alone — pair with an error message

### Navigation
- **App Shell (sidebar):** `bg-sidebar` surface (light: `#F0F0F2`; dark: `hsl(240 5% 9%)`). Active items use a crimson left-accent only as a 2px ring or background tint — not as a `border-left` stripe
- **Landing Header:** Transparent over the aurora/hero. On scroll: `--lp-header-scrolled-bg` (`rgba(10,10,15,0.9)` dark / `rgba(255,245,245,0.94)` light) + `backdrop-filter: blur(16px)` + 1px bottom border. Height token: `--lp-header-h` (4rem mobile / 7.25rem desktop including safe-area). View Transitions API (radial ripple clip-path) drives the WiseResume↔WiseHire product toggle
- **Product toggle:** Center-aligned in the header grid on sm+. Mobile shows below hero. Triggers `document.startViewTransition` with origin-anchored `clip-path: circle()` reveal. Duration 1s, `cubic-bezier(0.16, 1, 0.3, 1)` — the **only** allowed use of this easing; all other entrances use ease-out-quart
- **Mobile:** Bottom sheet pattern for contextual actions; sidebar collapses to overlay drawer

### Badge / Chip
- **Style:** Pill-shaped (full radius), `bg-muted` or semantic color at 15% opacity with matching text color. 500-weight label text, 12px font size
- **Variants:** Default (muted), Success (green), Warning (amber), Error (red), Info (blue), Plan tier (gold/blue)

### Metric Strip / Data Cards
When a grid of metric cards is required, each card **must** have a structurally unique data treatment — not identical icon + number + label. Established differentiators in this codebase:
- **Sparkline** (ATS trend): SVG polyline + fill area, fixed 0–100 scale, no axis labels
- **Activity bars** (tailored count): 7 equal-width columns, full-height on active days, 50% height on inactive — shows *when*, not just *how many*
- **Score distribution bar** (match quality): full-width pill segmented proportionally into `bg-success/70`, `bg-warning/60`, `bg-destructive/40` — encodes quality breakdown at a glance
- **Content chips** (saved jobs): up to 2 truncated job title lines — makes a bare count concrete and scannable

If adding a new metric card, choose the differentiator based on what *shape* the data has, not what looks good.

### Resume Preview (Signature Component)
The live resume preview panel is the product's hero component. It renders a scaled-down PDF-accurate representation of the user's document inside the editor. It sits on a `bg-background` canvas with a `shadow-soft-xl` drop and a subtle page-edge treatment. The preview must never compete with the editing surface — its border is `border-border`, its shadow is ambient, and its crimson appears only in the document content itself, not in the frame.

### Auth Shell (Signature Component)
The `AuthBold` auth screen is a full-viewport split layout: left hero panel (typewriter headline, stat counters, brand pill) + right form card. Key character: dark near-black canvas (`#0b0b0d`), crimson brand throughout, animated stat counters rolling up on mount, typewriter cursor in `#E53E3E`. The form card uses a distinct elevated recipe (`--card-sh`) with a three-layer shadow. Focus rings on all inputs shift the field border to `--lp-eyebrow` and the icon to `--field-icon-on`. The Scout SVG illustration follows pointer movement. Fully self-contained token scope — does not inherit from Tailwind's `hsl(var(--*))` system.

## 6. Do's and Don'ts

### Do:
- **Do** use crimson exclusively on primary CTAs, active/focus states, and brand moments. Its restraint is the brand signal.
- **Do** lean the neutrals cool (`#F7F7F8`, not `#FAF7F2`). Cool-gray signals tool-quality; warm-neutral signals AI-generated.
- **Do** step through tonal layers in dark mode (`#0C0C0E` → `#161618` → `#1F1F23`) instead of reaching for shadows.
- **Do** maintain 44px minimum tap targets on all interactive elements.
- **Do** apply `focus-visible:ring-2 focus-visible:ring-primary` on every interactive element in the app shell — focus rings are never optional. On the landing page, use `focus-visible:ring-[var(--lp-eyebrow)]` for WiseHire surfaces and `focus-visible:ring-[#9E1B22]` for WiseResume surfaces, always paired with `focus-visible:outline-none focus-visible:ring-offset-2`. This applies to **all** landing interactive elements including header auth buttons.
- **Do** use `var(--lp-brand)` and `var(--lp-eyebrow)` in all landing components — never hardcode `#9E1B22`, `#1D4ED8`, `#E53E3E`, or `#3B82F6` directly. The token layer is what makes the WiseResume↔WiseHire product switch work.
- **Do** use `loading="eager"` (or omit `loading`) on the LCP logo image in `LandingHeader`. `loading="lazy"` on the first-viewport image penalises Core Web Vitals.
- **Do** declare `env(safe-area-inset-top)` in exactly one place (`--lp-safe-top` in `.lp-root`). All layout consumers read the alias.
- **Do** use `transition-all duration-200 ease-out` as the default motion. Reach for `ease-out-quart` for entrances.
- **Do** pair body text with `text-wrap: pretty` on multi-line blocks to prevent orphans.
- **Do** let Inter's weight axis carry the typographic hierarchy — 400 / 500 / 600 / 700, differentiated by scale and context.
- **Do** cap body line length at 65–75ch in prose contexts.
- **Do** use `active:scale-[0.97]` on buttons for tactile press feedback.
- **Do** add `aria-live="polite" aria-atomic="false"` to regions that update asynchronously (score readouts, loading-to-value transitions). Without it, screen reader users are silent-updated.
- **Do** gate all `setInterval` / `setTimeout` / `requestAnimationFrame` animation loops on `useReducedMotion()` from Framer Motion (SSR-safe; never use raw `window.matchMedia('(prefers-reduced-motion)')`). When reduced motion is preferred: stop the loop entirely, skip to the final static state, and initialize state to final values. In Framer Motion `<motion.*>` elements, pass `initial={false}` (not `initial={{}}`) and `whileInView={undefined}` to fully disable entrance animation.
- **Do** use `[text-wrap:balance]` on short display headings (1–3 lines) to prevent single-word orphan lines at narrow viewports (320–375px).

### Don't:
- **Don't** use warm/beige/cream/sand/paper backgrounds (`#FAF7F2`, `--paper`, `--linen`, and all hue-40-100 near-whites). This is the single most visible AI-default tell. Prohibited.
- **Don't** use `border-left` greater than 1px as a colored stripe accent on cards or callouts. Replace with full borders, background tints, or leading icons.
- **Don't** use glassmorphism as decoration (blurs and glass cards without structural purpose). Rare and purposeful, or nothing.
- **Don't** use bounce or spring easing (`cubic-bezier` with overshoot, `spring()`, Framer Motion `type: 'spring'` including in variant transition objects). Ease-out only. The canonical ease-out-quart curve is `[0.22, 1, 0.36, 1]`. In Framer Motion variants, use `transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }` — the tuple cast is required to satisfy the `Easing` type. Button transitions use `duration: 0.18`; section-level entrance transitions use `duration: 0.45`.
- **Don't** build identical card grids (same icon + heading + text, repeated 3–6 times). Find the structural differentiator.
- **Don't** use Inter for both display and body at the same weight without a clear size step between them.
- **Don't** look like a job board (LinkedIn/Indeed): dense information, blue-heavy, no whitespace hierarchy, tables-first layout.
- **Don't** look like a cheap resume site: cluttered, aggressive upsell banners, visually dated shadows, dark-blue-on-white corporate pallor.
- **Don't** look like a minimalist developer SaaS (Notion/Linear aesthetic): cold, monochrome, too aloof for a product that touches people's livelihoods.
- **Don't** use `z-index: 999` or `z-index: 9999`. Use the semantic z-index scale: `editor-shell(40)` → `editor-header(50)` → `tooltip(55)` → `keyboard-toolbar(60)` → `ai-dialog(65)` → `toast(70)`. The landing stack layer uses `z-index: 4` for the sticky header — within bounds.
- **Don't** gate content visibility on animation class triggers — reveals must enhance an already-visible default, never hide content.
- **Don't** add CSS transitions on paint properties (background, box-shadow) to elements marked `will-change: transform`. This causes GPU layer thrashing. Apply transitions to a non-composited `::before` pseudo-element instead.
- **Don't** use gradient text (`background-clip: text` with a gradient) **except** the single `.lp-gradient-text` / `.wh-gradient-text` hero typewriter moment — one element, gated on reduced-motion. Everywhere else: prohibited.
- **Don't** use `type: 'spring'` in Framer Motion variants or transition objects. Use `ease: [0.22, 1, 0.36, 1] as [number, number, number, number]` (ease-out-quart). The one exception for View Transitions uses native CSS clip-path, not Framer Motion.
- **Don't** add extra top-level `@layer` sections or invent frontmatter token groups outside Stitch's schema (`colors`, `typography`, `rounded`, `spacing`, `components`). Motion, breakpoints, and shadows belong in `.impeccable/design.json`.
