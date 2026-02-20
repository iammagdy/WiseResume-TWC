
# Animated Stats Strip + Section Quick-Nav Pills

## Overview

Two new UI features inserted between the hero and the body content on the public portfolio page:
1. A "highlights strip" showing 3 animated stat counters (years experience, roles held, skills count)
2. A horizontally scrollable row of section navigation pills for mobile quick-jump

---

## FEATURE 1: Animated Number Counter -- Key Stats Strip

### Data Calculation

Using the existing `resume` and `allSkills` data already computed in `PublicPortfolioContent`:

- **Years Experience**: `new Date().getFullYear() - Math.min(...resume.experience.map(e => parseInt(e.startDate)))` -- parse year from the `startDate` string (format varies: "Jan 2018", "2018-01", "01/2018"). Use the existing `parseResumeDate` utility from `@/lib/dateUtils` to extract years. If no valid year found or experience is empty, hide this card.
- **Roles Held**: `resume.experience.length` -- hide if 0.
- **Skills**: `allSkills.length` -- hide if 0.

### New Component: `StatsStrip`

A standalone function component defined inside `PublicPortfolioPage.tsx`:

```typescript
function StatsStrip({ experience, skillCount, accentColor }: {
  experience: Experience[];
  skillCount: number;
  accentColor: string;
}) { ... }
```

- Computes the 3 stats, filtering out any that are 0/NaN/invalid.
- If no valid stats remain, returns `null`.
- Uses a single `ref` + `IntersectionObserver` (threshold: 0.5, once) to trigger the count-up.
- Each stat uses `requestAnimationFrame` with ease-out timing (deceleration curve: `1 - (1 - t)^3` where `t = elapsed / 1800`).
- Stagger: card index * 200ms delay before starting the rAF loop.
- `prefers-reduced-motion`: skip animation, show final number immediately.
- Observer disconnects after trigger.
- Cleanup on unmount via `useEffect` return.

### Visual Styling

- The strip is a full-width container with the same card background (`var(--pf-card)`), rounded corners, and border as experience cards.
- 3 columns using CSS grid: `grid-template-columns: 1fr 1fr 1fr`.
- Vertical dividers: each middle column gets `border-left: 1px solid var(--pf-border)`.
- Number: `font-size: 2rem`, `font-weight: 800`, `color: var(--pf-accent)`.
- Label: `font-size: 0.75rem`, `color: var(--pf-muted)`, centered below the number.
- The strip itself fades up: starts at `opacity: 0; transform: translateY(30px)`, transitions to `opacity: 1; transform: translateY(0)` over 500ms, triggered by the same IntersectionObserver.

### CSS (`src/index.css`)

```css
.pf-stats-strip {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 500ms ease, transform 500ms ease;
}
.pf-stats-strip.pf-stats-visible {
  opacity: 1;
  transform: translateY(0);
}
```

Reduced-motion override:
```css
.pf-stats-strip {
  opacity: 1;
  transform: none;
  transition: none;
}
```

### Placement

Inserted between the hero `</motion.div>` (line 1468) and the body content `<div>` (line 1471). This is a new element -- no existing elements are modified.

---

## FEATURE 2: Section Quick-Nav Pills (Mobile)

### New Component: `SectionNav`

A standalone function component defined inside `PublicPortfolioPage.tsx`:

```typescript
function SectionNav({ sections, accentColor, stickyHeaderHeight }: {
  sections: { id: string; label: string }[];
  accentColor: string;
  stickyHeaderHeight: number;
}) { ... }
```

- **Visible sections**: Receives a pre-filtered list of sections that have data (computed in the parent using the existing `hasExperience`, `hasEducation`, etc. booleans). Each entry has an `id` (matching `section-about`, `section-experience`, etc.) and a `label`.
- **Layout**: `overflow-x: auto`, horizontal scroll, hidden scrollbar. Each pill is `display: inline-flex`, `border-radius: 9999px`, `white-space: nowrap`.
- **Active tracking**: A `useEffect` sets up an `IntersectionObserver` on each section element by ID. Threshold: ~0.2, rootMargin: `-30% 0px -70% 0px` (so the section heading must be in the top 30%). When a section enters, its ID is set as the active pill.
- **Tap behavior**: `scrollIntoView({ behavior: 'smooth', block: 'start' })` on the target section. For reduced-motion: `behavior: 'auto'`.
- **Offset**: Since there is a sticky header (~48px) and the nav pill row itself is sticky, offset is handled by adding a `scroll-margin-top` CSS property to each section element. This avoids complex JS offset calculation.
- **Sticky positioning**: `position: sticky; top: 48px; z-index: 40;` (just below the sticky header at z-50). Background matches the page background with blur for depth.
- **Desktop hidden**: Wrapped in a container with `className` that includes the Tailwind class `md:hidden`.
- **Pill styling**:
  - Default: `background: var(--pf-card)`, `color: var(--pf-muted)`, `border: 1px solid var(--pf-border)`
  - Active: `background: accentColor`, `color: #fff`
- All observers disconnect on unmount.

### CSS (`src/index.css`)

```css
.pf-nav-pills {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.pf-nav-pills::-webkit-scrollbar {
  display: none;
}
```

Add `scroll-margin-top` to section elements:
```css
[id^="section-"] {
  scroll-margin-top: 100px; /* sticky header + nav pills height */
}
```

### Placement

Inserted right after `StatsStrip`, before the body content `<div>`. If stats strip has no data and returns null, the nav pills still render in the same position.

### Section ID Setup

The About section currently lacks an `id` attribute. Add `id="section-about"` to it. Other sections already have IDs (`section-experience`, `section-skills`, `section-education`, `section-projects`, `section-case-studies`, `section-services`).

---

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Add `.pf-stats-strip` fade-up transition, `.pf-nav-pills` scrollbar-hidden, `[id^="section-"]` scroll-margin-top, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Add `StatsStrip` component (count-up + IntersectionObserver), add `SectionNav` component (sticky pills + active tracking), insert both between hero and body content, add `id="section-about"` to About section |

No data fetching, routing, or dependency changes. All data is derived from the existing `resume` and `profile` objects already in scope.
