
# Performance Optimization Plan: Fix 5-Second Load Delays

## Problem Summary

Users are experiencing ~5-second delays:
1. **On initial page load** - App takes 5+ seconds to become interactive
2. **On any click/navigation** - Each interaction causes multi-second delays

## Root Causes Identified

### Issue 1: Heavy Framer Motion Usage on Initial Render
The landing page has **91 files using framer-motion** with complex animations running immediately:

- **SpaceBackground.tsx**: Creates 50 animated stars with `motion.div` + 3 shooting stars with complex keyframe animations running on mount
- **HeroSection.tsx**: 15+ motion elements with staggered delays, testimonial floating animations running continuously
- **LandingSkeletons.tsx**: Even the loading skeletons use motion for fade-ins

**Impact**: GPU-intensive animations start before content is visible, blocking main thread.

### Issue 2: All Landing Sections Use Lazy + Suspense
Looking at `Index.tsx`:
```typescript
const HeroSection = lazy(() => import('@/components/landing/HeroSection')...);
// Even the HERO is lazy-loaded!
```

The **hero section itself** is lazy-loaded, which means:
1. User sees `HeroSkeleton` 
2. JavaScript bundle for HeroSection downloads
3. Then HeroSection renders with its own animations

This creates a **double-loading effect** perceived as 5 seconds.

### Issue 3: Auth State Checking on Every Route
The `AuthContext` in App.tsx:
- Calls `supabase.auth.getSession()` on mount
- Sets up `onAuthStateChange` listener
- Both complete before `loading: false` allows rendering

Combined with React Query's hydration, this adds 500-1000ms.

### Issue 4: Zustand Store Hydration Blocking
Both stores use `persist`:
- `resume-storage` (resumeStore)
- `wiseresume-settings` (settingsStore)

LocalStorage reads are synchronous but parsing large JSON can take 100-200ms each on mobile.

### Issue 5: Template Thumbnails Render Full Templates
In `TemplateGallery.tsx`, each thumbnail:
- Renders a FULL template component (612×792px scaled down)
- 3 templates × full React component trees = expensive

### Issue 6: Navigation Delays (Click Response)
The `motion.layoutId="tab-indicator"` in BottomTabBar + every page having entry animations creates stacking delays when navigating.

---

## Solution Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    PERFORMANCE FIXES                         │
├─────────────────────────────────────────────────────────────┤
│  1. Static Hero (no lazy, no motion on critical path)       │
│  2. Simplified SpaceBackground (CSS only, no JS animations) │
│  3. Defer all non-critical animations                       │
│  4. Preload auth state before render                        │
│  5. Lazy template thumbnails (use static images)            │
│  6. Remove layout animations from navigation                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Part A: Optimize Landing Page (Index.tsx)

**File: `src/pages/Index.tsx`**

1. **Remove lazy loading from HeroSection** - Make it eagerly loaded since it's critical for LCP
2. Keep other sections lazy but with simpler skeletons

```tsx
// BEFORE: Lazy hero (slow)
const HeroSection = lazy(() => import(...));

// AFTER: Direct import (fast)
import { HeroSection } from '@/components/landing/HeroSection';
```

### Part B: Simplify SpaceBackground (CSS-based animations)

**File: `src/components/landing/SpaceBackground.tsx`**

Replace JavaScript-driven star animations with CSS:
- Use CSS `@keyframes` for star twinkling
- Remove shooting star JavaScript animations (use CSS or remove)
- Reduce star count from 50 to 25

```tsx
// Replace framer-motion with CSS classes
<div className="star star-twinkle" style={{ left: '10%', top: '20%' }} />
```

**File: `src/index.css`**

Add simple CSS star animations:
```css
@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.star-twinkle {
  animation: twinkle 3s ease-in-out infinite;
}
```

### Part C: Reduce HeroSection Animation Overhead

**File: `src/components/landing/HeroSection.tsx`**

1. Remove floating testimonial animations (keep static badges)
2. Remove continuous animations that run forever
3. Use `will-change: transform` for GPU acceleration
4. Add `motion.LazyMotion` with `domAnimation` for smaller bundle

```tsx
// BEFORE: Complex continuous animation
animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
transition={{ y: { duration: 4, repeat: Infinity } }}

// AFTER: Single entrance, no loop
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.3 }}
```

### Part D: Optimize Auth Context Loading

**File: `src/contexts/AuthContext.tsx`**

Add early session restoration from localStorage before Supabase call:
```tsx
// Initialize with cached session for instant UI
const [state, setState] = useState<AuthState>(() => {
  const cached = localStorage.getItem('sb-session-cache');
  if (cached) {
    const session = JSON.parse(cached);
    return { user: session?.user, session, loading: false };
  }
  return { user: null, session: null, loading: true };
});
```

### Part E: Replace Template Thumbnails with Static Previews

**File: `src/components/editor/TemplateThumbnail.tsx`**

Instead of rendering full template components, use static preview images:
```tsx
// Option 1: Use pregenerated images
<img 
  src={`/templates/${templateId}-preview.webp`} 
  alt={templateId}
  loading="lazy"
/>

// Option 2: Only render on demand (intersection observer)
const [shouldRender, setShouldRender] = useState(false);
// Only render full template when in viewport
```

### Part F: Remove Layout Animations from Navigation

**File: `src/components/layout/BottomTabBar.tsx`**

Remove `layoutId` which causes expensive layout calculations:
```tsx
// BEFORE: Layout animation on every nav
<motion.div layoutId="tab-indicator" ...

// AFTER: Simple CSS transition
<div className={cn('tab-indicator', active && 'tab-indicator-active')} />
```

### Part G: Defer Non-Critical Motion Imports

**File: `src/App.tsx`**

Use React 18's `startTransition` for non-critical updates:
```tsx
import { startTransition } from 'react';

// Wrap non-urgent state updates
startTransition(() => {
  setState(...);
});
```

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove lazy loading from HeroSection |
| `src/components/landing/SpaceBackground.tsx` | Replace JS animations with CSS |
| `src/components/landing/HeroSection.tsx` | Remove continuous animations, simplify entrance |
| `src/index.css` | Add CSS-only star/twinkle animations |
| `src/contexts/AuthContext.tsx` | Add session pre-hydration from localStorage |
| `src/components/editor/TemplateThumbnail.tsx` | Lazy-render templates only when visible |
| `src/components/layout/BottomTabBar.tsx` | Remove layoutId, use CSS transitions |
| `src/components/landing/LandingSkeletons.tsx` | Remove motion from skeletons |

---

## Expected Improvements

| Metric | Before | After (Estimated) |
|--------|--------|-------------------|
| Initial Load (LCP) | ~5s | ~1.5s |
| Time to Interactive | ~5s | ~2s |
| Navigation Delay | ~5s | ~200ms |
| Animation Frame Drops | High | Minimal |

---

## Testing Checklist

After implementation:
1. Open the landing page - should render hero instantly without skeleton flash
2. Scroll through landing page - animations should be smooth
3. Navigate to Dashboard - should be instant
4. Click "Launch Your Resume" - should navigate without delay
5. Switch between editor tabs - should be instant
6. Test on mobile device - should feel responsive

