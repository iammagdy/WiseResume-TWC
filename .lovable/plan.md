

# Hero Section Entrance Animations

## Overview

Add four CSS-only entrance animations to the public portfolio hero: job title badge bounce-in, CTA buttons staggered slide-up, location/tagline fade-in, and corresponding keyframes. All delays are computed dynamically based on the name length to sequence after the existing (or future) name reveal.

---

## CSS Keyframes (src/index.css)

Append three new keyframes and utility classes after the existing portfolio animations block:

```css
/* Hero entrance animations */
@keyframes pf-badge-in {
  from { opacity: 0; transform: translateY(16px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pf-cta-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pf-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.pf-badge-entrance {
  opacity: 0;
  animation: pf-badge-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.pf-cta-entrance {
  opacity: 0;
  animation: pf-cta-in 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.pf-fade-entrance {
  opacity: 0;
  animation: pf-fade-in 500ms ease-out forwards;
}
```

Add reduced-motion overrides in the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.pf-badge-entrance,
.pf-cta-entrance,
.pf-fade-entrance {
  animation: none;
  opacity: 1;
}
```

---

## JSX Changes (src/pages/PublicPortfolioPage.tsx)

### Compute base delay

Near the hero render (around line 1194), compute `nameLen` from the profile name and derive delays:

```tsx
const nameLen = (profile.fullName || 'Anonymous').length;
const badgeDelay = nameLen * 35 + 200 + 100; // ms
const locationDelay = badgeDelay + 200;
const ctaBaseDelay = badgeDelay + 150;
```

### 1. Role pill row (lines 1200-1217)

Add `pf-badge-entrance` class and computed `animationDelay` to the wrapper `<div>`:

```tsx
<div className="flex items-center justify-center gap-2.5 flex-wrap mb-3 pf-badge-entrance"
     style={{ animationDelay: `${badgeDelay}ms` }}>
```

This animates both the job title pill and the "Open to Work" badge together as one group.

### 2. Location + industry line (lines 1241-1256)

Add `pf-fade-entrance` class and delay:

```tsx
<div className="flex items-center justify-center gap-3 mb-3 flex-wrap pf-fade-entrance"
     style={{ animationDelay: `${locationDelay}ms` }}>
```

### 3. Typewriter tagline (lines 1258-1264)

Wrap the typewriter output in a span with the same fade class and delay so it fades in together with the location:

The typewriter component renders conditionally via an IIFE. Add `pf-fade-entrance` with `animationDelay: locationDelay` to the wrapper.

### 4. Social icon buttons (lines 1267-1301)

Each social link (`<a>`) gets `pf-cta-entrance` class with staggered delay. The social icons animate first (index 0, 1, 2, 3), so their base delay is `ctaBaseDelay + index * 120`.

Apply to the container div and each child link individually for proper stagger, or apply at the container level for simplicity. For true per-icon stagger, add the class to each `<a>` with inline `animationDelay`.

### 5. CTA buttons row (lines 1305-1344)

Each button/link gets `pf-cta-entrance` class. Their indices continue after the social icons. Since the number of social icons varies, compute the offset: count the social links rendered, then continue staggering.

For simplicity: assign a counter variable starting from 0 for all social icons + CTA buttons combined. Social icons get indices 0-3 (depending on how many exist), then "Get in Touch" / "View Projects" / "Share Card" / "Download CV" follow.

Implementation approach: use a mutable counter `let ctaIdx = 0` before the social icons render. Each social `<a>` gets `style={{ animationDelay: ctaBaseDelay + (ctaIdx++) * 120 + 'ms' }}` and each CTA button similarly.

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add 3 keyframes (`pf-badge-in`, `pf-cta-in`, `pf-fade-in`) + 3 utility classes + reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Compute delay vars from name length; add entrance classes + inline `animationDelay` to badge row, location row, typewriter, social icons, and CTA buttons |

No layout, color, font, or logic changes. All GPU-accelerated (transform + opacity). Reduced-motion safe. Runs once on mount via CSS `forwards` fill mode.
