# Public Page Navigation Stall - WebGL Aurora Fix

**Last verified:** 2026-05-14  
**Type:** stability fix  
**Sources:**
- `src/components/landing/AuroraLayer.tsx`
- `src/components/landing/AuroraBackground.tsx`
- `src/components/landing/Aurora.tsx`
- `src/pages/PricingPage.tsx`

**Canonical owner:** `src/components/landing/`

---

## Root cause

`/pricing` and similar public utility pages were not missing routes. They rendered correctly, but the animated WebGL Aurora background was also running on those pages. In Chromium, the page logged GPU `ReadPixels` stall warnings and the in-app browser could render `/pricing` while click execution timed out. The user-visible result was that Dashboard/pricing navigation appeared broken after the page loaded.

## Fix

- `AuroraLayer` now treats only `/` and `/enterprises` as true landing pages for WebGL Aurora.
- Public utility routes still receive the branded Aurora background layer, but force the CSS fallback:
  - `/pricing`
  - `/sign-in`
  - `/whats-new`
  - `/auth*`
  - `/p/*`
- `AuroraBackground` and `Aurora` expose `forceCssFallback` so the routing layer can disable WebGL without duplicating visual code.

## Current behavior

WebGL Aurora remains available on the real marketing landing pages. Utility pages use static CSS gradients so route navigation and button clicks are not blocked by GPU/main-thread stalls.

## Verification

- In-app browser loaded `http://localhost:5000/pricing`, clicked `Dashboard`, and reached `http://localhost:5000/dashboard`.
- Headless smoke showed `/pricing` renders with no fresh WebGL/GPU stall warnings.
- `npm exec tsc -- --noEmit` passed.
