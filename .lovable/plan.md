

# Add Error Boundaries and Retry Logic for PDF Generation (html2canvas)

## Problem

`html2canvas` is unreliable in Android WebView -- it can fail due to cross-origin font issues, canvas taint errors, SVG rendering gaps, or timeouts. Currently, failures show a generic error toast with no retry option. There are 6 callsites using `html2canvas` across the app, each with inconsistent error handling.

## Solution

Create a centralized `captureWithRetry` wrapper that handles retries with progressive fallback options, and apply it to all `html2canvas` callsites.

---

## Changes

### 1. New file: `src/lib/html2canvasRetry.ts`

A utility that wraps `html2canvas` with:
- **Up to 3 attempts** with increasing timeouts (8s, 15s, 25s for WebView)
- **Progressive fallback** on each retry:
  - Attempt 1: Normal capture (useCORS, allowTaint)
  - Attempt 2: Disable `foreignObjectRendering`, reduce scale
  - Attempt 3: Disable external images, minimal options
- **WebView detection** via `Capacitor.isNativePlatform()` to auto-increase timeouts
- **Empty canvas check** after each attempt (width/height === 0)
- Typed error with `code` for callers to handle specifically

```typescript
export async function captureWithRetry(
  element: HTMLElement,
  baseOptions: Partial<Html2CanvasOptions>,
  maxAttempts = 3
): Promise<HTMLCanvasElement>
```

### 2. Update `src/lib/pdfGenerator.ts` -- `captureTemplateAsCanvas()`

Replace the direct `html2canvas()` call (line 784) with `captureWithRetry()`. The existing `PdfGenerationError` class already has the right error codes -- just wire it up.

**Before (line 784):**
```typescript
const canvas = await html2canvas(sourceElement, { ... });
```

**After:**
```typescript
const canvas = await captureWithRetry(sourceElement, { ... });
```

### 3. Update `src/components/portfolio/CareerCardSheet.tsx` -- `handleDownload()` and `handleShareImage()`

Replace both direct `html2canvas()` calls (lines 420 and 454) with `captureWithRetry()`.

### 4. Update `src/components/portfolio/qr/QRGeneratorSheet.tsx` -- `handleDownload()`

Replace the `html2canvas()` call (line 149) with `captureWithRetry()`.

### 5. Update `src/pages/PublicPortfolioPage.tsx` -- `handleDownload()`

Replace the `html2canvas()` call (line 291) with `captureWithRetry()`. This file currently does a dynamic `import('html2canvas')` -- switch to `import('@/lib/html2canvasRetry')` instead.

### 6. Update caller error handling to show retry UI

For all callsites that currently show a generic `toast.error(...)`, enhance to:
```typescript
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Capture failed';
  toast.error(msg, {
    action: { label: 'Retry', onClick: () => handleDownload() },
  });
}
```

This gives users a one-tap retry directly from the error toast.

---

## Technical Details

### `captureWithRetry` implementation strategy

```typescript
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';

const ATTEMPT_CONFIGS = [
  { scale: 2, useCORS: true, allowTaint: true, foreignObjectRendering: false },
  { scale: 1.5, useCORS: true, allowTaint: false, foreignObjectRendering: false },
  { scale: 1, useCORS: false, allowTaint: false, foreignObjectRendering: false },
];

export async function captureWithRetry(
  element: HTMLElement,
  baseOptions: Record<string, unknown>,
  maxAttempts = 3
): Promise<HTMLCanvasElement> {
  const isNative = Capacitor.isNativePlatform();
  const timeouts = isNative ? [10000, 18000, 28000] : [8000, 15000, 25000];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fallback = ATTEMPT_CONFIGS[Math.min(attempt, ATTEMPT_CONFIGS.length - 1)];
    const opts = { ...baseOptions, ...fallback, logging: false };

    // On retry attempts, strip external images to avoid taint
    if (attempt >= 2) {
      opts.onclone = (doc: Document) => {
        doc.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || '';
          if (src && !src.startsWith('data:') && !src.startsWith(window.location.origin)) {
            img.style.visibility = 'hidden';
          }
        });
      };
    }

    try {
      const canvas = await Promise.race([
        html2canvas(element, opts),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Canvas capture timed out')), timeouts[attempt])
        ),
      ]);

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Empty canvas captured');
      }

      return canvas;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`html2canvas attempt ${attempt + 1} failed:`, lastError.message);

      // Brief delay before retry
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('All capture attempts failed');
}
```

### Files changed summary

| File | Change |
|------|--------|
| `src/lib/html2canvasRetry.ts` | New -- retry wrapper with progressive fallback |
| `src/lib/pdfGenerator.ts` | Use `captureWithRetry` in `captureTemplateAsCanvas` |
| `src/components/portfolio/CareerCardSheet.tsx` | Use `captureWithRetry` in download/share |
| `src/components/portfolio/qr/QRGeneratorSheet.tsx` | Use `captureWithRetry` in download |
| `src/pages/PublicPortfolioPage.tsx` | Use `captureWithRetry` in portfolio PDF download |
| All above callers | Add retry action button in error toasts |

