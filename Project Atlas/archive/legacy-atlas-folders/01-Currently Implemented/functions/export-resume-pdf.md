# export-resume-pdf

**Last verified:** 2026-05-15
**Type:** reference card
**Sources:** `server/index.ts`, `src/lib/nativePdfGenerator.ts`, `src/lib/exportPagePlan.ts`

---

## What It Does

Server-side PDF rendering endpoint for resume export.

**Route:** `POST /api/export/pdf-native`  
**Body:** `{ html, pageFormat, onePage, fitScale, showPageNumbers, showBranding, customBreakPositions, totalContentHeightPx }`

The frontend sends self-contained resume HTML plus export options from `generateNativePDF()`. The server renders with Chromium/Puppeteer so PDF text remains selectable and source anchors remain clickable.

## Pagination Behavior

- `customBreakPositions` are exact vertical break positions measured in the active export design width.
- The server validates and sorts those positions with `normalizeBreakPositions()`.
- Multi-page PDFs are rendered as clipped HTML segments and merged with `pdf-lib`.
- The final page height is cropped to the actual remaining content height plus the export footer.
- `onePage` still renders as a single fitted page.

## Branding

When `showBranding` is true, the server adds a visible footer link:

`Wise Resume` -> `https://resume.thewise.cloud`

This is a real PDF link because it is rendered as an HTML anchor before Chromium creates the PDF.

## Error Handling

If the local/server PDF service is unavailable, `nativePdfGenerator.ts` throws `PDFServerUnavailableError`. Resume export screens show a clear error and do not open the browser print screen as the normal fallback.

## Related

- `src/components/editor/export/ExportPageBreakSetup.tsx` - export setup UI
- `src/lib/exportPagePlan.ts` - page break validation and page segment planning
- `src/lib/nativePdfGenerator.ts` - frontend PDF payload builder
- `server/index.ts` - Puppeteer render and segment merge endpoint
- `Project Atlas/01-Currently Implemented/stability-fixes/phase-11-pdf-export-puppeteer-migration.md`
