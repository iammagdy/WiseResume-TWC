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
* URL-based import uses the authenticated `POST /api/fetch-url` endpoint. It validates and pins each DNS resolution, follows only bounded redirects, and limits readable response types and body size before the client parses the returned text.

---

## 6. Important Rules & Constraints
* Maximum supported file size: 10MB.
* Supported formats: PDF (`.pdf`), Word (`.docx`, `.doc`).
* PDF.js worker and Tesseract OCR assets are pre-synced to `public/` during `npm run dev` and `npm run build`.
* URL imports require a current Appwrite JWT and are durably rate-limited per authenticated user. The endpoint rejects private, loopback, link-local, multicast, documentation, and other reserved network destinations; client-side URL fetch fallbacks preserve the same authenticated request contract.

---

## 7. Known Risks & Edge Cases
* Scanned image-only PDFs fall back to OCR text extraction via Tesseract worker.
* A URL host can change its DNS answers between requests. The server resolves and validates every hop, then pins that hop's outbound connection to the validated address to prevent DNS-rebinding SSRF.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md`](../reports/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md) — Parser reliability audit.
