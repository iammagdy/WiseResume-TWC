
# Scroll-Triggered Animations for Public Portfolio

## Overview

Add two scroll-triggered CSS animations to the public portfolio page: an underline draw effect on section titles and staggered slide-in on experience cards. Both use IntersectionObserver (via a lightweight ref callback) and CSS keyframes only -- no Framer Motion for these new animations (existing Framer Motion usage stays untouched).

---

## ANIMATION 1: Section Title Underline Draw

### File: `src/index.css`

Add CSS keyframes and utility classes:

```css
/* Section title underline draw */
.pf-section-title {
  position: relative;
  display: inline-block;
}
.pf-section-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  height: 2px;
  width: 0%;
  background: var(--pf-accent, currentColor);
  transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1) 100ms;
}
.pf-section-title.title-revealed::after {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .pf-section-title::after {
    width: 100%;
    transition: none;
  }
}
```

### File: `src/pages/PublicPortfolioPage.tsx` (SectionHeader component, lines 423-462)

Add a ref callback using IntersectionObserver to each `<h2>` element inside SectionHeader:

- Create a small inline ref callback that observes the h2 element with `threshold: 0.5`
- When intersecting, add the `title-revealed` class and disconnect
- Add the `pf-section-title` class to each `<h2>` in all three style branches (minimal, bold-dark, classic-clean)
- Clean up observer on unmount via useEffect return

This applies consistently to ALL section titles (About, Experience, Skills, Education, Certifications, Case Studies, Services, Projects).

---

## ANIMATION 2: Experience Cards Staggered Slide-In

### File: `src/index.css`

Add keyframes for desktop (slide from left) and mobile (slide from bottom):

```css
@keyframes pf-card-slide-left {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes pf-card-slide-up {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}

.pf-exp-card {
  opacity: 0;
}
.pf-exp-card.pf-card-revealed {
  animation: pf-card-slide-up 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@media (min-width: 768px) {
  .pf-exp-card.pf-card-revealed {
    animation-name: pf-card-slide-left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pf-exp-card {
    opacity: 1;
  }
  .pf-exp-card.pf-card-revealed {
    animation: none;
    opacity: 1;
  }
}
```

### File: `src/pages/PublicPortfolioPage.tsx` (Experience section, lines 1358-1365)

Add an IntersectionObserver on the Experience section container (`<div className="space-y-4">`):

- Use a ref on the container div
- When intersecting (threshold: 0.15), query all child `.pf-exp-card` elements and add `pf-card-revealed` class with staggered `animation-delay: ${index * 100}ms`
- Disconnect after triggering (once-only)
- Clean up on unmount

### File: `src/pages/PublicPortfolioPage.tsx` (ExperienceCard, line 491-496)

Add the `pf-exp-card` class to the `<motion.div>` inside ExperienceCard. The existing Framer Motion `whileInView` animation on individual cards already handles per-card reveal -- we add the CSS class on top, so the stagger from the parent observer layers with it. Alternatively, since the existing FM animation conflicts, we can keep FM for the card's existing hover/transition behavior but let the CSS handle the entrance by removing `initial="hidden" whileInView="visible"` from the experience card's motion.div and replacing with the CSS approach.

**Decision**: To avoid double-animating, remove the Framer Motion `initial`/`whileInView`/`viewport` and `variants` props from the ExperienceCard's `<motion.div>` (lines 491-496). Replace with the CSS class approach. The `<motion.div>` can stay as a `<div>` or remain as `<motion.div>` for any existing hover transitions, but entrance animation will be purely CSS-driven via the parent observer.

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add `pf-section-title` + `::after` underline styles, `pf-card-slide-left/up` keyframes, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | SectionHeader: add `pf-section-title` class + IntersectionObserver ref to h2 elements |
| `src/pages/PublicPortfolioPage.tsx` | ExperienceCard: add `pf-exp-card` class, remove FM entrance variants |
| `src/pages/PublicPortfolioPage.tsx` | Experience section container: add observer ref for staggered card reveal |

No backend, data, routing, or dependency changes. All GPU-accelerated (transform + opacity). Reduced-motion safe. Observers properly disconnected.
