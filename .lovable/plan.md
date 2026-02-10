

# Fix One-Page Wizard to Produce a True Single-Page PDF

## Problem
The One-Page Wizard currently only condenses text via AI, but doesn't guarantee the result fits on one page. After applying changes, the PDF still uses normal multi-page pagination. A 3-page CV may become 2 pages but never truly one page.

## Solution
Add a **scale-to-fit** PDF generation mode that captures the entire resume and scales it down to fit exactly one PDF page. This works regardless of how much content remains after AI condensation.

## Technical Changes

### 1. `src/lib/pdfGenerator.ts` -- Add `generateOnePagePDF` function

New exported function that:
- Captures the full template at its natural height
- Calculates a scale factor: `min(1, PAGE_HEIGHT / (totalHeight * globalScaleFactor))`
- Draws the entire canvas onto a single PDF page, scaled to fit
- Still adds footer (page number + branding) below content

```text
Normal PDF:     One-Page PDF:
+--------+      +--------+
| Page 1 |      | All    |
+--------+      | content|
| Page 2 |      | scaled |
+--------+  ->  | to fit |
| Page 3 |      | in one |
+--------+      | page   |
                +--------+
```

### 2. `src/components/editor/ai/OnePageWizardSheet.tsx` -- Add direct download after applying

- After applying AI changes, offer a "Download One-Page PDF" button
- Calls `generateOnePagePDF` directly for immediate export
- Also keep the "Apply Changes" flow for users who just want to edit the data

### 3. `src/pages/PreviewPage.tsx` -- Wire up 'one-page' export type

- In `handleExport`, when `type === 'one-page'`, call `generateOnePagePDF` instead of `generatePDF`
- This means users can also export one-page directly from the export sheet without going through the wizard

### 4. `src/components/editor/ExportOptionsSheet.tsx` -- Direct export for one-page

- Change the "one-page" option to directly export a scaled-to-fit PDF (no wizard detour needed)
- Keep the wizard accessible from the Preview page toolbar for users who want AI condensation first

## How `generateOnePagePDF` Works

1. Prepare element for capture (same `prepareForCapture` routine)
2. Capture full template as canvas via `html2canvas`
3. Calculate the content height in PDF points: `totalHeight * globalScaleFactor`
4. If content exceeds `PRINTABLE_HEIGHT`, compute a `fitScale = PRINTABLE_HEIGHT / pdfContentHeight`
5. Draw the full canvas image onto a single page at `width = PAGE_WIDTH * fitScale`, `height = pdfContentHeight * fitScale`, centered horizontally
6. Add footer, save, return blob

## Expected Result
- A 3-page CV exported as "One-Page" will render all content on a single page, scaled down proportionally
- Content remains readable (typical scale for 3 pages would be ~33% reduction)
- The AI condensation step in the wizard still helps -- condensing first means less scaling needed, better readability

