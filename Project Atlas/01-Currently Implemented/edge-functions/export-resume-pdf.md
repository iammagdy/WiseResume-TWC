# export-resume-pdf

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/export-resume-pdf/index.ts`

---

## What it does

Server-side PDF rendering proxy for the resume editor. Forwards an HTML payload to an external Puppeteer renderer and streams the resulting PDF bytes back to the client.

**Method:** POST only
**Auth:** `requireAuth`
**Body:** `{ html, pageFormat, onePage, fitScale, showPageNumbers, showBranding, customBreakPositions, totalContentHeightPx }`

## Renderer URL

Reads `PDF_RENDERER_URL` (Supabase Edge secret). When unset, returns `503 + Content-Type: text/html` with the body `PDF_RENDERER_URL not configured`. The frontend `nativePdfGenerator.ts` detects this content-type, throws `PDFServerUnavailableError`, and `EditorPage.tsx` falls back to browser print-to-PDF.

When set, posts to `${PDF_RENDERER_URL}` with `Accept: application/pdf` and an optional `Authorization: Bearer ${PDF_RENDERER_TOKEN}`.

## Response

`200 + Content-Type: application/pdf` with the binary PDF body. Errors return 502 (renderer non-2xx with passthrough message), 400 (invalid body / empty html), 401 (auth).

## Related

- `src/lib/nativePdfGenerator.ts` — frontend client
- `src/pages/EditorPage.tsx` — fallback orchestration
- `Project Atlas/01-Currently Implemented/stability-fixes/phase-11-pdf-export-puppeteer-migration.md`
