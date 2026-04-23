# Phase 11 — PDF export migration to Puppeteer (text-selectable across all surfaces)

**Last verified:** 2026-04-23
**Type:** stability fix
**Sources:**
- `src/lib/exportResumePdf.ts` (new offscreen renderer + `OffscreenRenderTimeoutError`)
- `src/lib/exportResumePdf.test.ts` (new — covers timeout-throw + cleanup contract)
- `src/components/applications/ResumeListSheet.tsx` (`handleDownload` migrated to native pipeline)
- `src/lib/nativePdfGenerator.ts` (Puppeteer-backed pipeline — pre-existing target API)
- `src/lib/pdfGenerator.ts` (deprecated public exports removed: `generatePDF`, `generateOnePagePDF`, `generateCoverLetterPDF`, `generateCombinedPDF`; measurement utilities retained)
- `src/lib/pdfGenerator.test.ts` (test blocks for removed public exports deleted; 9 measurement-helper tests retained)
- `src/components/templates/registry.ts` (lazy template map consumed by the new offscreen mount)
- `.local/tasks/task-30.md` (per-task brief)

**Canonical owner:** `project-governance/CHANGELOG.md` entry dated 2026-04-23 — Task #30 PDF export migration

---

## Why it exists

Two separate PDF-export pipelines had been coexisting in the app:

1. The **legacy `html2canvas`-based pipeline** in `src/lib/pdfGenerator.ts` (`generatePDF`, `generateOnePagePDF`, `generateCoverLetterPDF`, `generateCombinedPDF`). It rasterises the live `[data-resume-template]` element to a canvas, then embeds that canvas as an image in a `jsPDF` page. The output PDF contains image bytes, not text — meaning recruiters and applicant-tracking systems could not select, copy, or parse the resume's words. It was also slow (canvas snapshotting at the resume template's resolution), inconsistent across resume styles, and pinned to whatever the on-screen DOM looked like at the moment of capture (lazy images, late-loaded fonts).
2. The **Puppeteer-backed native pipeline** in `src/lib/nativePdfGenerator.ts` (`generateNativePDF`, `generateCoverLetterNativePDF`). It serialises the template's HTML + computed CSS, ships it to a server-side headless Chromium, and prints to PDF directly. The output is text-selectable, faster, font-consistent, and deterministic.

Earlier task work had migrated four of the five callers (ShareSheet, TailorSheet, `useOnePageExport`, `CoverLetterGenerator`) to the native pipeline, but the dashboard's Applications view (`ResumeListSheet.tsx`) still routed its "Download PDF" action through the legacy `generatePDF`. That meant any user who opened the Applications sheet and downloaded a resume from there got the old image-PDF, while the same resume downloaded from the editor's Share or Tailor sheets got the new text-selectable one — a silent inconsistency that neither party would obviously notice.

This phase finishes the migration so **every** PDF export in the product flows through the same native pipeline.

## How it works now

### The new offscreen renderer (`src/lib/exportResumePdf.ts`)

The previously-migrated callers all had a live `[data-resume-template]` element on the page they could hand to `generateNativePDF`. The dashboard list row does not — it has only the `ResumeData` JSON pulled from Supabase, with no template mounted anywhere in the DOM. `exportResumePdfFromData(resume, templateId, options)` bridges that gap:

1. Looks up the lazy template component via `templateRegistry[templateId]`.
2. Mounts it into a freshly-created offscreen `<div>` positioned at `left:-10000px`, `width:816px` (US-letter equivalent at 96 dpi) so layout matches what a real letter-paginated print would see, but the user never sees it. The container is given `data-resume-template=""` so `nativePdfGenerator` recognises it as a real template root.
3. Wraps the lazy template in `<Suspense>` and uses `createRoot(container).render(...)`. A small inline `<style>{generateCustomizationCSS(customization)}</style>` is injected so the user's font, spacing, and colour choices apply to the offscreen render exactly as they would on screen.
4. Awaits `document.fonts.ready`, then RAF-polls (capped at the configurable `renderTimeoutMs` deadline, default 4 s) until `template.scrollHeight > 100` and the template has at least one child — i.e. the lazy chunk has resolved and React has committed at least one paint. Two extra RAF ticks are added after the first paint so layout settles.
5. **If the deadline expires without a paint**, throws a typed `OffscreenRenderTimeoutError` (exported alongside the function) and the caller surfaces a clear "export failed" toast instead of producing a blank PDF. This is the explicit fail-fast guard added in the architect-review pass — silent timeouts producing empty downloads were the obvious worst-case otherwise.
6. Calls `generateNativePDF(template, { pageFormat, ...options })` with the resume's persisted `pageFormat` (`'letter'` or `'a4'`) and the caller's options (`showPageNumbers`, `showBranding`, etc.). The internal `renderTimeoutMs` option is stripped before forwarding so it cannot leak into the native pipeline's own option surface.
7. **Always** unmounts the React root and removes the offscreen container in a `finally` block, even on success, even on `OffscreenRenderTimeoutError`, even on `generateNativePDF` errors. No leftover offscreen DOM after any code path.

### The migrated caller (`src/components/applications/ResumeListSheet.tsx`)

`handleDownload` now imports `exportResumePdfFromData` and passes `{ showPageNumbers: true, showBranding: true }`. On failure it `console.error`s the underlying error before surfacing the existing user-facing toast, so a future regression leaves a diagnostic breadcrumb in production.

### Removed legacy public exports (`src/lib/pdfGenerator.ts`)

All four legacy public exports — `generatePDF`, `generateOnePagePDF`, `generateCoverLetterPDF`, `generateCombinedPDF` — were removed from the module's public surface. The corresponding test blocks in `src/lib/pdfGenerator.test.ts` (the `generatePDF` describe, the TPL-2 truncation guard, and the TPL-2 raster-area ceiling test) were removed in the same diff.

The **measurement utilities** in `pdfGenerator.ts` are still consumed by the rest of the app and were intentionally left in place: `PAGE_FORMAT_PX`, `FOOTER_RESERVED_PT`, `prepareForMeasure`, `calculatePDFDimensions`, `estimatePageCount`, `estimateOnePageScale`, `snapBreaksToContent`, `injectForcedBreaks`, `findWhitespaceBandSnap`, `getTemplateSourceElement`, `wrapText`, `PdfGenerationError`. These power `useOnePageExport`, `useFitToPages`, `LivePreviewPanel`, the cover-letter generator, the interview-summary generator, and the company-briefing PDF — none of which depend on the legacy public exports.

### Test coverage

`src/lib/exportResumePdf.test.ts` covers the typed timeout failure path: when the offscreen template never paints inside a small `renderTimeoutMs`, the function throws `OffscreenRenderTimeoutError`, never invokes `generateNativePDF`, and leaves no `[data-resume-template]` containers behind. The success path is exercised in production by the migrated caller — JSDOM cannot meaningfully test it without booting the full lazy-component pipeline, so it is intentionally not duplicated as a unit test.

`src/lib/pdfGenerator.test.ts` retains all 9 tests for the measurement helpers; the entire `src/lib/` vitest suite (224 tests) passes.

## Drift / known gap

`pdfGenerator.ts` still contains internal helpers that **only** exist to support the removed public exports and are now dead code: `generatePDFPages`, `captureTemplateAsCanvas`, `prepareForCapture`, `getPageDimensions`, `addPageFooter`, `extractAndEmbedLinkAnnotations` (~300 lines combined). They were left in place in this phase to keep the diff blast-radius small and the regression risk obvious. Deletion is tracked as follow-up Task #49 (Slim down the PDF generator file by removing unused legacy helpers).

## What this does NOT change

- No change to the `nativePdfGenerator` server-side pipeline (Puppeteer Chromium config, fonts, page formatting, page numbers, branding footer).
- No change to any of the four already-migrated callers (ShareSheet, TailorSheet, `useOnePageExport`, `CoverLetterGenerator`).
- No change to the cover-letter, interview-summary, or company-briefing PDF generators — they were already on the right pipeline.
- No change to any user-facing copy, button placement, or the dashboard Applications sheet's overall behaviour. The only observable difference for the user is that the resulting PDF is now text-selectable.
