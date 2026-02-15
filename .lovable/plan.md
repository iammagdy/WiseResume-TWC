

## Fix One-Page PDF to Always Fill Full Page Width

### Problem

The current `generateOnePagePDF` applies `fitScale` to BOTH width and height (line 917: `finalWidth = pageWidth * fitScale`). For a 2-page resume, `fitScale` would be ~0.5, shrinking the width to half the page -- producing a tiny, unreadable resume centered on the page.

The correct behavior: the image should stretch to fill the full page width, and the height should be whatever is needed to maintain the aspect ratio of the captured content, all fitted onto one page.

### Fix (single file change)

**File: `src/lib/pdfGenerator.ts`** -- lines 917-934

Replace the current scaling logic with:
- Use `finalWidth = pageWidth` (always full width)
- Calculate `finalHeight` as the height that maintains the aspect ratio of the captured canvas when drawn at full page width
- Since the canvas captures at `sourceWidth` pixels wide and `totalHeight` pixels tall, and we draw at `pageWidth` points wide, the height becomes: `(totalHeight / sourceWidth) * pageWidth`
- If that height exceeds `printableHeight`, scale the image uniformly to fit within `printableHeight` while maintaining aspect ratio -- but keep it at full page width
- Remove the horizontal offset (`offsetX`) since the image always fills the full width
- Position the image at the top of the page

The key formula:
```
finalWidth = pageWidth
aspectRatio = totalHeight / sourceWidth
naturalHeight = pageWidth * aspectRatio
// If naturalHeight > printableHeight, scale both down uniformly
fitScale = naturalHeight > printableHeight ? printableHeight / naturalHeight : 1
finalWidth = pageWidth * fitScale  // will be < pageWidth only for extremely tall resumes
finalHeight = naturalHeight * fitScale
```

Actually, the simplest correct approach: draw the image at full page width and let the height be whatever fits. Since the source is already captured at the correct aspect ratio, drawing at `(pageWidth, printableHeight)` with the image will uniformly scale everything to fit one page at maximum size.

### What Changes

| Line Range | Change |
|-----------|--------|
| 917-921 | Set `finalWidth = pageWidth`, calculate `finalHeight` to maintain aspect ratio capped at `printableHeight`, set `offsetX = 0` |

### What Does NOT Change

- The AI condensation flow in OnePageWizardSheet (still works independently)
- Multi-page PDF generation
- Cover letter generation
- The dynamic capture scale logic (keeps high resolution)
- Footer/branding placement
