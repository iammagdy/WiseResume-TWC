

# Wise Orbit: Solar System Landing Page

## Overview

A new full-screen "Wise Orbit" solar system landing page becomes the app's entry point at `/`. The current landing page moves to a new route and is accessed by clicking the "WiseResume" planet. No existing code is removed or broken.

## Architecture

**Routing change:**
- `/` -- New Wise Orbit solar system page
- `/home` -- Current landing page (moved here, code unchanged)
- Clicking the "WiseResume" planet navigates to `/home`

**Dual rendering:**
- Desktop (768px+): 3D WebGL scene using `@react-three/fiber` + `@react-three/drei`
- Mobile (<768px): Pure CSS + Canvas 2D (zero WebGL)

**Code splitting:** Desktop 3D bundle is lazy-loaded and never downloaded on mobile.

## New Dependencies

- `three` (peer dependency for react-three)
- `@react-three/fiber@^8.18.0` (React 18 compatible)
- `@react-three/drei@^9.122.0` (helpers)
- `@react-three/postprocessing@^2.16.0` (bloom, vignette)

## File Structure

```text
src/
  pages/
    Index.tsx              -- NEW: Wise Orbit (replaces current)
    HomePage.tsx           -- RENAMED from current Index.tsx (no code changes)
  components/
    solar/
      DesktopSolarSystem.tsx   -- 3D WebGL scene (lazy loaded)
      MobileSolarSystem.tsx    -- CSS + Canvas 2D version
      WiseAIModal.tsx          -- Dialog when tapping the sun
      SolarLoadingScreen.tsx   -- Loading fallback during lazy load
      shaders/
        sunVertex.glsl.ts      -- Sun vertex shader as string
        sunFragment.glsl.ts    -- Sun fragment shader as string
        milkyWay.glsl.ts       -- Background galaxy shader
        corona.glsl.ts         -- Corona material shader
```

## Planets Configuration

| Planet | Status | Action on Click |
|--------|--------|-----------------|
| WiseResume | Unlocked | Navigate to `/home` (current landing page) |
| PDF Tools | Locked | Toast: "Coming Soon" |
| Finance | Locked | Toast: "Coming Soon" |

Clicking the **Sun** opens the **Wise AI modal** (placeholder for future AI assistant).

## Detailed Changes

### 1. Rename current `Index.tsx` to `HomePage.tsx`

Copy the current `src/pages/Index.tsx` to `src/pages/HomePage.tsx` with zero code changes. The current landing page lives on untouched.

### 2. New `src/pages/Index.tsx` (Wise Orbit entry)

```tsx
import { lazy, Suspense } from 'react';
import { SolarLoadingScreen } from '@/components/solar/SolarLoadingScreen';

const DesktopSolarSystem = lazy(() => import('@/components/solar/DesktopSolarSystem'));
const MobileSolarSystem = lazy(() => import('@/components/solar/MobileSolarSystem'));

export default function Index() {
  const [isMobile, setIsMobile] = useState(false);
  // 768px breakpoint for mobile/desktop split
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <Suspense fallback={<SolarLoadingScreen />}>
      {isMobile ? <MobileSolarSystem /> : <DesktopSolarSystem />}
    </Suspense>
  );
}
```

### 3. Update `src/App.tsx` routing

- Add `/home` route pointing to `HomePage` (the old landing page)
- Keep `/` pointing to the new `Index` (Wise Orbit)
- `/home` stays public (no auth required)

### 4. `SolarLoadingScreen.tsx`

Full-screen dark background with animated sun loader and "Initializing universe..." text. Matches the space aesthetic.

### 5. `MobileSolarSystem.tsx` (Mobile, <768px)

- **Background**: Deep space gradient (CSS)
- **Starfield**: Canvas 2D, 150 stars, 30 FPS cap, pauses when tab hidden
- **Sun**: Layered CSS gradients with pulse animation, positioned center-top
- **Orbit rings**: CSS circles with planet buttons positioned on them
- **Planet buttons**: Tap triggers navigation or "Coming Soon" toast
- **Header overlay**: "WISE AI" branding top-left with the wise-ai-logo
- **Bottom hint**: "Tap the sun or planets to explore"
- **Wise AI Modal**: Opens on sun tap (Radix Dialog)

### 6. `DesktopSolarSystem.tsx` (Desktop, 768px+)

- **Canvas**: `@react-three/fiber` with `antialias: false`, DPR capped at [1, 1.5]
- **Sun**: Custom shader material with limb darkening, granulation noise, sunspots, 3 corona shells
- **Planets**: 3 orbiting spheres (WiseResume blue, PDF Tools gray/locked, Finance gray/locked)
- **Orbit rings**: Torus geometry, semi-transparent
- **Starfield**: 5000 point particles with spectral color distribution
- **Milky Way**: BackSide sphere with procedural galaxy shader
- **Asteroid belt**: 250 instanced icosahedrons
- **Post-processing**: Bloom + Vignette via `@react-three/postprocessing`
- **Camera**: OrbitControls with damping, fly-to animation on planet/sun click
- **Performance**: Frame throttling after 5s idle, Page Visibility API pause, `webglcontextlost` handling

### 7. `WiseAIModal.tsx`

Uses existing `Dialog` component from shadcn/ui. Shows:
- Animated avatar with pulsing rings and orbiting sparkles
- "WISE AI" title
- "The omniscient guide of your universe" subtitle
- Two feature cards (Navigate career, Intelligent suggestions)
- "Awakening Soon" status indicator

### 8. Tailwind config additions

New colors added to `tailwind.config.ts`:
- `space-deep`, `space-dark`, `space-medium`
- `sun-core`, `sun-mid`, `sun-edge`, `sun-corona`
- `sunPulse` keyframe animation

### 9. Vite config update

Add `three` to the manual chunks to keep the 3D bundle separate:
```js
if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three-scene';
```

## What is NOT changed

- All existing pages, components, hooks, stores, and contexts remain untouched
- Auth flow unchanged
- Protected routes unchanged
- AppShell, BottomTabBar, DesktopNav unchanged
- The current landing page content is preserved at `/home`

## Performance Guarantees

- Mobile loads zero WebGL/Three.js code (tree-shaken via lazy loading)
- Desktop DPR capped at 1.5, antialias off
- Frame throttling after 5s idle
- Page Visibility API pauses rendering
- Mobile canvas capped at 30 FPS
- All shader materials use `useMemo`
- 3D bundle code-split into separate chunk

