

# Mobile Performance and Responsiveness QA Setup

## Overview
Add documentation, a Web Vitals helper, and wire it into the app entry point -- no business logic changes.

## Changes

### 1. Create `docs/perf-checklist.md`
A release-ready QA checklist covering:
- Device widths to test: 320, 360, 375, 390, 414, 768 (portrait + landscape)
- Flows to verify: onboarding, create/edit CV, export/share, settings/developer card
- What to check: overflow, clipped text, horizontal scroll, broken buttons, white flashes, animation smoothness
- Space for noting breakpoint issues

### 2. Update `README.md` -- Add QA sections
Append three new sections:

**Lighthouse Baseline**
- Instructions to run Lighthouse in Chrome DevTools (Mobile preset, Performance + Best Practices)
- Placeholder table for FCP, LCP, TBT, CLS scores (before/after columns)

**React Profiling Steps**
- Open React DevTools Profiler, record interactions, identify high render-time components
- Note that `React.memo`, `useMemo`, `useCallback` can be applied to hot spots found

**Real Device and Throttling Testing**
- Access dev build via local IP (`http://<your-ip>:8080`)
- Enable Slow 3G + 4x CPU slowdown in Chrome DevTools
- Verify: no layout breaks, no white flashes, smooth ElectricBorder animation

### 3. Create `src/lib/reportWebVitals.ts`
A small helper that imports `web-vitals` and logs LCP, FID, CLS, INP, TTFB to the console:

```typescript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFCP(console.log);
  onINP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}
```

### 4. Update `src/main.tsx`
Import and call `reportWebVitals()` after render:

```typescript
import { reportWebVitals } from './lib/reportWebVitals';

createRoot(document.getElementById("root")!).render(<App />);
reportWebVitals();
```

### 5. Install `web-vitals` package
Add `web-vitals` as a dependency.

## Files modified
- `docs/perf-checklist.md` (new)
- `README.md` (append sections)
- `src/lib/reportWebVitals.ts` (new)
- `src/main.tsx` (add reportWebVitals call)
- `package.json` (add web-vitals dependency via install)

## What stays the same
- All routing, business logic, components, and styles unchanged
- No changes to any existing page or layout component

