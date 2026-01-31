
# Fix PDF Rendering Issue - Blank Space at Top of Pages

## Problem Analysis

The downloaded PDF shows incorrect rendering with:
1. **Large blank space at the top** of each page
2. **Content pushed down** rather than starting from the top

### Root Causes Identified

Looking at the console logs and code:

```
sourceWidth: 604, totalHeight: 1701
scaleFactor: 1.0132 (nearly 1:1)
sourceHeightPerPage: 781.64px
```

**Issue 1: html2canvas capture offset**
The current code passes `x: rect.left` and `y: rect.top` to html2canvas, which includes the element's position within the viewport. Since the resume preview is inside a scrollable container with padding, this offset gets baked into the capture, creating blank space.

**Issue 2: Inconsistent scaling math**
The `destHeight` calculation uses `sourceSliceHeight * scaleFactor * SCALE` but doesn't properly account for the relationship between the captured canvas and the target page dimensions.

**Issue 3: Canvas slice positioning**
When drawing slices onto page canvases, the source coordinates need to use the scaled canvas dimensions consistently.

## Solution

### Fix 1: Remove position offsets from html2canvas
Remove `x` and `y` options that introduce unwanted offsets:

```typescript
// BEFORE (problematic)
const canvas = await html2canvas(sourceElement, {
  ...
  x: rect.left,  // REMOVE
  y: rect.top,   // REMOVE
});

// AFTER (fixed)
const canvas = await html2canvas(sourceElement, {
  ...
  // Don't pass x, y - let html2canvas capture from element origin
});
```

### Fix 2: Correct the scaling math
Simplify the page slice calculations:

```typescript
// Canvas is captured at SCALE (2x)
// We need to slice it into PDF-page-sized chunks

// Each PDF page in canvas pixels
const canvasPageHeight = sourceHeightPerPage * SCALE;

// For each page, slice from the captured canvas
const sourceY = pageNum * canvasPageHeight;
const sliceHeight = Math.min(canvasPageHeight, canvas.height - sourceY);

// Draw to fill the page canvas from top
ctx.drawImage(
  canvas,
  0, sourceY,                         // Source from captured canvas
  canvas.width, sliceHeight,          // Source dimensions
  0, 0,                               // Dest at top-left
  pageCanvas.width, pageCanvas.height // Fill destination
);
```

### Fix 3: Correct PDF image placement
Ensure image fills page from the top:

```typescript
// The image should fill the PDF page from the top
// For full pages: fill entire page
// For partial pages: fill proportionally from top

const pdfSliceHeight = (sliceHeight / SCALE) * scaleFactor;

page.drawImage(pngImage, {
  x: 0,
  y: PAGE_HEIGHT - pdfSliceHeight,  // Position at top
  width: PAGE_WIDTH,
  height: pdfSliceHeight,
});
```

## File Changes

| File | Changes |
|------|---------|
| `src/lib/pdfGenerator.ts` | Fix html2canvas options, correct scaling/slicing math |

## Detailed Implementation

### Updated pdfGenerator.ts

```typescript
// html2canvas call - remove x/y offset
const canvas = await html2canvas(sourceElement, {
  scale: SCALE,
  useCORS: true,
  allowTaint: true,
  backgroundColor: '#ffffff',
  logging: false,
  width: sourceWidth,
  height: totalHeight,
  scrollX: 0,
  scrollY: 0,        // Fixed: use 0 instead of -window.scrollY
  windowWidth: sourceWidth,
  windowHeight: totalHeight,
  // Removed: x and y options that caused offset issues
});

// Page processing - corrected math
for (let pageNum = 0; pageNum < numPages; pageNum++) {
  // ... create pageCanvas ...
  
  // Calculate source slice from captured canvas (in canvas pixels)
  const canvasPageHeight = sourceHeightPerPage * SCALE;
  const sourceY = pageNum * canvasPageHeight;
  const remainingHeight = canvas.height - sourceY;
  const sliceHeight = Math.min(canvasPageHeight, remainingHeight);
  
  if (sliceHeight <= 0) continue;
  
  // Calculate how much of the page this slice fills
  const pageFillRatio = sliceHeight / canvasPageHeight;
  const destHeight = PAGE_HEIGHT * SCALE * pageFillRatio;
  
  // Draw from top of page canvas
  ctx.drawImage(
    canvas,
    0, sourceY,                    // Source position
    canvas.width, sliceHeight,     // Source size
    0, 0,                          // Dest position (top-left)
    pageCanvas.width, destHeight   // Dest size
  );
  
  // ... embed in PDF ...
  
  const pdfImageHeight = PAGE_HEIGHT * pageFillRatio;
  page.drawImage(pngImage, {
    x: 0,
    y: PAGE_HEIGHT - pdfImageHeight,
    width: PAGE_WIDTH,
    height: pdfImageHeight,
  });
}
```

## Testing Plan

1. Generate a PDF with a multi-page resume
2. Verify content starts at the top of page 1 (no blank space)
3. Verify page breaks occur at correct positions
4. Verify last page shows remaining content at top (not centered/bottom)
5. Compare with page break indicators in preview

## Summary

- Remove `x`, `y` options from html2canvas to avoid viewport offset capture
- Use `scrollY: 0` instead of `-window.scrollY` 
- Recalculate slice heights using canvas coordinates consistently
- Ensure partial pages fill from the top down
