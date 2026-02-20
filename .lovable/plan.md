

# Performance and Responsiveness Fixes

## Overview
Apply targeted code fixes based on the QA checklist and README performance sections, then create `src/perf-audit-results.ts` to track resolution status. No business logic changes.

## Changes

### 1. ElectricBorder -- Cap sampleCount (Performance)

**File:** `src/components/ui/ElectricBorder.tsx`, line 183

Change:
```typescript
const sampleCount = Math.floor(approximatePerimeter / 2);
```
To:
```typescript
const sampleCount = Math.min(Math.floor(approximatePerimeter / 2), 200);
```

Cleanup, DPR cap, and ResizeObserver disconnect are already correctly implemented.

### 2. Create `src/perf-audit-results.ts` (Audit Tracker)

New file that documents the status of every item from the checklist:

- **WHITE FLASH**: FIXED -- `index.html` has inline `background-color:#0a0a14`, CSS sets `html`/`#root`/`body` to dark bg.
- **WEB VITALS**: FIXED -- `web-vitals` installed, `reportWebVitals()` wired in `main.tsx`.
- **ELECTRIC BORDER PERF**: FIXED -- sampleCount capped at 200, rAF+ResizeObserver cleaned up, DPR capped at 2.
- **HARDCODED WIDTHS**: FIXED -- decorative elements use absolute positioning inside overflow-hidden parents; template widths are intentional for print.
- **TOUCH TARGETS**: FIXED -- all primary interactive elements verified at 44px minimum.
- **CLS/LAYOUT SHIFTS**: NEEDS REVIEW -- avatar images in profile/photo sheets should be verified for explicit dimensions.
- **FLEX WRAPPING**: NEEDS REVIEW -- dashboard filter chips at 320px need manual testing.
- **TEXT OVERFLOW**: NEEDS REVIEW -- long job titles in editor at 320px need manual check.
- **MODAL OVERFLOW**: NEEDS REVIEW -- AI chat sheet in landscape on short viewports needs manual check.

### 3. No other code changes needed

After thorough review:
- **White flash**: Already fully fixed (html inline bg + CSS rules).
- **Web Vitals**: Already wired in `main.tsx`.
- **`bg-white` in templates**: Intentional for print-ready resume rendering -- not a bug.
- **HomeBackground `w-[500px]`**: Decorative blurs with absolute positioning inside overflow-hidden -- no horizontal scroll.
- **floating-panel `sm:w-[400px]`**: Only applies at `sm+` breakpoint -- mobile uses `inset-x-4`.
- **PageLoadingSpinner**: Already uses `bg-background`.

### Files modified
- `src/components/ui/ElectricBorder.tsx` -- cap sampleCount to 200
- `src/perf-audit-results.ts` -- new file tracking audit status

