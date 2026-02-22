

# Optimize Remaining Image Assets and Fix CLS

## What Was Fixed (Confirmed Working)
- EditorDemo animations now trigger correctly on scroll
- Badge animations use efficient opacity pulse instead of boxShadow
- SpaceBackground uses reduced blur and fewer stars
- CPU profile shows no animation-related bottlenecks

## What Still Needs Fixing

### 1. Logo WebP is 801KB (target: under 50KB)
The `src/assets/wise-ai-logo.webp` conversion didn't compress enough -- it's loaded twice on the page (1.6MB total). Need to re-compress with much higher compression or smaller dimensions.

**File:** `src/assets/wise-ai-logo.webp` -- regenerate at lower quality/smaller size

### 2. PWA icons are 2.5MB each
`/favicon.png` and `/icons/icon-144x144.png` are the original uncompressed PNG. These load on every page visit.

**Files:**
- `public/favicon.png` -- compress to under 20KB
- `public/icons/icon-144x144.png` -- compress to under 20KB
- Consider adding properly sized variants (16x16, 32x32, 192x192, 512x512)

### 3. CLS of 0.14 (needs improvement)
Layout shifts caused by:
- SpaceBackground star elements repositioning
- Content sections loading and pushing layout

**Fix:** Add explicit `min-height` to the hero section and "See It in Action" cards container so content below doesn't shift when animations trigger. Give SpaceBackground star container `position: absolute` with `contain: layout style paint` (already partially done).

## Summary

| File | Change |
|------|--------|
| `src/assets/wise-ai-logo.webp` | Re-compress to under 50KB |
| `public/favicon.png` | Compress from 2.5MB to under 20KB |
| `public/icons/icon-144x144.png` | Compress from 2.5MB to under 20KB |
| `src/pages/Index.tsx` | Add min-height to hero and cards sections to reduce CLS |

No new dependencies. No database changes.
