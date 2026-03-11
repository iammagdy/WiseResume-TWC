# SkyWallpaper — Full Replication Prompt

> Give this entire document to your AI agent to recreate the exact same animated sky background used in WiseResume.

---

## Overview

A **fixed, full-viewport 3D animated sky background** that sits behind all page content (z-index 0). It features a cloud layer viewed from above with scroll parallax, mouse parallax, theme-aware colors, a film-grain noise overlay, and a slow fade-in on load.

**Two themes:**
- **Light mode:** Sky blue (`#0690d4`) with white clouds, no stars
- **Dark mode:** Near-black (`#111111`) with white clouds + 4000 stars

---

## Tech Stack (exact versions)

```json
{
  "react": "^18.3",
  "three": "^0.170.0",
  "@react-three/fiber": "^8.18.0",
  "@react-three/drei": "^9.122.0",
  "gsap": "^3.12.0",
  "@gsap/react": "^2.1.0"
}
```

---

## Architecture (2 files)

### File 1: `SkyWallpaper.tsx` — Outer wrapper (non-3D)

This is the **fixed-position container** that wraps the 3D canvas. It handles:

1. **Positioning:** `position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;`
2. **Background color:** Set inline as `backgroundColor: isDark ? '#111' : '#0690d4'`
3. **Theme transition:** GSAP animates `backgroundColor` over 1 second with `power2.inOut` easing when dark/light mode toggles
4. **Film-grain noise overlay:** Applied via inline CSS using an SVG data URI:
   ```css
   background-blend-mode: soft-light;
   background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
   background-repeat: repeat;
   background-size: 100px;
   ```
5. **Route exclusion:** Returns `null` on routes starting with `/p/`, `/share/`, `/l/`, or `/preview`
6. **Lazy loading:** The 3D canvas component is loaded via `React.lazy()` with `<Suspense fallback={null}>`
7. **Reduced motion:** Detected once at module level: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
8. **Dark mode detection:** Uses a `useIsDark()` hook that watches `document.documentElement.classList.contains('dark')` via MutationObserver

### File 2: `SkyWallpaperCanvas.tsx` — 3D scene (React Three Fiber)

This is the **heavy 3D component** lazy-loaded by the wrapper. It contains 4 sub-components:

---

#### Sub-component 1: `CameraSetup`

**Initial position:**
```
camera.position.set(0, 8, 12)
camera.lookAt(0, 0, 0)
FOV: 60
```

**Scroll parallax** (all devices):
- On scroll: `camera.position.y = 8 - (window.scrollY * 0.005)`
- After repositioning: `camera.lookAt(0, 0, 0)`
- Listener: `{ passive: true }`
- Disabled when `prefers-reduced-motion`

**Mouse parallax** (desktop only):
- Track normalized mouse: `x = (clientX / innerWidth - 0.5) * 2`, same for y
- In `useFrame`: `camera.rotation.y = lerp(current, -(mouseX * PI) / 90, 0.05)`
- Only horizontal rotation, vertical tilt preserved from lookAt
- Disabled on mobile or when `prefers-reduced-motion`

---

#### Sub-component 2: `CloudScene` (memoized)

Three `<Cloud>` components inside `<Clouds>` (from `@react-three/drei`):

```jsx
<group position={[0, 0, 0]}>
  <Clouds material={THREE.MeshBasicMaterial} frustumCulled={false}>
    <Cloud seed={1} segments={40} bounds={[15, 1, 8]} volume={6} color="white" fade={30} speed={0.2} growth={4} />
    <Cloud seed={2} segments={30} bounds={[12, 1, 6]} volume={5} color="white" fade={25} speed={0.15} growth={3} position={[5, 0, 2]} />
    <Cloud seed={3} segments={35} bounds={[10, 1, 7]} volume={5} color="white" fade={20} speed={0.18} growth={3} position={[-6, 0, 1]} />
  </Clouds>
</group>
```

**Key properties explained:**
- `material={THREE.MeshBasicMaterial}` — unlit, no shadows, pure white
- `frustumCulled={false}` — clouds always render even if partially off-screen
- `bounds={[width, height, depth]}` — height is always `1` (flat layer at Y=0)
- `volume` — cloud puffiness (5–6)
- `fade` — fade distance from camera (20–30)
- `speed` — gentle drift speed (0.15–0.2)
- `growth` — cloud growth animation factor (3–4)
- `seed` — deterministic shape per cloud (1, 2, 3)

---

#### Sub-component 3: `Stars` (from drei)

```jsx
<Stars
  radius={200}
  depth={60}
  count={isDark ? 4000 : 0}
  factor={6}
  saturation={0}
  fade
  speed={prefersReducedMotion ? 0 : 0.5}
/>
```

- **Only visible in dark mode** (`count=0` in light mode)
- White, unsaturated stars (`saturation={0}`)
- Slow rotation (`speed={0.5}`) unless reduced motion
- Large sphere radius (200) with depth 60

---

#### Sub-component 4: `LoadingFade`

Fades the entire canvas wrapper from `opacity: 0` to `opacity: 1` using GSAP:

```js
gsap.to(canvasWrapper, {
  opacity: 1,
  duration: 3,    // 3 second fade
  delay: 1,       // 1 second delay after load
  ease: 'power2.out',
});
```

- Triggered once when `useProgress().progress >= 100`
- Uses a ref flag to prevent re-triggering

---

## Canvas wrapper styling

The canvas wrapper (inner div) has conditional styling for mobile vs desktop:

```js
{
  position: 'absolute',
  inset: isMobile ? 0 : '1rem',           // Desktop: 1rem inset from edges
  width: isMobile ? '100%' : 'calc(100% - 2rem)',
  height: isMobile ? '100%' : 'calc(100% - 2rem)',
  opacity: 0,                              // Starts invisible, faded in
  borderRadius: isMobile ? 0 : '8px',     // Desktop: rounded corners
  overflow: 'hidden',
}
```

**Bottom shadow overlay** (inside canvas wrapper, above canvas):
```css
position: absolute;
inset: 0;
pointer-events: none;
z-index: 1;
background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.15) 100%);
```

---

## Canvas configuration

```jsx
<Canvas
  camera={{ position: [0, 8, 12], fov: 60 }}
  dpr={isMobile ? [1, 1] : [1, 1.5]}
  gl={{ antialias: false, alpha: true }}
  style={{ width: '100%', height: '100%' }}
/>
```

- **DPR:** Mobile gets `[1, 1]` (no scaling), desktop gets `[1, 1.5]`
- **Antialias:** Disabled for performance
- **Alpha:** Enabled so background color shows through

---

## Page content wrappers

Content pages wrap their children in a thin `<div className="relative min-h-full z-10">` (or `min-h-screen` for landing) to sit above the fixed background.

---

## Color reference

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `#0690d4` (Sky Blue) | `#111111` (Near Black) |
| Clouds | `white` | `white` |
| Stars | N/A (count=0) | White, unsaturated, 4000 count |
| Noise overlay | SVG fractalNoise, `soft-light` blend | Same |
| Bottom gradient | `transparent → rgba(0,0,0,0.15)` | Same |
| Theme transition | 1s GSAP `power2.inOut` | Same |

---

## Performance optimizations

1. **Lazy loading:** 3D canvas is `React.lazy()` imported, never blocks initial render
2. **Reduced motion:** All animations disabled when user prefers reduced motion
3. **Mobile:** Mouse parallax disabled, DPR capped at 1, no border-radius inset
4. **MeshBasicMaterial:** Unlit clouds = no lighting calculations
5. **No antialias:** Disabled on canvas for GPU savings
6. **Memoized cloud scene:** `React.memo` prevents unnecessary re-renders
7. **Passive event listeners:** Scroll and mousemove use `{ passive: true }`

---

## Reference assets

Static captures of this background are available in the same folder:
- `sky-light.jpg` — 1920×1080 light mode screenshot
- `sky-dark.jpg` — 1920×1080 dark mode screenshot
- `sky-light.mp4` — 5s loop light mode video
- `sky-dark.mp4` — 5s loop dark mode video
