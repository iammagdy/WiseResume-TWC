# Feature Specification: Preview & Export

**Last Verified:** 2026-07-21
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/preview-export.md`  

---

## 1. User Goal
Allows job seekers to preview their formatted resume across multiple page layouts and export high-fidelity, ATS-compliant PDF files or plain text formats.

---

## 2. Routes & Navigation
* `/preview/:resumeId` — Full-page resume preview route.
* `/ar/preview/:resumeId` — Arabic localized resume preview route.
* `/preview?id=<resumeId>&action=download|ats-pdf|docx` - Preview bootstrap URL-action route with user-activated fallback export CTA.

---

## 3. Main Frontend Files
* `src/pages/PreviewPage.tsx` - Full-page preview route and URL-action bootstrap owner.
* `src/components/editor/ExportOptionsSheet.tsx` - Editor/preview export menu.
* `src/lib/nativePdfGenerator.ts` - Browser-to-native-PDF export orchestration.
* `src/lib/docxGenerator.ts` - Client-side DOCX export generation.
* `src/lib/downloadUtils.ts` - Download validation and platform-specific save helper.
* `server/index.ts` and `api/export/pdf-native.ts` - Local/Vercel native PDF endpoint implementations.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `pdf-generator` (optional serverless PDF renderer).
* **Collections:** `resumes`.

---

## 5. Current Behavior
* Provides multi-page paginated print preview with page-break indicators.
* Export menu supports Downloading ATS PDF, Printing directly, or copying Plain Text.
* Supports template typography selection (Inter, Playfair Display, Roboto, Outfit).
* URL actions (`/preview?id=<id>&action=download|ats-pdf|docx`) are captured at mount and converted into a user-activated fallback CTA after resume bootstrap. They intentionally do not auto-download without a user action.
* Tailoring Result exports must not rely on Preview URL actions for immediate downloads. As of 2026-07-21, `/tailoring-hub/result/:resumeId` exports ATS PDF and Word/DOCX directly from its loaded tailored resume snapshot.

---

## 6. Important Rules & Constraints
* PDF export must preserve exact CSS print styles, page margins, and font embeddings.
* No watermark for authenticated users.

---

## 7. Known Risks & Edge Cases
* Long text blocks breaking across page boundaries use `page-break-inside: avoid`.
* Tailoring Result ATS PDF and Word/DOCX exports were production browser verified on 2026-07-21 after Vercel deployment `dpl_8W6Dbf7G2G9EALDLx1pPQU4kfN9x`.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/auto-fit-template-audit.md`](../reports/auto-fit-template-audit.md) — Auto-fit template pagination audit.
