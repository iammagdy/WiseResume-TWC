

# Animated Splash Screen on First Launch

## Overview
Add a fullscreen animated splash screen that plays once -- the very first time a user opens the app. It shows the WiseResume logo with entrance animations (scale, glow, tagline reveal), then auto-dismisses after ~3 seconds. Subsequent visits skip it entirely using a persisted flag in the settings store.

## How It Works

1. A new `hasSeenSplash` flag in the Zustand settings store (persisted to localStorage) tracks whether the user has seen the splash
2. The `AppRoutes` component checks this flag before rendering routes
3. If `hasSeenSplash` is false, it renders the `AnimatedSplash` component instead of routes
4. After the animation completes (~3s), it sets the flag to true and fades out, revealing the app

## Animation Sequence (3 seconds total)

| Time | Animation |
|------|-----------|
| 0-0.6s | Logo scales in from 0.5 to 1 with spring physics + glow pulse |
| 0.6-1.2s | "WiseResume" text fades up with gradient shimmer |
| 1.2-1.8s | "Your AI Career Partner" tagline fades in |
| 1.8-2.5s | Hold |
| 2.5-3.0s | Everything fades out and scales up slightly (exit) |

## Files to Create/Modify

### 1. New: `src/components/AnimatedSplash.tsx`
- Full-screen component with dark background matching `--background`
- Uses `framer-motion` for all animations (already installed)
- Renders `AppIcon` (the logo image) with scale + opacity spring animation
- "WiseResume" gradient text with staggered fade-up
- Tagline with delayed fade-in
- Pulsing glow ring behind the logo
- Calls `onComplete()` callback after animation finishes
- Respects `prefers-reduced-motion` -- if enabled, shows static splash for 1s then dismisses

### 2. Modify: `src/store/settingsStore.ts`
- Add `hasSeenSplash: boolean` to state interface (default: `false`)
- Add `setHasSeenSplash: (value: boolean) => void` action
- Add to `defaultSettings`

### 3. Modify: `src/App.tsx` (AppRoutes component)
- Import `AnimatedSplash` and `hasSeenSplash` from settings store
- Before the biometric lock check, add splash check:
  - If `!hasSeenSplash`, render `AnimatedSplash` with `onComplete` that calls `setHasSeenSplash(true)`
  - Otherwise render routes as normal

## Technical Details

- **No lazy loading** for AnimatedSplash -- it's small and must render instantly on first load
- **Native Capacitor**: The native splash screen (from `@capacitor/splash-screen`) hides via the existing `hideSplashScreen()` in AuthContext. The animated React splash plays after that, creating a seamless transition from native splash to animated splash to app
- **Reset**: Users can re-trigger it from Settings via the existing "Replay Onboarding" button (extend it to also reset `hasSeenSplash`)
- **Performance**: No heavy assets -- just the existing logo PNG + CSS/Framer Motion animations
- **Touch target**: Tap anywhere to skip (with haptic feedback)

