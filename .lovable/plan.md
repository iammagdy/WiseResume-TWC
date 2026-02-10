

# Add Scale Percentage Preview to One-Page Export Option

## What Changes

When the Export Options sheet opens, the "One-Page Resume" option will show an estimated scale percentage (e.g., "67% scale" or "No scaling needed") so users know how much their content will be shrunk before downloading.

## Technical Details

### 1. `src/lib/pdfGenerator.ts` -- Add `estimateOnePageScale` helper

Export a lightweight function that reads the template element's dimensions and calculates the scale percentage without generating a PDF:

```typescript
export function estimateOnePageScale(templateElement: HTMLElement): number {
  const { totalHeight, globalScaleFactor } = calculatePDFDimensions(templateElement);
  const pdfContentHeight = totalHeight * globalScaleFactor;
  const fitScale = pdfContentHeight > PRINTABLE_HEIGHT
    ? PRINTABLE_HEIGHT / pdfContentHeight
    : 1;
  return Math.round(fitScale * 100);
}
```

### 2. `src/components/editor/ExportOptionsSheet.tsx` -- Accept template ref and show badge

- Add optional `templateElement` prop (`HTMLElement | null`)
- On sheet open, call `estimateOnePageScale` to get the percentage
- Display it as a small badge next to the "One-Page Resume" description, e.g., "67% scale" in an amber badge, or "No scaling needed" in green if 100%

### 3. `src/pages/PreviewPage.tsx` -- Pass `resumeRef.current` to ExportOptionsSheet

Add `templateElement={resumeRef.current}` to the ExportOptionsSheet render.

## Visual Result

The one-page option card will look like:

```
[icon] One-Page Resume              [check]
       Scale entire resume to fit one page
       [67% scale]  <-- small colored badge
```

If the resume already fits on one page: `[No scaling needed]` in green.
