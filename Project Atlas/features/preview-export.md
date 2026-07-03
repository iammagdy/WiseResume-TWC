# Feature Specification: Preview & Export

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/preview-export.md`  

---

## 1. User Goal
Allows job seekers to preview their formatted resume across multiple page layouts and export high-fidelity, ATS-compliant PDF files or plain text formats.

---

## 2. Routes & Navigation
* `/preview/:resumeId` — Full-page resume preview route.
* `/ar/preview/:resumeId` — Arabic localized resume preview route.

---

## 3. Main Frontend Files
* `src/pages/ResumePreviewPage.tsx` — Full-page preview component.
* `src/components/preview/PDFExporter.tsx` — Client-side HTML-to-PDF / Puppeteer export trigger.
* `server/index.js` — Utility server handling server-side Puppeteer PDF generation.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `pdf-generator` (optional serverless PDF renderer).
* **Collections:** `resumes`.

---

## 5. Current Behavior
* Provides multi-page paginated print preview with page-break indicators.
* Export menu supports Downloading ATS PDF, Printing directly, or copying Plain Text.
* Supports template typography selection (Inter, Playfair Display, Roboto, Outfit).

---

## 6. Important Rules & Constraints
* PDF export must preserve exact CSS print styles, page margins, and font embeddings.
* No watermark for authenticated users.

---

## 7. Known Risks & Edge Cases
* Long text blocks breaking across page boundaries use `page-break-inside: avoid`.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/auto-fit-template-audit.md`](../reports/auto-fit-template-audit.md) — Auto-fit template pagination audit.
