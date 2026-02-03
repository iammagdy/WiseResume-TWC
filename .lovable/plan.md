
# Fix: Inconsistent Font Scaling Across PDF Pages

## Problem Analysis

Looking at your screenshots, the issue is clear:
- **Page 1**: Font looks correct and crisp
- **Page 2**: Font appears stretched/taller
- **Page 3**: Font appears compressed/smaller

This happens because the PDF export uses **image-based rendering** (html2canvas), and each page slice is being scaled differently based on its content height.

### Root Cause

The current code captures the entire resume as one big image, then slices it into pages. The problem is:

```
Page 1: 800px content → drawn at height X
Page 2: 400px content → drawn at height X/2 (stretched to fill)  
Page 3: 1200px content → drawn at height X*1.5 (compressed to fit)
```

When smart/manual page breaks create pages with different content heights, the scaling becomes inconsistent because each slice maintains aspect ratio but gets drawn at different sizes in the PDF.

---

## Solution

The fix is to use a **consistent scale factor** based on the original source-to-PDF width ratio, and draw each page slice at its **true scaled height** rather than variable heights.

### Key Changes

1. Calculate the **global scale factor** once (source width → PDF width)
2. Apply this **same scale** to all page slices
3. Draw each slice at its **proportionally scaled height** on the canvas
4. Ensure the PDF image uses **consistent 1:1 scaling** from the page canvas

### Code Fix in `generatePDF` function

```typescript
// Use the GLOBAL scale factor for ALL pages (not per-page)
const globalScaleFactor = PAGE_WIDTH / sourceWidth;

for (let pageNum = 0; pageNum < numPages; pageNum++) {
  const pageStart = pageNum === 0 ? 0 : smartBreaks[pageNum - 1];
  const pageEnd = pageNum === numPages - 1 ? totalHeight : smartBreaks[pageNum];
  const pageContentHeight = pageEnd - pageStart;

  // Calculate the scaled height in PDF points
  const pdfContentHeight = pageContentHeight * globalScaleFactor;

  // Create page canvas at the exact size needed (scaled)
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = PAGE_WIDTH * SCALE;
  pageCanvas.height = Math.ceil(pdfContentHeight * SCALE);
  
  // Source slice from captured canvas (in canvas pixels)
  const sourceY = pageStart * SCALE;
  const sourceSliceHeight = pageContentHeight * SCALE;
  
  // Draw the slice - scaled uniformly by global factor
  ctx.drawImage(
    canvas,
    0, sourceY,                              // Source position
    canvas.width, sourceSliceHeight,         // Source size
    0, 0,                                    // Dest position  
    pageCanvas.width, pageCanvas.height      // Dest size (maintains aspect ratio)
  );

  // Add to PDF - the image is already at correct scale
  page.drawImage(pngImage, {
    x: 0,
    y: PAGE_HEIGHT - pdfContentHeight,
    width: PAGE_WIDTH,
    height: pdfContentHeight,
  });
}
```

---

## Visual Explanation

### Before (Current Bug)
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Page 1              │  │ Page 2              │  │ Page 3              │
│ 800px → 792pt       │  │ 400px → 792pt       │  │ 300px → 792pt       │
│                     │  │                     │  │                     │
│ Font: Normal ✓      │  │ Font: STRETCHED ✗   │  │ Font: compressed ✗  │
│                     │  │ (double height)     │  │ (squished)          │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### After (Fixed)
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Page 1              │  │ Page 2              │  │ Page 3              │
│ 800px → 650pt       │  │ 400px → 325pt       │  │ 300px → 244pt       │
│                     │  │                     │  │                     │
│ Font: Normal ✓      │  │ Font: Normal ✓      │  │ Font: Normal ✓      │
│                     │  │ (partial page)      │  │ (partial page)      │
│ [white space below] │  │ [white space below] │  │ [white space below] │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## File Changes

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Fix the page slicing and scaling logic in `generatePDF` function (lines 317-384) |

---

## Technical Details

### The Math

If the source resume is 612px wide (matching PDF width), then:
- `globalScaleFactor = 612 / 612 = 1.0` (no scaling needed)

If source is 816px wide (wider template):
- `globalScaleFactor = 612 / 816 = 0.75` (scale down 75%)
- A 400px tall slice becomes: 400 × 0.75 = 300pt in PDF

This ensures **every pixel of the resume gets scaled by the same factor**, maintaining consistent font sizes across all pages.

---

## Mobile Considerations

This fix works for all templates because:
1. It uses the actual template element dimensions
2. The scale factor is calculated dynamically based on the template's width
3. All 7 templates (Modern, Classic, Minimal, Professional, Developer, Creative, Executive) will render consistently
