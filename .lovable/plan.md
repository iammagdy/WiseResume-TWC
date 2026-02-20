

# Hover & Interaction Animations for Portfolio Cards and Skill Tags

## Overview

Add pure CSS hover/active interaction states to Experience cards, Education cards, and Skill tags on the public portfolio page. No JavaScript changes needed -- all additions go into `src/index.css`.

---

## ANIMATION 1: Experience & Education Card Hover Lift

### CSS (`src/index.css`)

Add interaction styles for `.pf-exp-card` and `.pf-edu-card` after their existing animation blocks:

```css
/* Card hover lift */
.pf-exp-card,
.pf-edu-card {
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) {
  .pf-exp-card:hover,
  .pf-edu-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5),
                0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.pf-exp-card:active,
.pf-edu-card:active {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}
```

The `@media (hover: hover)` scoping ensures hover styles only apply on devices with a real pointer (desktop), preventing sticky hover on mobile. The `:active` state works on both desktop and mobile for press feedback.

The `transition` property is additive -- it handles the return to resting state automatically on mouse-leave. Existing box-shadow values set via inline `style` will be the base, and the hover/active states override with deeper shadows.

No JSX changes needed -- the classes `.pf-exp-card` and `.pf-edu-card` are already applied to the cards.

---

## ANIMATION 2: Skill Tags Hover Glow + Tap Bounce

### CSS (`src/index.css`)

Add a tap-bounce keyframe and interaction styles for `.pf-skill-tag`:

```css
/* Skill tag tap bounce */
@keyframes pf-tag-tap {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.88); }
  100% { transform: scale(1.05); }
}

/* Desktop hover glow */
@media (hover: hover) {
  .pf-skill-tag:hover {
    background: var(--pf-accent) !important;
    color: #fff !important;
    transform: scale(1.08);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--pf-accent) 40%, transparent);
    transition: all 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

/* Mobile tap bounce */
@media (hover: none) {
  .pf-skill-tag:active {
    animation: pf-tag-tap 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
}
```

Notes:
- Uses `!important` only on hover overrides to beat the inline `style` attributes for `background` and `color` that are set in JSX. This is the cleanest approach without restructuring the component.
- `@media (hover: none)` scopes the tap bounce to touch-only devices, preventing hover from sticking on mobile.
- The existing inline `transition: 'all 0.2s'` on the tags provides the base transition; the hover rule adds the specific easing.
- The `pf-tag-tap` keyframe ends at `scale(1.05)` -- the browser returns to `scale(1)` when `:active` is released because the animation is removed.

### Reduced Motion Overrides

Add to the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.pf-exp-card,
.pf-edu-card,
.pf-skill-tag {
  transition: none !important;
}
.pf-skill-tag:active {
  animation: none;
}
```

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add card hover lift transitions, skill tag hover glow + tap bounce keyframe, reduced-motion overrides |

No JSX changes required. All class names (`.pf-exp-card`, `.pf-edu-card`, `.pf-skill-tag`) already exist on the elements. Pure CSS additions only.

