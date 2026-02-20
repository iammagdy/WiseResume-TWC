
# Visual Career Timeline + Sticky Contact CTA

## Overview

Two high-impact features for the public portfolio page:
1. A vertical career timeline with scroll-draw animation alongside the Experience section
2. A persistent "Contact Me" floating pill button that appears when the hero scrolls out of view

---

## FEATURE 1: Visual Career Timeline with Scroll-Draw Animation

### Approach

The experience section (lines 1713-1736) currently renders `ExperienceCard` components inside a `<div className="space-y-4">`. We wrap this in a timeline container with a vertical line and per-card dots/connectors, all driven by the existing IntersectionObserver that already adds `pf-card-revealed`.

### Changes to `src/pages/PublicPortfolioPage.tsx`

**Experience section (lines 1714-1735):**

Replace the inner `<div className="space-y-4" ref={...}>` with a timeline-aware container:

```tsx
{hasExperience && (
  <motion.section variants={stagger} id="section-experience">
    <SectionHeader icon={<Briefcase className="w-5 h-5" />} title="Experience" style={pStyle} />
    <div className="pf-timeline-container relative" ref={(node) => {
      if (!node || node.dataset.observed) return;
      node.dataset.observed = 'true';
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('pf-timeline-drawn');
          node.querySelectorAll('.pf-exp-card').forEach((card, idx) => {
            (card as HTMLElement).style.animationDelay = `${idx * 100}ms`;
            card.classList.add('pf-card-revealed');
          });
          node.querySelectorAll('.pf-timeline-dot').forEach((dot, idx) => {
            (dot as HTMLElement).style.transitionDelay = `${idx * 100}ms`;
            dot.classList.add('pf-dot-visible');
          });
          obs.disconnect();
        }
      }, { threshold: 0.15 });
      obs.observe(node);
    }}>
      {/* Timeline vertical line */}
      <div className="pf-timeline-line" style={{ background: `linear-gradient(to bottom, var(--pf-accent, #ef4444), transparent)` }} />
      <div className="space-y-4 pl-11 md:pl-14">
        {resume.experience.map((exp, i) => (
          <div key={exp.id || i} className="relative">
            {/* Timeline dot */}
            <div className="pf-timeline-dot" style={{ background: 'var(--pf-accent, #ef4444)', borderColor: 'var(--pf-bg, #0a0a1a)' }} />
            {/* Horizontal connector */}
            <div className="pf-timeline-connector" style={{ background: 'var(--pf-accent, #ef4444)' }} />
            <ExperienceCard exp={exp} style={pStyle} isLast={i === resume.experience.length - 1} index={i} />
          </div>
        ))}
      </div>
    </div>
  </motion.section>
)}
```

Key points:
- The timeline line, dots, and connectors are new elements -- no existing card internals are changed.
- `ExperienceCard` receives identical props. "Show more"/"Show less" toggle is untouched.
- The padding-left (`pl-11` = 44px mobile, `md:pl-14` = 56px desktop) creates space for the timeline without affecting card width.

### CSS for Timeline (`src/index.css`)

```css
/* ─── Career Timeline ──────────────────────────────────────────────────────── */
.pf-timeline-line {
  position: absolute;
  left: 16px;
  top: 0;
  bottom: 0;
  width: 2px;
  transform-origin: top center;
  transform: scaleY(0);
  transition: transform 800ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pf-timeline-drawn .pf-timeline-line {
  transform: scaleY(1);
}
.pf-timeline-dot {
  position: absolute;
  left: -33px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  top: 24px;
  transform: scale(0);
  opacity: 0;
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 300ms ease;
  z-index: 1;
}
@media (min-width: 768px) {
  .pf-timeline-dot { left: -45px; }
}
.pf-timeline-dot.pf-dot-visible {
  transform: scale(1);
  opacity: 1;
}
.pf-timeline-connector {
  position: absolute;
  left: -23px;
  top: 28px;
  width: 16px;
  height: 2px;
  opacity: 0.5;
}
@media (min-width: 768px) {
  .pf-timeline-connector { left: -35px; width: 24px; }
}
```

Reduced-motion override:
```css
.pf-timeline-line {
  transform: scaleY(1);
  transition: none;
}
.pf-timeline-dot {
  transform: scale(1);
  opacity: 1;
  transition: none;
}
```

---

## FEATURE 2: "Contact Me" Sticky CTA Button

### Contact Target Resolution

Computed inside `PublicPortfolioContent` using existing profile data:

```typescript
const contactHref = useMemo(() => {
  if (profile.contactEmail) return `mailto:${profile.contactEmail}`;
  if (profile.linkedinUrl) return profile.linkedinUrl;
  return null;
}, [profile.contactEmail, profile.linkedinUrl]);
const contactIsExternal = !contactHref?.startsWith('mailto:');
```

Note: The current profile type has `contactEmail` and `linkedinUrl` but no WhatsApp/phone field. The resolution order is: email first, then LinkedIn. If neither exists, button is not rendered.

### Visibility Logic

A new state `ctaVisible` driven by:
1. The existing `stickyVisible` state (hero out of view = true) -- reuse directly instead of a new observer.
2. A scroll listener for the footer threshold (last 200px).

```typescript
const [nearFooter, setNearFooter] = useState(false);

useEffect(() => {
  const onScroll = () => {
    setNearFooter(window.scrollY + window.innerHeight >= document.body.scrollHeight - 200);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);

const ctaVisible = stickyVisible && !nearFooter && !!contactHref;
```

### Component Rendering

Inserted just before `<ChatWidget>` (line 1862):

```tsx
{contactHref && (
  <div
    className={`pf-contact-cta ${ctaVisible ? 'pf-contact-visible' : 'pf-contact-hidden'}`}
    style={{
      '--pf-cta-accent': accentColor,
      '--pf-cta-shadow-rgb': hexToRgb(accentColor),
    } as React.CSSProperties}
  >
    <a
      href={contactHref}
      target={contactIsExternal ? '_blank' : undefined}
      rel={contactIsExternal ? 'noopener noreferrer' : undefined}
      className="pf-contact-cta-inner"
    >
      <Mail className="w-4 h-4" />
      <span>Contact Me</span>
    </a>
  </div>
)}
```

A small `hexToRgb` helper converts the accent hex color to RGB for the box-shadow. If no valid hex, fall back to `239, 68, 68`.

### Chat Button Conflict

The ChatWidget floating button is at `bottom-6 right-4` (bottom: 24px, right: 16px). Its dimensions are 56px (w-14 h-14). To avoid overlap, the Contact CTA is positioned at:

```css
bottom: calc(80px + env(safe-area-inset-bottom)); /* 56px chat + 16px gap + 8px padding */
right: 20px;
```

This places it above the chat button with a visible gap. On desktop, `right: 32px`.

### CSS (`src/index.css`)

```css
/* ─── Contact CTA ──────────────────────────────────────────────────────────── */
.pf-contact-cta {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom));
  right: 20px;
  z-index: 35;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.6) translateY(20px);
  transition: opacity 200ms ease-in, transform 200ms ease-in;
}
@media (min-width: 768px) {
  .pf-contact-cta { right: 32px; }
}
.pf-contact-cta.pf-contact-visible {
  pointer-events: auto;
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: opacity 350ms cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pf-contact-cta-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 999px;
  background: var(--pf-cta-accent, #ef4444);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(var(--pf-cta-shadow-rgb, 239, 68, 68), 0.45);
  animation: pf-contact-pulse 5.2s ease-in-out infinite;
  transition: transform 150ms ease;
}
.pf-contact-cta-inner:active {
  transform: scale(0.95);
}

@keyframes pf-contact-pulse {
  0%    { box-shadow: 0 4px 20px rgba(var(--pf-cta-shadow-rgb), 0.45); }
  11.5% { box-shadow: 0 4px 40px rgba(var(--pf-cta-shadow-rgb), 0.80); }
  23%   { box-shadow: 0 4px 20px rgba(var(--pf-cta-shadow-rgb), 0.45); }
  100%  { box-shadow: 0 4px 20px rgba(var(--pf-cta-shadow-rgb), 0.45); }
}
```

Reduced-motion overrides:
```css
.pf-contact-cta {
  transition: opacity 200ms ease-in;
  transform: none;
}
.pf-contact-cta.pf-contact-visible {
  transition: opacity 200ms ease-out;
  transform: none;
}
.pf-contact-cta-inner {
  animation: none;
}
```

---

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Add timeline CSS (`.pf-timeline-line`, `.pf-timeline-dot`, `.pf-timeline-connector`), contact CTA CSS (`.pf-contact-cta`, `pf-contact-pulse` keyframe), reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Wrap experience cards in timeline container with line/dots/connectors; add `contactHref` memo + `nearFooter` scroll listener + Contact CTA element before ChatWidget; add `hexToRgb` helper |

No data fetching, routing, modal logic, or existing card content is changed. The "Show more" toggle, card hover lift, sticky header, and ChatWidget all remain untouched.
