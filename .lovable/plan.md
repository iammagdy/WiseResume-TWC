

# Cinematic Text Reveals: Bio Line Reveal + Experience Show More Unfold

## Overview

Two cinematic animation enhancements for the public portfolio page:
1. About bio text reveals line-by-line with a curtain-slide effect
2. Experience card "Show more" expands with a smooth unfold + word fade-in + chevron rotation

---

## ANIMATION 1: About Bio Line-by-Line Clip Reveal

### Approach

Since dynamically detecting rendered line breaks via `getClientRects()` is fragile across fonts and resizes, we use the **sentence-splitting** fallback as specified. Split the bio text by `. ` (period + space), wrapping each sentence in a clip container.

### CSS (`src/index.css`)

```css
/* Bio line reveal */
.pf-bio-line {
  overflow: hidden;
  display: block;
}
.pf-bio-line-inner {
  display: block;
  transform: translateY(100%);
  opacity: 0;
}
.pf-bio-line-inner.pf-bio-revealed {
  animation: pf-bio-line-up 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes pf-bio-line-up {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0%); opacity: 1; }
}
```

Reduced-motion override:
```css
.pf-bio-line-inner {
  transform: none;
  opacity: 1;
}
.pf-bio-line-inner.pf-bio-revealed {
  animation: none;
  opacity: 1;
  transform: none;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

**About section (lines 1410-1419):**

Replace the static `<p>` bio text with a new inline component `BioReveal`:

- Takes the bio string and splits it by sentences (`. ` delimiter). Each sentence becomes a `<span class="pf-bio-line"><span class="pf-bio-line-inner">sentence text</span></span>`.
- Uses `useRef` + `useEffect` with an `IntersectionObserver` (threshold: 0.3, rootMargin: '0px 0px -50px 0px') on the container.
- When triggered: iterates child `.pf-bio-line-inner` elements, adds `pf-bio-revealed` class with `animationDelay: index * 90ms`.
- Observer disconnects after triggering (once-only).
- Checks `prefers-reduced-motion` -- if enabled, sets all inner spans to revealed immediately with no animation.
- The `<p>` tag's existing `className="text-sm leading-loose"` and `style={{ color: 'var(--pf-muted, #9ca3af)' }}` are preserved on the outer container.

The `motion.section` wrapper with `bioFade` variant on the About section remains -- this provides the section-level entrance. The bio line reveal adds a finer-grained effect within it.

---

## ANIMATION 2: Experience Card "Show More" Smooth Unfold

### Current behavior

The "Show more" button toggles an `expanded` state. When expanded:
- Full description text is shown (instead of truncated 200 chars)
- All achievements are shown (instead of first 3)

The toggle button already has `ChevronDown` / `ChevronUp` icons.

### CSS (`src/index.css`)

```css
/* Experience card expand/collapse */
.pf-exp-expandable {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 400ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 350ms cubic-bezier(0.22, 1, 0.36, 1) 100ms;
}
.pf-exp-expandable.pf-exp-expanded {
  max-height: 1000px;
  opacity: 1;
}

/* Chevron rotation */
.pf-exp-chevron {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pf-exp-chevron.pf-exp-chevron-open {
  transform: rotate(180deg);
}

/* Show more label crossfade */
.pf-exp-label {
  transition: opacity 150ms ease;
}
```

Reduced-motion override:
```css
.pf-exp-expandable {
  transition: none;
  max-height: none;
  opacity: 1;
}
.pf-exp-chevron {
  transition: none;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

**ExperienceCard component (lines 483-565):**

The key change: instead of conditionally rendering the expanded content (which prevents CSS transitions), **always render both truncated and full content**, but wrap the "extra" content in a `<div className="pf-exp-expandable">` that uses max-height transition.

Restructure the card body:

1. **Always show** the truncated description (first 200 chars) as the base visible content.
2. Wrap the **remaining description text** (chars 200+) and the **achievements beyond the first 3** inside a `<div className={`pf-exp-expandable ${expanded ? 'pf-exp-expanded' : ''}`}>`.
3. The toggle button uses a single `ChevronDown` icon with class `pf-exp-chevron ${expanded ? 'pf-exp-chevron-open' : ''}` -- this replaces the current pattern of swapping between `ChevronDown` and `ChevronUp` components. The rotation handles the visual direction change.
4. The label text ("Show more" / "Show less") remains as-is since the swap is instant and the chevron rotation provides the visual continuity.

This approach:
- Preserves all existing toggle logic (the `expanded` state, `hasLongContent` check)
- Keeps the same data display rules
- Adds smooth unfold via CSS max-height transition
- Content fades in with 100ms delay after unfold starts
- Chevron smoothly rotates 180 degrees with spring easing

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add `pf-bio-line-up` keyframe, bio reveal classes, experience expand/collapse transitions, chevron rotation, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Add `BioReveal` inline component with sentence splitting + IntersectionObserver; restructure ExperienceCard body to use CSS max-height expand instead of conditional rendering; unify chevron to single rotating icon |

No data, routing, or dependency changes. All CSS transitions + minimal JS for the observer. Reduced-motion safe. Observer disconnected on trigger.

