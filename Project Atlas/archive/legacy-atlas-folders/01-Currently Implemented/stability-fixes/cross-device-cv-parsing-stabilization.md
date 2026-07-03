# Cross-Device CV Parsing Stabilization

**Last verified:** 2026-05-13
**Type:** stability fix
**Sources:**
- `appwrite-hubs/ai-gateway/src/main.js`
- `src/lib/pdfParser.ts`
- `src/lib/pdf/runtimeAssets.ts`
- `src/lib/pdf/textExtractor.ts`
- `src/lib/pdf/ocrExtractor.ts`
- `src/hooks/useResumeUpload.ts`
- `src/components/upload/UploadErrorRecovery.tsx`
- `src/components/dashboard/DashboardUploadWidget.tsx`

**Canonical owner:** this file

---

## What was actually broken

CV parsing failures across desktop, iPhone, and Android were not caused by one single file-format issue. The verified root causes were:

1. **The frontend PDF.js worker bootstrap was broken.**
   - `src/lib/pdf/textExtractor.ts` and `src/lib/pdf/ocrExtractor.ts` were configuring PDF.js through a blob/classic-worker wrapper that injected `importScripts(...)`.
   - PDF.js was being loaded through a module-worker path, so `importScripts` was unavailable in real browsers.
   - PDF.js fell back to a fake worker and `getDocument(...)` failed before parsing started.
   - The upload UI then mislabeled that browser/runtime failure as file corruption.

2. **`parse-resume` was using the wrong backend contract.**
   - Frontend called `parse-resume` expecting `ResumeData`.
   - `parse-resume` was routed through `ai-gateway`.
   - `ai-gateway` treated it as a generic chat feature, ignored the `text` payload, and returned a generic `{ content, providerUsed, modelUsed }` response.
   - Because the frontend saw an HTTP success, it treated that malformed payload like a valid resume parse unless later heuristics caught it.

3. **Local parser assets were not guaranteed outside production builds.**
   - PDF.js and Tesseract assets were copied during `prebuild`, but not as part of normal local development startup.
   - On any environment missing those assets, the parser could fail before it even had a fair chance to read the file.

3. **The compact dashboard error UI was overstating corruption.**
   - Multiple non-corruption failures collapsed into the same "The file may be damaged" message.

## What changed

### Backend
- `ai-gateway` now has a dedicated `parse-resume` request path.
- It builds resume-parser messages from the extracted text.
- It parses provider output as JSON and normalizes it into the app's `ResumeData` structure.
- It rejects malformed or empty parser output instead of returning generic chat payloads.

### Frontend parser safety
- Replaced the old blob `importScripts(...)` worker wrapper with a direct module-worker setup through `GlobalWorkerOptions.workerPort`.
- Real browser verification against `tests/e2e/fixtures/sample-resume.pdf` now reaches successful PDF extraction and successful `parseResumePDF(...)` completion.
- `parseTextWithAI` now validates that the Appwrite response is actually resume-shaped.
- If the AI response is malformed or effectively empty, the frontend falls back automatically to the local parser.
- This protects PDF, Word, image/OCR, HTML, URL, onboarding, and other import surfaces that share the same parser utility.

### Runtime asset safety
- Added shared runtime asset checks for:
  - PDF.js cmaps
  - PDF.js standard fonts
  - Tesseract worker
  - Tesseract core
  - English OCR language data
- Asset sync now runs in `dev`, `start`, `postinstall`, and `prebuild`.
- Missing assets now surface as a setup/environment problem, not a fake damaged-file error.

### Error language
- Real corruption stays mapped to corruption.
- PDF worker/bootstrap failures now surface as a parser runtime problem instead of a damaged-file claim.
- Missing text, missing local parser assets, Safari/iPhone PDF compatibility, and OCR browser failures now keep their own messages.
- Dashboard and full upload recovery now share the same error copy source.

## Verification

- `npm exec tsc -- --noEmit`
- `node scripts/copy-pdf-ocr-assets.mjs`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local asset endpoints return `200`:
  - `/pdfjs/cmaps/Adobe-Japan1-1.bcmap`
  - `/pdfjs/standard_fonts/FoxitFixed.pfb`
  - `/tesseract/worker.min.js`
  - `/tesseract/lang/eng.traineddata.gz`
- Verified in a real browser context that:
  - `extractTextFromPDF(sample-resume.pdf)` succeeds
  - `parseResumePDF(sample-resume.pdf)` returns `success: true`, `needsOCR: false`

## Remaining truth

- A fresh unauthenticated browser session redirects `/upload` to login, so the final live upload flow still depends on being signed in during manual QA.
- OCR and PDF parsing are now materially more reliable across devices, but low-quality scans can still fail honestly when there is not enough readable text to recover.
