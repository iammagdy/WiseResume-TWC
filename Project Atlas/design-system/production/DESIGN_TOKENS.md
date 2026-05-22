# Design Tokens

This file defines the production token contract for WiseResume and WiseHire.

The existing `colors_and_type.css` is the visual reference. In production, these tokens should be mapped to the app's real CSS variables and Tailwind theme.

---

## 1. Token principles

1. Use semantic names, not visual-only names.
2. Brand tokens must be separated from neutral and semantic tokens.
3. Product-specific tokens must be scoped by brand when needed.
4. Components should depend on semantic tokens, not hardcoded hex values.
5. New colors, shadows, or spacing values must be added here before use.

---

## 2. Brand color tokens

### WiseResume

| Token | Value | Usage |
|---|---:|---|
| `--wr-brand-primary` | `#9E1B22` | Primary CTA, active nav, focus ring, brand pill |
| `--wr-brand-primary-hover` | `#8E181F` | Hover on primary CTA |
| `--wr-brand-primary-active` | `#7A1218` | Pressed CTA |
| `--wr-brand-subtle` | `#FFF5F5` | Subtle crimson background |
| `--wr-brand-muted` | `#FEE2E2` | Light badges, panels |
| `--wr-brand-border` | `rgba(158, 27, 34, 0.22)` | Brand-tinted borders |
| `--wr-brand-glow` | `rgba(158, 27, 34, 0.25)` | CTA glow, hero glow |

### WiseHire

| Token | Value | Usage |
|---|---:|---|
| `--wh-brand-primary` | `#1D4ED8` | Primary CTA, active nav, focus ring |
| `--wh-brand-secondary` | `#3B82F6` | Gradients, highlights |
| `--wh-brand-primary-hover` | `#1E40AF` | Hover on primary CTA |
| `--wh-brand-primary-active` | `#1E3A8A` | Pressed CTA |
| `--wh-brand-subtle` | `#EFF6FF` | Subtle blue background |
| `--wh-brand-muted` | `#DBEAFE` | Light badges, panels |
| `--wh-brand-border` | `rgba(29, 78, 216, 0.22)` | Brand-tinted borders |
| `--wh-brand-glow` | `rgba(29, 78, 216, 0.25)` | CTA glow, hero glow |

---

## 3. Neutral tokens

| Token | Light | Dark | Usage |
|---|---:|---:|---|
| `--color-background` | `#FFFFFF` | `#0C0C0E` | Main app background |
| `--color-surface` | `#F7F7F8` | `#111114` | App shell surface |
| `--color-card` | `#FFFFFF` | `#161618` | Cards and panels |
| `--color-card-elevated` | `#FFFFFF` | `#1F1F23` | Dialogs, sheets, elevated panels |
| `--color-border` | `#E5E7EB` | `#2A2A30` | Default border |
| `--color-border-strong` | `#D1D5DB` | `#3A3A42` | Strong divider |
| `--color-text` | `#111827` | `#F9FAFB` | Main text |
| `--color-text-muted` | `#6B7280` | `#A1A1AA` | Secondary text |
| `--color-text-subtle` | `#9CA3AF` | `#71717A` | Captions, placeholders |

---

## 4. Semantic tokens

| Token | Value | Usage |
|---|---:|---|
| `--color-success` | `#22C55E` | Success messages, good score |
| `--color-warning` | `#F59E0B` | Warnings, medium score |
| `--color-error` | `#EF4444` | Errors, destructive states |
| `--color-info` | `#3B82F6` | Info banners, hints |

Semantic colors should not replace product brand colors. For example, WiseResume primary remains crimson even if an info banner uses blue.

---

## 5. Typography tokens

Typeface: Inter.

| Token | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| `--font-display-xl` | `clamp(2.5rem, 7vw, 5.5rem)` | 800 | 0.95 | Landing hero |
| `--font-display-lg` | `clamp(2rem, 5vw, 4rem)` | 800 | 1.0 | Major marketing headline |
| `--font-h1` | `2rem` | 700 | 1.15 | App page h1 |
| `--font-h2` | `1.5rem` | 600 | 1.2 | Section title |
| `--font-h3` | `1.25rem` | 600 | 1.25 | Card title |
| `--font-body` | `1rem` | 400 | 1.6 | Body copy |
| `--font-body-medium` | `1rem` | 500 | 1.5 | Important body text |
| `--font-small` | `0.875rem` | 400/500 | 1.45 | Helper text |
| `--font-caption` | `0.75rem` | 500 | 1.35 | Labels, badges |
| `--font-eyebrow` | `0.75rem` | 600 | 1.2 | Uppercase eyebrow |

### Typography rules

- Hero headings can be expressive.
- App UI should stay practical and readable.
- Do not use more than three text sizes in one card.
- Labels should be clear and short.
- Body copy should avoid long paragraphs inside app screens.

---

## 6. Spacing tokens

Use Tailwind's 4px grid.

| Token | Value | Tailwind | Usage |
|---|---:|---:|---|
| `--space-1` | `4px` | `1` | Tight gaps |
| `--space-2` | `8px` | `2` | Icon/text gap |
| `--space-3` | `12px` | `3` | Compact card internal gap |
| `--space-4` | `16px` | `4` | Default card padding |
| `--space-5` | `20px` | `5` | Larger internal padding |
| `--space-6` | `24px` | `6` | Card padding, section gap |
| `--space-8` | `32px` | `8` | Page section gap |
| `--space-10` | `40px` | `10` | Hero/card spacing |
| `--space-12` | `48px` | `12` | Major vertical rhythm |
| `--space-16` | `64px` | `16` | Desktop section spacing |

### Layout tokens

| Token | Value | Usage |
|---|---:|---|
| `--page-padding-mobile` | `12px` | Mobile page edge |
| `--page-padding-tablet` | `16px` | Tablet/app shell edge |
| `--page-padding-desktop` | `24px` | Desktop page edge |
| `--container-xl` | `1280px` | App container |
| `--container-2xl` | `1400px` | Wide app layouts |
| `--header-height` | `56px` | Top bar |
| `--sidebar-width` | `260px` | Desktop sidebar |
| `--bottom-nav-height` | `64px` | Mobile bottom nav |

---

## 7. Radius tokens

| Token | Value | Tailwind | Usage |
|---|---:|---:|---|
| `--radius-sm` | `8px` | `rounded-md` | Small chips, tooltips |
| `--radius-md` | `12px` | `rounded-lg` | Inputs, list items |
| `--radius-lg` | `16px` | `rounded-xl` | Buttons, sheets, AI cards |
| `--radius-xl` | `20px` | `rounded-2xl` | Cards, panels |
| `--radius-2xl` | `24px` | `rounded-3xl` | Hero panels |
| `--radius-full` | `9999px` | `rounded-full` | Pills, avatars |

Rule: no square corners in product UI.

---

## 8. Shadow tokens

| Token | Value | Usage |
|---|---|---|
| `--shadow-soft-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Small cards |
| `--shadow-soft` | `0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)` | Default cards |
| `--shadow-soft-md` | `0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)` | Elevated cards |
| `--shadow-soft-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)` | Dialogs, sheets |
| `--shadow-soft-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)` | Hero panels |
| `--shadow-glow-primary` | `0 4px 14px -2px hsl(var(--primary) / 0.25)` | Primary CTA |

Cards should use both border and soft shadow.

---

## 9. Motion tokens

| Token | Value | Usage |
|---|---:|---|
| `--motion-fast` | `150ms` | Hover, small feedback |
| `--motion-base` | `220ms` | Default UI transition |
| `--motion-slow` | `350ms` | Sheet/dialog entrance |
| `--motion-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default ease |
| `--motion-press-scale` | `0.97` | Button press |

### Reduced motion

If user has reduced motion enabled:

- Disable shimmer.
- Disable count-up animation.
- Disable typewriter animation.
- Replace large slide motion with opacity fade or no animation.

---

## 10. Z-index tokens

| Token | Value | Usage |
|---|---:|---|
| `--z-base` | `0` | Normal page content |
| `--z-sticky` | `20` | Sticky headers |
| `--z-dropdown` | `40` | Dropdown menus |
| `--z-drawer` | `50` | Mobile drawer |
| `--z-dialog` | `60` | Dialog/sheet |
| `--z-toast` | `70` | Toast notifications |

---

## 11. Tailwind mapping recommendation

Map product identity by route/shell:

```css
:root,
[data-product="wiseresume"] {
  --primary: 357 71% 36%;
  --primary-foreground: 0 0% 100%;
}

[data-product="wisehire"] {
  --primary: 224 76% 48%;
  --primary-foreground: 0 0% 100%;
}
```

Then components use `primary`, not `wr-brand-primary` or `wh-brand-primary` directly.

Example:

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Optimize Resume
</Button>
```

---

## 12. Token implementation checklist

Before applying to screens:

- [ ] Confirm current CSS variable names.
- [ ] Map design-system tokens to existing variables.
- [ ] Avoid duplicate variables with the same purpose.
- [ ] Test WiseResume route with crimson primary.
- [ ] Test WiseHire route with blue primary.
- [ ] Test light mode.
- [ ] Test dark mode if supported.
- [ ] Test mobile viewport.
- [ ] Confirm focus rings use product primary.
- [ ] Remove hardcoded one-off colors from app screens gradually.

---

## Interactive preview token source

The full package includes an interactive visual preview with its own token CSS file:

```txt
interactive-preview/assets/tokens.css
```

Before implementation, compare it with:

```txt
colors_and_type.css
DESIGN_TOKENS.md
```

Rules:

1. `DESIGN_TOKENS.md` is the production documentation source of truth.
2. `colors_and_type.css` is the portable CSS reference.
3. `interactive-preview/assets/tokens.css` is the visual preview reference.
4. If token names or values differ, document the difference before coding.
5. Production components should use semantic tokens such as `primary`, `background`, `card`, `border`, and `muted`, scoped by active product where needed.


## Font tokens

See `FONT_SYSTEM.md` for the complete font system. Core tokens:

```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-display: 'Inter', system-ui, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
```

Production should load Inter through `@fontsource/inter` once at app entry with weights `400`, `500`, `600`, `700`, and `800`. The design-system package intentionally does not include binary font files.
