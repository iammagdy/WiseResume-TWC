

# "Open to Work" Availability Badge + Career Card Holographic Shimmer/Tilt

## Overview

Two visual enhancements for the public portfolio page:
1. An animated availability badge in the hero showing the user's custom availability text with a pulsing green dot
2. A holographic shimmer overlay + interactive 3D tilt on the Career Card preview

---

## FEATURE 1: Availability Badge in Hero

### Data Source

The `profile.availabilityHeadline` field is already loaded in `PublicPortfolioContent`. This is distinct from the existing "Active today" badge (which shows when `openToWork && isActiveWithin24h`). The new badge shows the user's custom availability text (e.g., "Available for freelance projects starting March").

### Placement

Insert directly after the "Active today" badge block (line ~1541) and before the location/industry row (line ~1544). It renders only when `profile.availabilityHeadline` is truthy and non-empty.

### Implementation (`src/pages/PublicPortfolioPage.tsx`)

```typescript
{profile.availabilityHeadline && (
  <div
    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-2.5 pf-availability-entrance"
    style={{
      background: 'rgba(34, 197, 94, 0.10)',
      border: '1px solid rgba(34, 197, 94, 0.25)',
      animationDelay: `${badgeDelay + 200}ms`,
      maxWidth: '85vw',
    }}
  >
    <span className="pf-availability-dot" />
    <span style={{
      color: '#86efac',
      fontSize: '0.8rem',
      fontWeight: 500,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {profile.availabilityHeadline}
    </span>
  </div>
)}
```

### CSS (`src/index.css`)

```css
/* Availability pulse dot */
@keyframes pf-availability-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); transform: scale(1); }
  50%      { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); transform: scale(1.1); }
}
.pf-availability-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pf-availability-pulse 1.8s ease-out infinite;
}

/* Availability badge entrance */
.pf-availability-entrance {
  opacity: 0;
  transform: scale(0.85);
  animation: pf-availability-enter 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes pf-availability-enter {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
```

Reduced-motion override:
```css
.pf-availability-dot { animation: none; }
.pf-availability-entrance { opacity: 1; transform: none; animation: none; }
```

---

## FEATURE 2: Holographic Shimmer + Tilt on Career Card

### Shimmer Overlay (`src/components/portfolio/CareerCardSheet.tsx`)

Add a shimmer overlay `<div>` inside the card preview wrapper (the `pf-card-flip-inner` div), after the card content div (line ~608), so it sits on top visually and flips with the card during style transitions.

```jsx
{/* Holographic shimmer overlay */}
<div
  className={`pf-holo-shimmer ${variant === 'clean' ? 'pf-holo-clean' : ''}`}
  style={{ borderRadius: 'inherit' }}
  aria-hidden="true"
/>
```

### Tilt Interaction (`src/components/portfolio/CareerCardSheet.tsx`)

Add mouse/touch event handlers to the `previewWrapperRef` container:

```typescript
const handlePointerMove = useCallback((clientX: number, clientY: number) => {
  const el = previewWrapperRef.current;
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = el.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width - 0.5;
  const y = (clientY - rect.top) / rect.height - 0.5;
  el.style.transform = `perspective(800px) rotateX(${-y * 24}deg) rotateY(${x * 24}deg)`;
  el.style.transition = 'transform 100ms ease-out';
}, []);

const handlePointerLeave = useCallback(() => {
  const el = previewWrapperRef.current;
  if (!el) return;
  el.style.transform = '';
  el.style.transition = 'transform 400ms ease-out';
}, []);
```

Attach these to the `previewWrapperRef` div:
- `onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}`
- `onMouseLeave={handlePointerLeave}`
- `onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}`
- `onTouchEnd={handlePointerLeave}`

The tilt applies to the outer wrapper, so both card content and shimmer overlay tilt as one unit.

### CSS (`src/index.css`)

```css
/* Holographic shimmer overlay */
@keyframes pf-holographic-shift {
  0%   { background-position: 0% 50%;   opacity: 0.6; }
  25%  { background-position: 100% 0%;  opacity: 1;   }
  50%  { background-position: 100% 100%; opacity: 0.7; }
  75%  { background-position: 0% 100%;  opacity: 1;   }
  100% { background-position: 0% 50%;   opacity: 0.6; }
}

.pf-holo-shimmer {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: screen;
  background: linear-gradient(
    125deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.03) 20%,
    rgba(120,80,255,0.08) 35%,
    rgba(0,200,255,0.10) 50%,
    rgba(120,80,255,0.08) 65%,
    rgba(255,255,255,0.03) 80%,
    rgba(255,255,255,0) 100%
  );
  background-size: 300% 300%;
  animation: pf-holographic-shift 6s ease-in-out infinite;
}

.pf-holo-clean {
  opacity: 0.6;
}
```

Reduced-motion override:
```css
.pf-holo-shimmer { animation: none; opacity: 0; }
```

---

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Add `pf-availability-pulse`, `pf-availability-enter` keyframes + classes, `pf-holographic-shift` keyframe + `.pf-holo-shimmer` class, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Insert availability badge after "Active today" block using `profile.availabilityHeadline`, with entrance animation delay based on existing `badgeDelay + 200` |
| `src/components/portfolio/CareerCardSheet.tsx` | Add holographic shimmer overlay div inside card preview, add tilt event handlers to `previewWrapperRef` container |

No data fetching, routing, modal logic, or download/share functionality is changed. The shimmer overlay uses `pointer-events: none` and flips with the card during style transitions.

