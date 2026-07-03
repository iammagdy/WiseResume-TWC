# Feature Specification: Cover Letters

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/cover-letters.md`  

---

## 1. User Goal
Enables job seekers to generate tailored, professional cover letters matched to specific job descriptions and resume profiles.

---

## 2. Routes & Navigation
* `/cover-letters` — Cover letters listing & generator route.
* `/ar/cover-letters` — Arabic localized cover letters route.

---

## 3. Main Frontend Files
* `src/pages/CoverLettersPage.tsx` — Cover letter list and editor container.
* `src/components/cover-letter/CoverLetterForm.tsx` — Customization form.
* `src/components/cover-letter/CoverLetterPreview.tsx` — Formatted letter preview.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (generates cover letter body, tone selection, and opening hooks).
* **Collections:** `cover_letters`, `resumes`, `profiles`.

---

## 5. Current Behavior
* User selects a target resume and inputs company name + job title.
* AI generates 3 customizable opening hooks (formal, energetic, direct).
* Supports instant export to PDF or copying raw text.

---

## 6. Important Rules & Constraints
* Tone options include Professional, Creative, Executive, and Concise.

---

## 7. Known Risks & Edge Cases
* Tone changes re-prompt `ai-gateway` for paragraph regeneration.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md`](../reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md) — Cover letter findings.
