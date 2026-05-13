# UploadPage

**Last verified:** 2026-05-13
**Type:** reference card
**Sources:**
- `src/pages/UploadPage.tsx`
- `src/hooks/useResumeUpload.ts`
- `src/lib/pdfParser.ts`
- `src/lib/pdf/textExtractor.ts`
- `src/lib/pdf/ocrExtractor.ts`
- `src/components/upload/UploadErrorRecovery.tsx`
- `src/components/dashboard/DashboardUploadWidget.tsx`
- `appwrite-hubs/ai-gateway/src/main.js`

**Canonical owner:** this file

---

**What it is:** Existing-resume import flow for PDF, Word, image, JSON, HTML, and pasted/fetched text.

**Route(s):**
- `/upload`

**Where it lives:** `src/pages/UploadPage.tsx`

## Verified parsing pipeline

1. File/text enters `useResumeUpload`.
2. Source-specific extraction runs:
   - PDF text extraction via `src/lib/pdf/textExtractor.ts`
   - OCR fallback via `src/lib/pdf/ocrExtractor.ts`
   - Word via `mammoth`
   - HTML/URL via HTML text extraction
3. Extracted plain text is preprocessed and sent to `parseTextWithAI`.
4. `parseTextWithAI` calls Appwrite `parse-resume`, which is routed through `ai-gateway`.
5. The gateway now has a dedicated `parse-resume` path that returns normalized `ResumeData`, not a generic chat payload.
6. Frontend validates the returned shape. If the AI payload is malformed or empty, it falls back automatically to the local parser instead of failing the upload.

## Root cause fixed on 2026-05-13

Three real issues were causing CV parsing failures:

1. **Broken frontend PDF.js worker bootstrap:** `textExtractor` and `ocrExtractor` were configuring PDF.js through a blob/classic-worker wrapper that called `importScripts(...)` against a module-worker path. In real browsers this made PDF.js fall back to a fake worker and fail before parsing started, but the UI misreported that failure as file corruption.
2. **Broken backend contract:** `parse-resume` was routed through `ai-gateway`, but the gateway treated it like a generic chat request and ignored the uploaded resume text payload. That meant the frontend sometimes received a generic `{ content, providerUsed, ... }` response instead of `ResumeData`.
3. **Fragile local parser assets:** PDF.js and Tesseract runtime assets were only guaranteed during build, not during normal local development. When those assets were missing, local parsing could fail in misleading ways.

## Current behavior

- `parse-resume` in `ai-gateway` now:
  - accepts extracted resume text
  - prompts the provider with the resume parser instructions
  - parses and normalizes the returned JSON
  - returns actual `ResumeData`
- PDF.js now uses a direct module worker via `GlobalWorkerOptions.workerPort = new Worker(...)` instead of the old blob `importScripts(...)` wrapper.
- The frontend now rejects malformed/empty AI payloads and falls back to local parsing automatically.
- PDF/OCR runtime assets are now synced for:
  - `dev`
  - `start`
  - `postinstall`
  - `prebuild`
- Upload errors now distinguish real file corruption from:
  - PDF worker/bootstrap runtime failures
  - missing readable text
  - missing local parser assets
  - iPhone/Safari PDF font compatibility issues
  - OCR/browser engine failures
  - generic device/parser incompatibility

## Device support notes

- **Desktop:** text PDFs, DOCX, and images should parse through the unified pipeline.
- **iPhone / iPad:** existing PDF.js compatibility patches remain in place; users still get a dedicated Safari-specific message when font decoding fails.
- **Android:** scanned/image CVs continue to use OCR fallback when needed.

## Local setup truth

The app now depends on `scripts/copy-pdf-ocr-assets.mjs` as part of normal local setup, not only production builds. The required runtime assets are:

- `/pdfjs/cmaps/`
- `/pdfjs/standard_fonts/`
- `/tesseract/worker.min.js`
- `/tesseract/core/`
- `/tesseract/lang/eng.traineddata.gz`

If these assets are missing, the UI now reports that the upload tools are not ready on this environment instead of pretending the user's file is damaged.

## Related

- `Project Atlas/01-Currently Implemented/stability-fixes/cross-device-cv-parsing-stabilization.md`
- `Project Atlas/01-Currently Implemented/functions/parse-resume.md`
