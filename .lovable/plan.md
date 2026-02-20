

# Typewriter Fix + Ambient Hero Gradient

## Overview

Two changes to the public portfolio page (`/p/[username]`):
1. Rewrite the `TypewriterText` component to fix the mid-word cut bug and upgrade its visual quality
2. Add a slow-moving ambient gradient background layer behind the hero section

---

## ENHANCEMENT 1: Fix and Upgrade Typewriter

### Problem

The current `TypewriterText` (lines 103-155) has a state machine bug: it can start typing a new phrase before the previous one is fully deleted. The cursor uses a generic `pulse` animation that looks unintentional. The container has a fixed `h-6` which clips longer phrases on mobile.

### File: `src/pages/PublicPortfolioPage.tsx` (lines 103-155)

Replace the entire `TypewriterText` component with a clean state-machine implementation:

**State machine** using a single `phase` state: `'typing' | 'paused' | 'deleting' | 'waiting'`

- `typing`: append one character every 55ms until full phrase is shown, then switch to `paused`
- `paused`: wait 2000ms, then switch to `deleting`
- `deleting`: remove one character every 30ms until empty, then switch to `waiting`
- `waiting`: wait 400ms, advance `phraseIdx`, switch to `typing`

This ensures no new phrase starts until deletion is complete.

**Cursor**: Replace the thin `<span>` with a styled `|` pipe character. Use a new CSS class `pf-cursor-blink` with `@keyframes` blinking at 0.7s. While `phase === 'typing'` or `phase === 'deleting'`, add a class that sets `opacity: 1` (solid, no blink). When paused/waiting, the blink animation runs.

**Container**: Remove the fixed `h-6` class. Use `min-h-[1.5rem]` and `max-w-md` with natural text wrapping so long phrases wrap to 2 lines on mobile instead of clipping.

**Reduced motion**: Check `window.matchMedia('(prefers-reduced-motion: reduce)')` in a ref. If true, show the first phrase statically with no animation loop.

### File: `src/index.css`

Add cursor blink keyframes:

```css
@keyframes pf-cursor-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.pf-cursor {
  animation: pf-cursor-blink 0.7s step-end infinite;
}
.pf-cursor--typing {
  animation: none;
  opacity: 1;
}
```

Add reduced-motion override:
```css
@media (prefers-reduced-motion: reduce) {
  .pf-cursor { animation: none; opacity: 1; }
}
```

---

## ENHANCEMENT 2: Animated Ambient Hero Gradient

### File: `src/index.css`

Add a new keyframe for the ambient gradient shift:

```css
@keyframes pf-hero-gradient {
  0%   { background-position: 0% 50%; }
  25%  { background-position: 50% 0%; }
  50%  { background-position: 100% 50%; }
  75%  { background-position: 50% 100%; }
  100% { background-position: 0% 50%; }
}

.pf-hero-ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    #0a0a1a 0%,
    #0f1525 25%,
    #12101e 50%,
    #0d1520 75%,
    #0a0a1a 100%
  );
  background-size: 400% 400%;
  animation: pf-hero-gradient 12s linear infinite;
  will-change: background-position;
}
```

Add reduced-motion override:
```css
@media (prefers-reduced-motion: reduce) {
  .pf-hero-ambient { animation: none; background-position: 0% 50%; }
}
```

### File: `src/pages/PublicPortfolioPage.tsx` (line 1170-1172)

Inside the hero `<motion.div>` (which already has `className="relative ..."`), insert a new `<div>` as the first child:

```tsx
<div className="pf-hero-ambient rounded-2xl" aria-hidden="true" />
```

This sits behind all hero content because the hero already uses `relative` positioning, and all content elements (avatar, name, buttons) have higher z-index or natural stacking. The ambient div gets `z-index: 0` while content sits above it naturally. Add `z-10` to the hero content wrapper if needed to ensure stacking.

Only render this ambient div for dark themes (`pStyle !== 'classic-clean'`) since the classic-clean theme uses a white/light background where dark gradient tones would look wrong.

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add `pf-cursor-blink` keyframes + classes, `pf-hero-gradient` keyframes + `.pf-hero-ambient` class, reduced-motion overrides for both |
| `src/pages/PublicPortfolioPage.tsx` | Rewrite `TypewriterText` with proper state machine (lines 103-155); add ambient gradient div inside hero (line 1172) |

No backend, data, routing, or dependency changes. CSS-only gradient animation. JS state machine for typewriter is self-contained within the existing component. All reduced-motion safe.

