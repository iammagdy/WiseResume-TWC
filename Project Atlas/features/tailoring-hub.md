# Feature Specification: Tailoring Hub

**Last Verified:** 2026-07-23
**Status:** Active Production Feature - Content-Integrity Product Bug Open
**Location:** `Project Atlas/features/tailoring-hub.md`

---

## 1. User Goal

Tailor an existing resume to a target job description while preserving factual source data, improving ATS alignment, and saving a separate child resume.

## 2. Routes

* `/tailoring-hub` - Main Tailoring workspace.
* `/ar/tailoring-hub` - Arabic localized route.
* `/tailoring-hub/result/:resumeId` - Saved tailored result, comparison, export, Editor, and Cover Letter actions.
* `/tailor` - Deprecated legacy path.

## 3. Main Frontend Files

* `src/pages/TailoringHubPage.tsx` - Input, execution, recovery, merge, save, and navigation controller.
* `src/pages/TailoringHubResultPage.tsx` - Saved result page and export owner.
* `src/lib/appwrite-functions.ts` - Async Appwrite execution and result-only recovery transport.
* `src/lib/aiTailor.ts` - Tailoring client contract and merge helpers.
* `src/lib/aiErrorParser.ts` - Safe user-facing error classification.
* `src/components/job-match/TailorResultExportPanel.tsx` - Result actions.
* `src/components/job-match/TailorQuickPdfExportDialog.tsx` - Designed PDF.

## 4. Backend and Data

* **Function:** `ai-gateway`, action `tailor-resume`.
* **Primary collection:** `resumes`.
* **Related collections:** `jobs`, `job_applications`, `idempotency_cache`, `ai_request_logs`, and `ai_credits`.
* **Legacy collection:** `tailor_history` is server-only and must not be queried by browser runtime code.
* **Lineage:** Current browser history is reconstructed from owner-scoped tailored resume metadata and parent/source lineage.

## 5. Current Execution Contract

* One user action starts one asynchronous provider execution.
* The browser waits at most `75,000 ms`; it never silently starts a second provider request.
* Backend provider work is bounded to a `68,000 ms` total budget: `42,000 ms` primary, at most one `23,000 ms` cross-provider fallback, a `5,000 ms` minimum-attempt gate, and a `2,000 ms` cleanup reserve.
* Same-provider retry and structured-output repair are disabled for Tailoring.
* If browser execution-status reads are unavailable, authenticated result-only calls retrieve the user-scoped idempotency result. They cannot invoke a provider or deduct credit.
* Duplicate clicks are blocked immediately. Concurrent identical requests receive `request_in_progress`.
* Timeout, provider failure, malformed output, and unchanged output produce actionable states. Failure paths do not save or navigate.
* A successful result creates one child resume; the source resume must remain unchanged.

## 6. Result and Export Contract

* The result page loads the saved child resume by explicit Appwrite document ID.
* Designed PDF uses `TailorQuickPdfExportDialog`.
* ATS PDF uses native PDF generation with `atsMode: true`.
* Word/DOCX uses the existing DOCX generator.
* ATS PDF and Word use duplicate-click guards and export-specific busy states.
* Result refresh and direct reopen must load the same child resume and preserve lineage.

## 7. Factual-Preservation Rules

* Tailoring may rewrite summary, role descriptions, and achievement phrasing for relevance and clarity.
* It must not invent or drop employers, titles, dates, degrees, certifications, responsibilities, or unsupported numerical achievements.
* Every source field that the result schema requires the model to preserve must be present in the model context.
* Score deltas must be calculated from actual content changes; static/fabricated score movement is prohibited.

## 8. Current Evidence and Blocker

* Tailoring result Designed PDF, ATS PDF, and Word/DOCX were production verified on 2026-07-21.
* Owner-scoped `jobs` and `job_applications` reads and removal of browser `tailor_history` reads were production verified on 2026-07-21.
* Bounded async recovery was production verified on 2026-07-23 with one provider execution and result-only recovery, one two-credit charge, and no duplicate provider work.
* A rich controlled run later on 2026-07-23 verified meaningful summary and bullet changes, one saved child resume, result navigation, refresh/reopen persistence, no duplicate provider work, and no double charge.
* That rich run confirmed a product bug: project `startDate` and `endDate` were dropped because `buildTailorMessages()` does not include project dates in the model context. The current role's empty end date was also normalized to `Present`.
* Tailoring is therefore `PRODUCT_BUG`, not `VERIFIED_READY`, until exact factual/date preservation is fixed and retested.

## 9. Evidence

* [`export-download-qa.md`](../qa/production-stabilization/export-download-qa.md)
* [`owner-permissions-realtime-csp-2026-07-21.md`](../qa/production-stabilization/owner-permissions-realtime-csp-2026-07-21.md)
* [`performance-phase-4-tailoring-remediation-2026-07-23.md`](../reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md)
* [`tailoring-meaningful-production-verification-2026-07-23.md`](../qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md)
