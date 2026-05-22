# Font System

This package intentionally does **not** include binary font files (`.woff`, `.woff2`, `.ttf`, `.otf`). The design system defines the font rules, loading strategy, tokens, and implementation snippets. Production should install/load the font through the app dependency layer.

## Typeface decision

WiseResume and WiseHire use **Inter** as the only product UI typeface.

| Role | Font family | Notes |
|---|---|---|
| Product UI | Inter | Buttons, nav, forms, cards, dashboards, editor UI, AI panels |
| Display / hero | Inter | Same family, heavier weights and tighter tracking |
| Body copy | Inter | Normal reading copy and descriptions |
| Numbers / metrics | Inter | Do not introduce a separate numeric font |
| Code / keyboard hints | System mono fallback | `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas` |

## Required weights

Use only these weights unless a specific component has an approved exception:

- `400` Regular — body copy, descriptions
- `500` Medium — labels, helper text, secondary buttons
- `600` Semibold — section titles, badges, strong UI labels
- `700` Bold — page titles, key metric labels
- `800` ExtraBold — landing hero / marketing display only

## Production loading rule

For the real React/Vite app, prefer self-hosting through `@fontsource/inter`.

```bash
npm install @fontsource/inter
```

Then import the required weights once in the app entry file, usually `src/main.tsx` or `src/main.ts`:

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
```

Do not import the same font weights repeatedly inside components.

## Preview loading rule

The static/interactive previews may use Google Fonts for convenience:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
```

This is acceptable for preview files only. The production app should use `@fontsource/inter` or the app's approved self-hosted font pipeline.

## CSS variables

The design system font variables are:

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Inter', system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
}
```

## Tailwind mapping

Add or verify this mapping in the Tailwind config:

```ts
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  display: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
}
```

Recommended usage:

- App body: `font-sans`
- Landing hero: `font-display font-extrabold tracking-tight`
- Code/kbd only: `font-mono`

## Type scale

| Token | Size / rule | Weight | Usage |
|---|---:|---:|---|
| Display 1 | `clamp(2.5rem, 9vw, 5.5rem)` | 800 | Landing hero |
| Display 2 | `clamp(2rem, 6vw, 4rem)` | 800 | Marketing section hero |
| H1 | `clamp(1.75rem, 4vw, 2.25rem)` | 700 | Page title |
| H2 | `1.5rem` | 600 | Main section title |
| H3 | `1.25rem` | 600 | Card/section title |
| H4 | `1.125rem` | 600 | Smaller group heading |
| Body large | `1.125rem` | 400 | Marketing descriptions |
| Body | `1rem` | 400 | Default text |
| Body small | `0.875rem` | 400/500 | Secondary copy |
| Caption | `0.75rem` | 500 | Captions, meta labels |
| Eyebrow | `0.8rem` | 600 | Uppercase section labels |

## Letter spacing

- Display: `-0.035em`
- H1/H2: `-0.02em` to `-0.025em`
- Body: normal
- Eyebrow: `0.12em`, uppercase

## Line height

- Display: `1.04` to `1.08`
- H1: `1.2`
- H2/H3: `1.3` to `1.35`
- Body: `1.6`
- Captions: `1.4`

## Arabic / multilingual fallback

The current WiseResume product language is English-first. If Arabic UI is added later, do not force Inter for Arabic paragraphs. Use a proper Arabic UI font fallback, for example:

```css
:root {
  --font-arabic: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui, sans-serif;
}

[dir='rtl'] body {
  font-family: var(--font-arabic);
}
```

Keep this as a future localization rule unless Arabic UI is actually implemented.

## Agent instructions

When an AI agent uses this design system:

1. Use Inter for product UI.
2. Do not invent new fonts.
3. Do not add decorative display fonts.
4. Do not use serif fonts in WiseResume or WiseHire product surfaces.
5. Do not add font files to the package.
6. In production, install/load Inter through the app dependency setup.
7. Keep font loading centralized in the app entry point or global stylesheet.
