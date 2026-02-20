

# Skill Tags Bubble Pop-In + Education Cards Fade-Up

## Overview

Add two CSS-only scroll-triggered animations to the public portfolio page, replacing the existing Framer Motion entrance animations on the Skills and Education sections with IntersectionObserver-driven CSS keyframe animations. This follows the same pattern already established for experience cards.

---

## ANIMATION 1: Skill Tags Bubble Pop-In

### CSS (`src/index.css`)

Add new keyframes and classes after the existing portfolio animation block:

```css
@keyframes pf-skill-pop {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

.pf-skill-tag {
  opacity: 0;
}
.pf-skill-tag.pf-skill-revealed {
  animation: pf-skill-pop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

Add reduced-motion overrides inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.pf-skill-tag {
  opacity: 1;
}
.pf-skill-tag.pf-skill-revealed {
  animation: none;
  opacity: 1;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

**SkillCloud component (lines 825-874):**

1. Remove Framer Motion entrance from the container: change `<motion.div variants={skillWave} initial="hidden" whileInView="visible" viewport={{ once: true }}>` to a plain `<div>` with a ref for the IntersectionObserver.
2. Change each `<motion.span variants={skillPill}>` to a plain `<span>` with the `pf-skill-tag` CSS class.
3. Add an IntersectionObserver ref on the container `<div>` (threshold: 0.2, rootMargin: '0px 0px -50px 0px'). When triggered:
   - Query all `.pf-skill-tag` children
   - Add `pf-skill-revealed` class with staggered `animationDelay: index * 40ms` (25ms on mobile via `window.innerWidth < 768` check)
   - Disconnect observer (once-only)
4. For the "Show more" expand: when `showMore` toggles from false to true, the newly visible tags (those without `pf-skill-revealed`) get the class added with stagger continuing from the last index. Use a `useEffect` watching `showMore` to handle this.

### Stagger on Expand Logic

When user taps "+N more" and `showMore` becomes true:
- After React renders the new tags, use a microtask (`requestAnimationFrame`) to find `.pf-skill-tag:not(.pf-skill-revealed)` elements inside the container
- Apply `pf-skill-revealed` with staggered delay starting from the count of already-revealed tags
- Use 25ms stagger on mobile, 40ms on desktop

---

## ANIMATION 2: Education Cards Fade-Up

### CSS (`src/index.css`)

Add new keyframes and class:

```css
@keyframes pf-edu-fade-up {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

.pf-edu-card {
  opacity: 0;
}
.pf-edu-card.pf-edu-revealed {
  animation: pf-edu-fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
```

Add reduced-motion overrides:

```css
.pf-edu-card {
  opacity: 1;
}
.pf-edu-card.pf-edu-revealed {
  animation: none;
  opacity: 1;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

**EducationCard component (line 577):**
- Remove Framer Motion entrance: change `<motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}>` to a plain `<div>` with the `pf-edu-card` CSS class.

**Education section (lines 1476-1485):**
- Add an IntersectionObserver ref on the `<div className="space-y-4">` container (threshold: 0.2, rootMargin: '0px 0px -50px 0px')
- When triggered, query child `.pf-edu-card` elements and add `pf-edu-revealed` with staggered `animationDelay: index * 120ms`
- Disconnect after triggering (once-only)

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add `pf-skill-pop` and `pf-edu-fade-up` keyframes, utility classes, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | SkillCloud: replace FM entrance with CSS classes + observer ref; handle expand stagger |
| `src/pages/PublicPortfolioPage.tsx` | EducationCard: replace FM entrance with `pf-edu-card` class |
| `src/pages/PublicPortfolioPage.tsx` | Education section container: add observer ref for staggered reveal |

No data, routing, or dependency changes. All GPU-accelerated (transform + opacity). Reduced-motion safe. Observers disconnected on unmount.
