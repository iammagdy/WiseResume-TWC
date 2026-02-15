

## Use pageFormat Setting in PDF Generator

### Problem

The PDF generator hardcodes Letter size (612x792 points) regardless of the user's page format selection (A4 vs Letter) in the customization sheet. The `PAGE_FORMAT_PX` map already exists in `templateCustomization.ts` with the correct dimensions.

### Changes

**File: `src/lib/pdfGenerator.ts`**

1. Import `PAGE_FORMAT_PX` from `@/lib/templateCustomization`
2. Keep the hardcoded `PAGE_WIDTH`/`PAGE_HEIGHT` constants as **defaults** (fallback)
3. Create a helper function `getPageDimensions(resume: ResumeData)` that reads `resume.customization?.pageFormat` and returns `{ pageWidth, pageHeight }` from `PAGE_FORMAT_PX`, defaulting to Letter
4. Update `generatePDF()` to call this helper and pass dynamic dimensions through:
   - `calculatePDFDimensions()` -- add `pageWidth`/`pageHeight` parameters instead of using the constants
   - `generatePDFPages()` -- add `pageWidth`/`pageHeight` parameters for page creation and image positioning
   - `addPageFooter()` -- add `pageWidth` parameter for centering text
5. Update `generateOnePagePDF()` similarly
6. Update `prepareForCapture()` to use the dynamic `pageWidth` instead of hardcoded 612
7. Update `estimateOnePageScale()` and `estimatePageCount()` to accept optional `pageFormat` parameter

### What Does NOT Change

- All break-detection logic (works with relative positions, unaffected)
- Template rendering (templates already apply customization CSS)
- Cover letter PDF generation (uses its own MARGIN-based layout)
- The `PAGE_FORMAT_PX` map in `templateCustomization.ts` (already correct)
- The existing `SCALE` constant (capture resolution, independent of page size)

### Risk

Low -- this is a mechanical refactor replacing constant references with parameterized values. The A4 and Letter point sizes are standard PDF dimensions.

