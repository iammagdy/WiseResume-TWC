

# Fix Stretched Font on Page 3 of PDF

## Problem Analysis

Looking at the screenshot, the text on page 3 of the generated PDF appears **vertically stretched** - the fonts are too tall and distorted. This happens because the PDF generator is stretching content to fill the page height rather than maintaining proper aspect ratio.

### Root Cause

In `pdfGenerator.ts`, the `drawImage` call incorrectly scales the canvas slice:

```typescript
// Current (WRONG) - stretches content to fill different height
ctx.drawImage(
  canvas,
  0, sourceY,                    // Source x, y
  canvas.width, sliceHeight,     // Source width, height
  0, 0,                          // Dest x, y
  pageCanvas.width, destHeight   // Dest width, height ← DIFFERENT RATIO
);
```

The issue is:
- `sliceHeight` = actual content height in canvas pixels
- `destHeight` = scaled PDF height (different value)

When source and destination heights differ, the content gets stretched vertically.

### Visual of the Problem

```
SOURCE (canvas slice)          DEST (page canvas)
┌───────────────────┐         ┌───────────────────┐
│ Skills:           │  ───►   │ Skills:           │
│ • React           │ STRETCH │ •                 │
│ • TypeScript      │         │   R               │
│                   │         │    e              │
└───────────────────┘         │     a             │
  Height: 200px               │      c            │
                              │       t           │
                              │ •                 │
                              │   T               │
                              │    y...           │
                              └───────────────────┘
                                Height: 400px
```

## Solution

**Maintain 1:1 pixel ratio** when drawing from source to destination canvas. The content should be drawn at its natural size, not stretched to fill.

### Fix in pdfGenerator.ts

```typescript
// CORRECTED - maintain aspect ratio
ctx.drawImage(
  canvas,
  0, sourceY,                    // Source x, y
  canvas.width, sliceHeight,     // Source width, height
  0, 0,                          // Dest x, y
  pageCanvas.width, sliceHeight  // Dest width, height ← SAME RATIO
);
```

The key change: destination height should match source height (`sliceHeight`) rather than a different calculated `destHeight`.

## Detailed Implementation

The page drawing loop needs this fix:

```typescript
// Process pages using smart break positions
for (let pageNum = 0; pageNum < numPages; pageNum++) {
  const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
  const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
  const pageContentHeight = pageEnd - pageStart;

  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = PAGE_WIDTH * SCALE;
  pageCanvas.height = PAGE_HEIGHT * SCALE;
  const ctx = pageCanvas.getContext('2d');
  
  if (!ctx) continue;

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

  // Calculate source slice from captured canvas (in canvas pixels)
  const sourceY = pageStart * SCALE;
  const sliceHeight = pageContentHeight * SCALE;

  if (sliceHeight <= 0) continue;

  // FIX: Scale the slice uniformly to fit PDF page width
  // Calculate the scale needed to fit source width to page width
  const sourceSliceWidth = canvas.width;
  const destSliceWidth = pageCanvas.width;
  const uniformScale = destSliceWidth / sourceSliceWidth;
  const destSliceHeight = sliceHeight * uniformScale;

  // Draw maintaining aspect ratio (uniform scaling)
  ctx.drawImage(
    canvas,
    0, sourceY,                        // Source x, y
    sourceSliceWidth, sliceHeight,     // Source width, height  
    0, 0,                              // Dest x, y (top-left)
    destSliceWidth, destSliceHeight    // Dest width, height (scaled uniformly)
  );

  // Calculate PDF content height for proper positioning
  const pdfContentHeight = destSliceHeight / SCALE;
  
  // ... rest of PDF embedding unchanged
}
```

## File Changes

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Fix canvas drawImage to use uniform scaling instead of stretching |

## Expected Result

After the fix:
- Text on all pages will have the same font size and aspect ratio
- Content that takes less than a full page will have white space at the bottom (correct behavior)
- No more stretched/distorted text

```
PAGE 3 (AFTER FIX)
┌───────────────────────┐
│ SKILLS                │
│ • Loyalty Program Mgmt│  ← Normal sized text
│ • Account Management  │
│ • CRM                 │
│ • Revenue Growth      │
│ • Business Analysis   │
│ • Data Analysis       │
│                       │
│                       │  ← White space (correct)
│                       │
└───────────────────────┘
```

