# Feature Specification: Preview & Export

**Last Verified:** 2026-08-17
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/preview-export.md`  

---

## 1. User Goal
Allows job seekers to preview their formatted resume across multiple page layouts and export high-fidelity PDF, ATS-focused/parser-friendly PDF, DOCX, or plain-text files. ATS-focused output is designed for common parsers; compatibility with every external hiring system is not guaranteed.

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
* `src/lib/coverLetterPdfGenerator.ts` - English cover-letter PDF generation.
* `src/lib/security/pdfExportPolicy.ts` - Shared browser/server request limits, option validation, entitlement helpers, and page-label formatting.
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
* Export menus support standard PDF, one-page PDF, ATS-focused PDF, combined resume/cover-letter PDF, DOCX, printing, and plain text where the current screen provides those actions.
* Standard PDF output honors Letter/A4, page-number visibility, simple/full page-number format, and branding settings. English cover-letter PDF honors the same paper, page-label, and branding settings; Arabic cover letters use the hardened Chromium path.
* One-page PDF scales the complete rendered document into one physical page instead of discarding content after page one.
* Premium accounts with a verified subscription may remove WiseResume branding. Free, Pro, unknown, and unverified entitlement states keep branding; the authenticated PDF endpoint independently enforces this rule.
* Supports template typography selection (Inter, Playfair Display, Roboto, Outfit).
* URL actions (`/preview?id=<id>&action=download|ats-pdf|docx`) are captured at mount and converted into a user-activated fallback CTA after resume bootstrap. They intentionally do not auto-download without a user action.
* Tailoring Result exports must not rely on Preview URL actions for immediate downloads. As of 2026-07-21, `/tailoring-hub/result/:resumeId` exports ATS PDF and Word/DOCX directly from its loaded tailored resume snapshot.

---

## 6. Important Rules & Constraints
* PDF export must preserve exact CSS print styles, page margins, and font embeddings.
* Letter and A4 exports must use their true physical paper dimensions while preserving the existing resume layout coordinate system.
* Untrusted export HTML must not execute JavaScript. Renderer requests continue blocking external subresources.
* The shared PDF policy rejects invalid option types and bounds work to 6 MiB of embedded HTML, 12 pages / 12,000 DOM nodes, 8 MiB per rendered page, and 32 MiB merged output. Warm renderer processes also enforce six requests per authenticated user per minute and two concurrent renders.
* Branding removal is a verified Premium entitlement, not a general authenticated-user capability.
* ATS-facing copy must remain probabilistic (for example, ATS-focused or parser-friendly), never a universal compatibility guarantee.

---

## 7. Known Risks & Edge Cases
* Long text blocks breaking across page boundaries use `page-break-inside: avoid`.
* The rate/concurrency counters are process-local. Horizontally scaled serverless instances still require an external/shared limiter for a globally strict quota.
* PDF entitlement lookup depends on the authenticated subscription record. A failed lookup rejects an unbranded request instead of weakening the entitlement, but production deployment and live plan fixtures still require separate release verification.
* Tailoring Result ATS PDF and Word/DOCX exports were production browser verified on 2026-07-21 after Vercel deployment `dpl_8W6Dbf7G2G9EALDLx1pPQU4kfN9x`.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/auto-fit-template-audit.md`](../reports/auto-fit-template-audit.md) — Auto-fit template pagination audit.
