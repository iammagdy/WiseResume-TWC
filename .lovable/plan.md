

# Career Card 3D Flip + Skill Tag Tap Bounce

## Overview

Two interaction animations for the public portfolio page:
1. A 3D card-flip transition when switching Career Card styles (Cosmic/Aurora/Clean)
2. An enhanced physical press-bounce on skill tags for mobile touch devices

---

## ANIMATION 1: Career Card 3D Flip Transition

### Approach

The Career Card preview currently swaps styles instantly when a variant button is tapped. We add a JS-driven flip sequence: apply "flipping-out" class (rotateY 0 to 90 deg over 220ms), swap the variant state at the midpoint, then apply "flipping-in" class (rotateY 90 to 0 deg over 220ms). The content swap happens at 90 degrees when the card is edge-on and invisible.

### CSS (`src/index.css`)

```css
/* Career Card 3D flip */
.pf-card-flip-container {
  perspective: 1000px;
  overflow: hidden;
}
.pf-card-flip-inner {
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

@keyframes pf-flip-out {
  from { transform: rotateY(0deg); opacity: 1; }
  to   { transform: rotateY(90deg); opacity: 0.6; }
}
@keyframes pf-flip-in {
  from { transform: rotateY(90deg); opacity: 0.6; }
  to   { transform: rotateY(0deg); opacity: 1; }
}

.pf-card-flip-inner.pf-flipping-out {
  animation: pf-flip-out 220ms ease-in forwards;
}
.pf-card-flip-inner.pf-flipping-in {
  animation: pf-flip-in 220ms ease-out forwards;
}
```

Reduced-motion override (add to existing block):
```css
.pf-card-flip-inner.pf-flipping-out,
.pf-card-flip-inner.pf-flipping-in {
  animation: none;
  transform: none;
  opacity: 1;
}
```

### JSX (`src/components/portfolio/CareerCardSheet.tsx`)

**Changes to CareerCardSheet component:**

1. Add a `ref` to the preview inner container and a `flipClass` state (`'' | 'pf-flipping-out' | 'pf-flipping-in'`).

2. Replace the direct `setVariant(v.id)` in the variant picker buttons with a new `handleVariantChange(newVariant)` function:
   ```typescript
   const handleVariantChange = useCallback((newVariant: CardVariant) => {
     if (newVariant === variant || flipClass) return; // skip if same or mid-flip
     const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     if (prefersReduced) { setVariant(newVariant); return; }
     setFlipClass('pf-flipping-out');
     setTimeout(() => {
       setVariant(newVariant);
       setFlipClass('pf-flipping-in');
       setTimeout(() => setFlipClass(''), 220);
     }, 220);
   }, [variant, flipClass]);
   ```

3. Wrap the existing preview container (the `<div ref={previewWrapperRef} ...>`) with `className="pf-card-flip-container"` on the outer wrapper, and add `pf-card-flip-inner ${flipClass}` to the inner scaled div.

4. Update variant picker button `onClick` from `setVariant(v.id)` to `handleVariantChange(v.id)`.

5. All download/share/LinkedIn buttons remain completely unchanged.

---

## ANIMATION 2: Skill Tag Tap Bounce (Enhanced)

### Approach

Replace the existing `pf-tag-tap` keyframe (which only scales) with the new `tag-press-bounce` keyframe that has a more physical feel, and add a parallel `tag-flash` background animation. The existing `@media (hover: none)` scoping is preserved. The existing desktop hover glow remains untouched.

### CSS (`src/index.css`)

Replace the existing `pf-tag-tap` keyframe and mobile active rule with:

```css
/* Skill tag press bounce (mobile) */
@keyframes pf-tag-press-bounce {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.87); }
  70%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes pf-tag-flash {
  0%   { background-color: color-mix(in srgb, var(--pf-accent) 12%, transparent); }
  40%  { background-color: var(--pf-accent); }
  100% { background-color: color-mix(in srgb, var(--pf-accent) 12%, transparent); }
}

@media (hover: none) {
  .pf-skill-tag:active {
    animation: pf-tag-press-bounce 320ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               pf-tag-flash 320ms ease forwards;
  }
}
```

Reduced-motion override (update existing):
```css
.pf-skill-tag:active {
  animation: none;
}
```

The old `pf-tag-tap` keyframe is removed and replaced by `pf-tag-press-bounce`.

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add 3D flip keyframes (`pf-flip-out`, `pf-flip-in`) + container classes; replace `pf-tag-tap` with `pf-tag-press-bounce` + `pf-tag-flash`; add reduced-motion overrides |
| `src/components/portfolio/CareerCardSheet.tsx` | Add `flipClass` state + `handleVariantChange` with 220ms sequenced flip; add `pf-card-flip-container` / `pf-card-flip-inner` classes to preview; update variant button onClick |

No data, routing, or dependency changes. All existing button handlers (download, share, LinkedIn) remain untouched. The flip is skipped entirely under `prefers-reduced-motion`.

