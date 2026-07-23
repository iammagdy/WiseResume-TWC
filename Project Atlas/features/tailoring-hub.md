# Feature Specification: Tailoring Hub (AI Resume Tailoring)

**Last Verified:** 2026-07-23
**Status:** Active Production Feature - Bounded Recovery Verified
**Location:** `Project Atlas/features/tailoring-hub.md`  

---

## 1. User Goal
Enables job seekers to tailor an existing resume against a target job description, generating ATS keyword optimizations, score deltas, and tailored summary/experience suggestions.

---

## 2. Routes & Navigation
* `/tailoring-hub` — Main AI tailoring route.
* `/ar/tailoring-hub` — Arabic localized AI tailoring route.
* `/tailoring-hub/result/:resumeId` - Tailored resume result route with export actions.

---

## 3. Main Frontend Files
* `src/pages/TailoringHubPage.tsx` — Main tailoring controller and job description input interface.
* `src/pages/TailoringHubResultPage.tsx` - Tailored result page controller and export action owner.
* `src/components/job-match/TailorResultExportPanel.tsx` - Result page export action panel.
* `src/components/job-match/TailorQuickPdfExportDialog.tsx` - Designed PDF export dialog used by the result page.
* `src/components/tailoring/TailorScoreDelta.tsx` — Visual score improvement indicator.
* `src/components/tailoring/DiffViewer.tsx` — Rich diff viewer comparing base resume vs tailored resume.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (handles ATS keyword extraction, matching score calculation, and tailoring generation).
* **Collections:** `resumes`, `jobs`, `job_applications`. `tailor_history` exists as legacy server-only history and is not a browser runtime dependency.

---

## 5. Current Behavior
* **Standard Tailoring:** User selects a base resume and pastes target job description text. Calls `ai-gateway` which returns calculated ATS score delta (e.g. 50 -> 85), keyword match breakdown, and suggested bullet rewrites. Current browser history surfaces are reconstructed from owner-scoped tailored resume lineage and tailoring metadata. If no changes are detected, an amber warning is displayed.
* **Execution and Recovery:**
  - A user action starts one asynchronous `ai-gateway` provider execution. The browser never automatically starts another provider request.
  - The total frontend wait is capped at 75 seconds. Cancellation stops the local wait without deleting a successful server result.
  - When browser execution-status reads are unavailable, the client retrieves the authenticated, user-scoped result from the existing idempotency cache. Result-only calls cannot invoke a provider or deduct credit.
  - Timeout, provider failure, malformed output, and unchanged output all return actionable retry/edit states. Failure paths do not save a tailored resume or navigate to an empty result.
  - Duplicate clicks are blocked immediately. Concurrent identical requests receive `request_in_progress` rather than creating duplicate provider work.
* **Tailored Result Exports:**
  - Designed PDF opens `TailorQuickPdfExportDialog` with the explicit tailored resume document ID and downloads from the dialog's user-activated action.
  - ATS PDF exports directly from `TailoringHubResultPage.tsx` using the loaded tailored resume snapshot, native PDF generation, and `atsMode: true`.
  - Word/DOCX exports directly from `TailoringHubResultPage.tsx` using the loaded tailored resume snapshot and the existing DOCX generator.
  - ATS PDF and Word/DOCX use duplicate-click guards and export-specific busy states in `TailorResultExportPanel.tsx`.
* **Fast Tailoring (One-Click from `/jobs`):**
  - Directly tailors the user's default master CV (or prompts a choice if multiple exist) against the selected remote job description in one click.
  - Concurrently triggers CV tailoring and cover letter generation in parallel.
  - Automates entry creation in `job_applications` tracker collection with status `ready_to_apply`.
  - Automatically handles locks (`isTailoringRef`) to block double-click concurrency and optimistic daily credit limits validation (`checkCredits()`).

---

## 6. Important Rules & Constraints
* Legacy `/tailor` path is deprecated; all resume tailoring operates via `/tailoring-hub`.
* Browser code must not query legacy `tailor_history`; it is intentionally server-only.
* `ai-gateway` must return genuine calculated score deltas or `null` if unchanged; fabricating fake static scores (e.g. 55→78) is strictly prohibited.
* Tailoring backend work must remain within the approved 68-second total budget: 42-second primary attempt, at most one 23-second cross-provider fallback, and cleanup reserve.
* Provider/model routing, prompt behavior, merge semantics, score behavior, and credit cost must not be changed as part of timeout/recovery maintenance without separate evidence and approval.
* Successful and failed outcomes use the existing `idempotency_cache`; no new Tailoring idempotency schema is required.

---

## 7. Known Risks & Edge Cases
* Requires valid job description text (>50 characters) to initiate AI analysis.
* Tailored Result Designed PDF, ATS PDF, and Word/DOCX exports were production browser verified on 2026-07-21 after Vercel deployment `dpl_8W6Dbf7G2G9EALDLx1pPQU4kfN9x`.
* Owner-scoped Appwrite reads for Tailoring Hub related `jobs` and `job_applications` were production browser verified on 2026-07-21 after Vercel deployment `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p`.
* Bounded async recovery was production verified on 2026-07-23. One provider execution completed in `4.754 s`, its result-only retrieval completed in `3.653 s`, and exactly one two-credit charge was recorded.
* The post-fix production fixture reached the legitimate unchanged-output guard. New meaningful result creation/navigation remains pending one richer controlled QA fixture.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/archive/historical-audits/one-page-wizard-analysis.md`](../archive/historical-audits/one-page-wizard-analysis.md) — Historical one-page wizard analysis.
* [`Project Atlas/reports/ui-ux/auto-fit-template-audit.md`](../reports/ui-ux/auto-fit-template-audit.md) — Auto-fit template audit writeup.
* [`Project Atlas/reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md`](../reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md) - Bounded execution, recovery, deployment, and production evidence.
