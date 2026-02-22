

# Fix Wise Orbit: Visual Quality and Animation Overhaul

## Problems Identified

1. **Mobile: Planets are completely static** -- they sit at fixed positions and never orbit the sun
2. **Mobile: Sun looks flat/cartoonish** -- simple CSS gradient with no depth or surface detail
3. **Mobile: No entrance animations** -- everything appears instantly with no visual flair
4. **Mobile: Orbit rings are barely visible** -- thin 6% opacity borders
5. **Desktop: Stars render as dark dots** -- the Milky Way background shader is too bright/gray, washing out the star points and inverting their appearance against the background
6. **Desktop: Background looks gray/washed out** -- the milky way shader outputs too much light, making the space background look muddy instead of dark

## Solution

Rewrite the mobile solar system with smooth CSS orbit animations and a much richer sun, and fix the desktop shaders so the background is properly dark with bright stars.

## Changes

### 1. `src/components/solar/MobileSolarSystem.tsx` -- Full rewrite

**Orbiting planets using CSS animations:**
- Each planet gets a wrapper div that uses `animation: orbit Xs linear infinite` (CSS transform rotate)
- The planet is offset from center using `translateX(radius)`, so the parent's rotation makes it orbit
- Different speeds per planet: WiseResume ~12s, PDF Tools ~18s, Finance ~25s
- Each starts at a different angle via `animation-delay` negative offset

**Improved sun with Canvas 2D rendering:**
- Replace flat CSS gradient with a Canvas 2D sun that draws:
  - Animated radial gradient core with shifting colors
  - Subtle noise-like surface texture using overlapping semi-transparent arcs
  - Animated outer corona glow rings that pulse
- Canvas runs at 30 FPS, shares the star animation loop
- Much more realistic and less "cartoonish"

**Entrance animations:**
- Header fades in with slight delay
- Sun scales in from 0
- Orbit rings fade in sequentially
- Planets fade in after their ring appears
- Bottom hint fades in last
- All using CSS `@keyframes` with `animation-delay` and `animation-fill-mode: both`

**Better orbit ring styling:**
- Slightly thicker rings with subtle gradient or dashed pattern
- Higher opacity (12-15% instead of 6%)
- Subtle glow effect on the unlocked orbit

### 2. `src/components/solar/shaders/milkyWay.glsl.ts` -- Fix background

The current shader outputs too much light, making the scene look gray. Changes:
- Reduce galactic plane brightness from 0.5 to 0.15
- Reduce bulge intensity from 0.5 to 0.2
- Make the base color darker (0.005 instead of 0.01)
- Reduce emission and reflection nebula brightness
- Overall: space should be predominantly dark with subtle hints of galaxy structure

### 3. `src/components/solar/DesktopSolarSystem.tsx` -- Minor fixes

- Increase star point size from 0.15 to 0.25 so they're visible against the dark background
- Increase star opacity from 0.8 to 1.0

### 4. `src/components/solar/SolarLoadingScreen.tsx` -- Polish

- Add subtle star twinkle dots in the background
- Smoother sun animation with scale + glow

### 5. `tailwind.config.ts` -- Add mobile orbit keyframes

Add new keyframes for the mobile orbit animations and entrance effects:
- `orbit-planet`: `0% { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg) } 100% { rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg) }` -- the counter-rotation keeps planet labels upright
- `fade-in-up-delay`: for staggered entrance

## Technical Details

### Mobile orbit technique (pure CSS, no JS animation needed):
```text
Container (centered)
  Orbit wrapper (absolute, centered, animation: rotate 12s linear infinite)
    Planet (offset via translateX, counter-rotate to stay upright)
```

This is GPU-accelerated (transform only), runs at 60fps with zero JS cost, and pauses automatically via `animation-play-state: paused` when tab is hidden.

### Performance budget:
- Canvas 2D starfield: 150 stars at 30 FPS (unchanged)
- Sun canvas: shares same animation loop, draws ~20 arcs per frame
- CSS orbit animations: GPU-composited transforms, near-zero CPU
- No new dependencies added

## Files Modified

| File | Change |
|------|--------|
| `src/components/solar/MobileSolarSystem.tsx` | Add orbiting planets, better sun, entrance animations |
| `src/components/solar/shaders/milkyWay.glsl.ts` | Darken background so stars are visible |
| `src/components/solar/DesktopSolarSystem.tsx` | Increase star size and opacity |
| `src/components/solar/SolarLoadingScreen.tsx` | Polish loading animation |
| `tailwind.config.ts` | Add orbit keyframes |

No new dependencies. No routing changes. No existing features affected.

