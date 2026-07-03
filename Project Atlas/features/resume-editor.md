# Feature Specification: Resume Editor

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/resume-editor.md`  

---

## 1. User Goal
Provides job seekers with a real-time, interactive resume builder to edit personal details, work history, education, skills, projects, and custom sections with live PDF/DOM preview and AI content enhancement.

---

## 2. Routes & Navigation
* `/editor/:resumeId` — Active resume editor route.
* `/ar/editor/:resumeId` — Arabic localized resume editor route.

---

## 3. Main Frontend Files
* `src/pages/ResumeEditorPage.tsx` — Editor container and state coordinator.
* `src/components/editor/EditorForm.tsx` — Form fields for section editing.
* `src/components/editor/ResumePreview.tsx` — Real-time visual preview component.
* `src/components/editor/AIImprovementDialog.tsx` — AI rewrite and suggestion dialog.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (AI bullet point generation, content polishing, skill suggestions).
* **Collections:** `resumes`, `profiles`.
* **Storage:** `avatars` bucket.

---

## 5. Current Behavior
* Form fields update resume JSON state in real-time with auto-save to Appwrite Databases (`resumes` collection).
* Supports section reordering, custom bullet formatting, and template switching (`wiseresume-classic`, modern, executive).
* Includes light and dark editor themes with high-contrast rail styling (`--editor-rail-end`).

---

## 6. Important Rules & Constraints
* Default resume template is `wiseresume-classic`.
* Mobile screens display a minimum 44px touch target for all AI action buttons (`aria-label="Improve Summary"`).
* Textareas auto-grow based on content height.

---

## 7. Known Risks & Edge Cases
* Unsaved offline edits are synchronized upon network restoration using Appwrite document `$updatedAt` timestamp collision guards.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/audits/2026-04-22-editor-page-control-and-crash-audit.md`](../reports/audits/2026-04-22-editor-page-control-and-crash-audit.md) — Historical editor crash audit.
* [`Project Atlas/reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md`](../reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md) — Page findings report.
