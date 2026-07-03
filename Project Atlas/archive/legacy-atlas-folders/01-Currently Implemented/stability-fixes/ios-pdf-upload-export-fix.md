# iOS PDF Upload & Export Fixes (2026-05-07)

**Status:** Shipped  
**Last verified:** 2026-05-07

> 2026-05-15 supersession: the iOS PDF save/export fallback described below is historical. Resume PDF export no longer uses `window.print()` as the normal service-unavailable fallback. Current behavior is documented in `Project Atlas/01-Currently Implemented/functions/export-resume-pdf.md` and `Project Atlas/01-Currently Implemented/stability-fixes/phase-11-pdf-export-puppeteer-migration.md`.

## Problems fixed

### 1 — PDF upload: "Every page in this PDF errored" on any iPhone
**Root cause:** `pdfjs-dist` v4+ calls `Promise.withResolvers()` internally in the worker thread. This API was introduced in Safari 17.4 (iOS 17.4, March 2024). Any iPhone on iOS ≤ 17.3 does not have it, so the worker throws a `TypeError` immediately, causing every `page.getTextContent()` call to fail (`PAGE_ERRORS`).

**Fix:** `src/lib/pdf/textExtractor.ts`
- Added a compact `Promise.withResolvers` polyfill that runs at module-init time (covers the main thread).
- Added `buildPolyfillWorkerSrc(url)` — creates a classic blob: worker URL that injects the same polyfill via `importScripts()` _before_ the pdfjs IIFE executes in the worker thread. Main-thread polyfills cannot cross into a worker's separate global scope, so this step is necessary.
- `GlobalWorkerOptions.workerSrc` is now set to the blob wrapper URL.
- Blob worker permitted by existing `worker-src 'self' blob:` CSP directive — no config changes required.

### 2 — PDF save/download: "Failed to save" / "Failed to generate PDF" on iOS
**Root cause:** The `export-resume-pdf` Supabase edge function returns `503 text/html` when `PDF_RENDERER_URL` is not configured → `PDFServerUnavailableError`. `EditorPage.tsx` already caught this and fell back to `window.print()`. `PreviewPage.tsx` had no such handler — every throw fell through to generic error messages.

**Fix:** `src/pages/PreviewPage.tsx`
- Imported `PDFServerUnavailableError` from `@/lib/nativePdfGenerator`.
- Both `handleExport` and `handleSaveToFiles` catch blocks now check `instanceof PDFServerUnavailableError` first and call `window.print()` with a helpful toast — identical to the existing `EditorPage.tsx` pattern.

## Files changed
| File | Change |
|------|--------|
| `src/lib/pdf/textExtractor.ts` | Polyfill (main + worker), blob wrapper worker src |
| `src/pages/PreviewPage.tsx` | `PDFServerUnavailableError` import + handling in both export catch blocks |
