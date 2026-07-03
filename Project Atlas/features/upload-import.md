# Feature Specification: CV Upload & Extraction

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/upload-import.md`  

---

## 1. User Goal
Allows job seekers to upload existing CV documents (PDF, DOCX) and automatically extract contact details, experience, education, and skills into structured resume drafts.

---

## 2. Routes & Navigation
* `/import` — CV import route.
* `/ar/import` — Arabic localized CV import route.

---

## 3. Main Frontend Files
* `src/pages/ImportPage.tsx` — Upload drag-and-drop container.
* `src/lib/parsers/pdfParser.ts` — Browser-side PDF text extraction using PDF.js.
* `src/lib/parsers/docxParser.ts` — Browser-side DOCX extraction using Mammoth.js.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (normalizes extracted raw text into structured JSON schema).
* **Collections:** `resumes`, `profiles`.
* **Storage:** Temporary upload processing.

---

## 5. Current Behavior
* User drops a PDF or DOCX document into the import drag zone.
* Browser extracts raw text using client-side PDF.js / Mammoth.js parsers.
* Extracted text is sent to `ai-gateway` for schema extraction and structured resume draft creation.

---

## 6. Important Rules & Constraints
* Maximum supported file size: 10MB.
* Supported formats: PDF (`.pdf`), Word (`.docx`, `.doc`).
* PDF.js worker and Tesseract OCR assets are pre-synced to `public/` during `npm run dev` and `npm run build`.

---

## 7. Known Risks & Edge Cases
* Scanned image-only PDFs fall back to OCR text extraction via Tesseract worker.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md`](../reports/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md) — Parser reliability audit.
