# Phase 11 - PDF Export Migration and Pagination Replacement

**Last verified:** 2026-05-15
**Type:** stability fix
**Sources:**
- `src/lib/nativePdfGenerator.ts`
- `server/index.ts`
- `src/lib/exportPagePlan.ts`
- `src/components/editor/export/ExportPageBreakSetup.tsx`
- `src/lib/exportWatermark.ts`
- `src/lib/exportResumePdf.ts`
- `src/lib/pdfGenerator.ts`

---

## Why it exists

WiseResume previously had multiple PDF paths. The old `html2canvas`/raster helpers produced image-based PDFs that were not reliably selectable or ATS-readable. The native Puppeteer path produced selectable text, but it did not receive the user's custom page breaks or cropped-final-page intent.

The confirmed export root cause on 2026-05-15 was:
- the Live Preview custom page-break controls were visually fragile and not part of Export Options;
- `generateNativePDF()` dropped `customBreakPositions`, page-number, branding, and content-height data before calling the server;
- `/api/export/pdf-native` printed the full HTML with normal Chromium pagination, so user breaks were ignored;
- the final page always used full A4/Letter height;
- iPhone fallback opened `window.print()` when the PDF service was unavailable.

## Current behavior

All resume PDF export paths use the native PDF pipeline.

`generateNativePDF()` serializes the live template HTML/CSS and sends:
- `pageFormat`
- `onePage`
- `atsMode`
- `showPageNumbers`
- `showBranding`
- `customBreakPositions`
- `totalContentHeightPx`

The Express server renders PDF segments from that payload:
1. Normalize custom break positions with `exportPagePlan`.
2. If no custom breaks are present, build standard suggested segments.
3. Render one clipped HTML document per page segment.
4. Add a footer with optional page number and clickable `Wise Resume` link.
5. Crop the final page to the remaining content height.
6. Merge segment PDFs with `pdf-lib`.

This keeps resume text selectable and keeps source `<a href>` links clickable because the PDF is rendered from real HTML, not a screenshot.

## Export Setup UI

The old Live Preview page-break controls were removed.

Exact break editing now lives in Export Options through `ExportPageBreakSetup`:
- measures the current resume preview;
- starts from smart suggested breaks;
- lets the user add, move, remove, reset, and persist break positions;
- stores exact positions in `customBreakPositions`.

## Watermark

PDF export adds a visible clickable footer link:

`Wise Resume` -> `https://resume.thewise.cloud`

Image export cannot embed a truly clickable link inside a PNG, so image export appends a footer strip containing:

`Wise Resume`
`https://resume.thewise.cloud`

## Cleanup

`src/lib/pdfGenerator.ts` now retains only measurement utilities used by auto-fit and one-page measurement:
- `PAGE_FORMAT_PX`
- `FOOTER_RESERVED_PT`
- `prepareForMeasure`
- `calculatePDFDimensions`
- `estimatePageCount`
- `estimateOnePageScale`
- `getTemplateSourceElement`
- `PdfGenerationError`

Deleted dead raster-PDF internals include:
- `generatePDFPages`
- `captureTemplateAsCanvas`
- `prepareForCapture`
- `addPageFooter`
- manual raster link annotation helpers

## Verification

- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportWatermark.test.ts src/lib/__tests__/pdfUtils.test.ts src/lib/exportResumePdf.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `npm run build:server` passed.
- Built-server smoke test against `POST /api/export/pdf-native` returned `%PDF-` bytes for an exact-break payload with branding enabled.
