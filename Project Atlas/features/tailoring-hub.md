# Feature Specification: Tailoring Hub (AI Resume Tailoring)

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/tailoring-hub.md`  

---

## 1. User Goal
Enables job seekers to tailor an existing resume against a target job description, generating ATS keyword optimizations, score deltas, and tailored summary/experience suggestions.

---

## 2. Routes & Navigation
* `/tailoring-hub` — Main AI tailoring route.
* `/ar/tailoring-hub` — Arabic localized AI tailoring route.

---

## 3. Main Frontend Files
* `src/pages/TailoringHubPage.tsx` — Main tailoring controller and job description input interface.
* `src/components/tailoring/TailorScoreDelta.tsx` — Visual score improvement indicator.
* `src/components/tailoring/DiffViewer.tsx` — Rich diff viewer comparing base resume vs tailored resume.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (handles ATS keyword extraction, matching score calculation, and tailoring generation).
* **Collections:** `resumes`, `tailor_history`.

---

## 5. Current Behavior
* User selects a base resume and pastes target job description text.
* Calls `ai-gateway` which returns calculated ATS score delta (e.g. 50 → 85), keyword match breakdown, and suggested bullet rewrites.
* Tailoring history runs are persisted to `tailor_history` collection.
* Guardrail: If no meaningful changes are detected, an amber warning ("No changes detected", Retry / Edit) is displayed.

---

## 6. Important Rules & Constraints
* Legacy `/tailor` path is deprecated; all resume tailoring operates via `/tailoring-hub`.
* `ai-gateway` must return genuine calculated score deltas or `null` if unchanged; fabricating fake static scores (e.g. 55→78) is strictly prohibited.

---

## 7. Known Risks & Edge Cases
* Requires valid job description text (>50 characters) to initiate AI analysis.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/historical-audits/one-page-wizard-analysis.md`](../archive/one-page-wizard-analysis.md) — Historical one-page wizard analysis.
* [`Project Atlas/qa/WiseResume_Comprehensive_QA_Fix_Report_2026-07-02.md`](../qa/WiseResume_Comprehensive_QA_Fix_Report_2026-07-02.md) — Tailoring Hub QA verification.
