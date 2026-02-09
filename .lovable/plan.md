

# Fix PDF Truncation on iOS and Verify AI Features

## Problem 1: AI Features
The AI features are **actually working now** after the last `verify_jwt = false` fix. A direct test of `enhance-section` returned a successful 200 response. The user may be seeing cached behavior or needs to refresh. However, we should ensure the client-side error handling shows clear messages.

## Problem 2: PDF Truncation on iOS (The Real Bug)

The PDF is being truncated on iOS due to two compounding issues:

### Root Cause A: `getBoundingClientRect()` returns transform-affected values on iOS
The `calculatePDFDimensions` function uses `rect.width` from `getBoundingClientRect()` as a fallback. On iOS Safari, when framer-motion applies CSS transforms (`scale: 0.95` during animation), `getBoundingClientRect()` returns the **visually scaled** dimensions, not the actual layout dimensions. This causes `sourceWidth` to be smaller than expected, which distorts the `globalScaleFactor` and leads to content being cut off.

### Root Cause B: `html2canvas` on iOS Safari has viewport clipping
`html2canvas` on iOS Safari fails to capture content that extends beyond the visible viewport. Content below the fold is rendered as blank white space, causing truncation.

### Root Cause C: Container width is `100%` not `612px`
The resume container uses `width: '100%'` with `maxWidth: '612px'`. On mobile screens smaller than 612px, the actual width shrinks to match the screen, but `html2canvas` still captures at that smaller width. The PDF then scales this up, but the content layout was reflowed for the smaller width, potentially pushing content to a second "page" that gets clipped.

## Solution

### Fix 1: Force fixed dimensions before PDF capture (`src/lib/pdfGenerator.ts`)
Before capturing, temporarily override the resume element to:
- Set explicit `width: 612px` (not `100%`)
- Remove any CSS transforms
- Scroll the container to ensure all content is visible
- Set `overflow: visible` on parent containers
- Then restore everything after capture

```typescript
async function prepareForCapture(sourceElement: HTMLElement): { cleanup: () => void } {
  const originalStyles = {
    width: sourceElement.style.width,
    maxWidth: sourceElement.style.maxWidth,
    transform: sourceElement.style.transform,
    minHeight: sourceElement.style.minHeight,
  };
  
  // Force exact PDF-width layout
  sourceElement.style.width = '612px';
  sourceElement.style.maxWidth = '612px';
  sourceElement.style.transform = 'none';
  
  // Ensure parent scroll containers show all content
  let parent = sourceElement.parentElement;
  const parentOverflows: { el: HTMLElement; overflow: string }[] = [];
  while (parent) {
    const overflow = parent.style.overflow;
    parentOverflows.push({ el: parent, overflow });
    parent.style.overflow = 'visible';
    parent = parent.parentElement;
  }
  
  // Force layout recalculation
  sourceElement.offsetHeight; // triggers reflow
  
  return {
    cleanup: () => {
      sourceElement.style.width = originalStyles.width;
      sourceElement.style.maxWidth = originalStyles.maxWidth;
      sourceElement.style.transform = originalStyles.transform;
      sourceElement.style.minHeight = originalStyles.minHeight;
      parentOverflows.forEach(({ el, overflow }) => {
        el.style.overflow = overflow;
      });
    }
  };
}
```

### Fix 2: Use `offsetWidth` instead of `getBoundingClientRect` (`src/lib/pdfGenerator.ts`)
Change `calculatePDFDimensions` to prioritize `offsetWidth`/`scrollHeight` which are not affected by CSS transforms:

```typescript
// Use offsetWidth (not affected by transforms) instead of rect.width
const sourceWidth = sourceElement.offsetWidth || PAGE_WIDTH;
const totalHeight = sourceElement.scrollHeight || PAGE_HEIGHT;
```

### Fix 3: Add `will-change` and scroll to top before capture
In `captureTemplateAsCanvas`, scroll the parent to ensure all content is in the rendering context for iOS Safari:

```typescript
// Scroll parent to top to ensure iOS Safari renders all content
sourceElement.scrollIntoView({ block: 'start' });
window.scrollTo(0, 0);
```

### Fix 4: Improve mobile download with blob conversion for iOS
The `window.open(url, '_blank')` approach may not work well for blob URLs on iOS Safari. Instead, use the `navigator.share` API as primary method on iOS, falling back to creating a temporary download link with a data URL:

```typescript
if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  // iOS: Try share API first, then fallback to data URL
  try {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    await navigator.share({ files: [file] });
  } catch {
    // Fallback: convert to data URL for iOS
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      window.open(dataUrl, '_blank');
    };
    reader.readAsDataURL(pdfBlob);
  }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Add `prepareForCapture()` function, fix dimension calculation, add iOS scroll workaround |
| `src/pages/PreviewPage.tsx` | Improve iOS download to use `navigator.share` API with data URL fallback |

## Technical Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| PDF truncated on iOS | CSS transforms affect dimensions + html2canvas viewport clipping | Force 612px width, remove transforms, overflow:visible before capture |
| Content cut off | `getBoundingClientRect` returns scaled values | Use `offsetWidth`/`scrollHeight` instead |
| Download fails on iOS | Blob URLs don't work in iOS Safari `window.open` | Use `navigator.share` API with data URL fallback |
| AI features "not working" | Already fixed - user needs to refresh | No code change needed (verify with testing) |

