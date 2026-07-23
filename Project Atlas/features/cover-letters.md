# Feature Specification: Cover Letters

**Last Verified:** 2026-07-23
**Status:** Active Production Feature - Premium Persistence Evidence Reconciled
**Location:** `Project Atlas/features/cover-letters.md`

---

## 1. User Goal

Enables job seekers to generate, save, edit, and export a professional Cover Letter matched to a resume and target job.

## 2. Routes and Navigation

* `/cover-letters` - Cover Letter library.
* `/cover-letter/new` - Pro/Premium generation and save route.
* `/cover-letter/edit/:id` - Owner-scoped edit, preview, export, and delete route.
* `/cover-letter` - Legacy redirect.

## 3. Main Frontend Files

* `src/pages/CoverLettersPage.tsx` - Library/list surface.
* `src/pages/CoverLetterNewPage.tsx` - Generation, preview, save, copy, and PDF flow.
* `src/pages/CoverLetterEditPage.tsx` - Owner-scoped edit, autosave, retarget, preview, and delete flow.
* `src/components/cover-letter/CoverLetterPreview.tsx` - Formatted preview.
* `src/hooks/useCoverLetters.ts` - Owner-scoped list/read/create/update/delete operations.

## 4. Appwrite Functions and Collections

* **Function:** `ai-gateway`, action `generate-cover-letter`.
* **Collections:** `cover_letters`, `resumes`, and `profiles`.

## 5. Current Behavior

* Pro/Premium users select a resume and provide job title, company, job description, tone, and template style.
* `ai-gateway` returns non-empty Cover Letter content and may return the saved document ID.
* The new route supports preview, edit, copy, PDF export, regeneration, owner-scoped save, and return to a linked Tailoring result.
* The edit route supports debounced content updates, explicit save, template changes, PDF export, retargeting to a new job description, and delete.

## 6. Rules and Constraints

* Current generation tones are Professional, Enthusiastic, and Conversational.
* Current template styles come from `COVER_LETTER_TEMPLATE_OPTIONS`.
* New browser-created documents must have owner-only read/update/delete permissions.
* Browser code must never expose provider keys, complete prompts, or raw provider responses.

## 7. Known Risks and Evidence

* Generation and retargeting consume the current server-defined `generate-cover-letter` credit cost.
* A reconciled Premium production record proves generation, save, update, durable persistence, correct ownership, and one two-credit charge.
* The exact original live refresh/reopen trace is `UNKNOWN` because it was not retained. This is an evidence limitation, not a current access blocker.

## 8. Evidence

* [`premium-cover-letter-production-verification-2026-07-21.md`](../qa/production-stabilization/premium-cover-letter-production-verification-2026-07-21.md)
* [`03_PAGE_BY_PAGE_FINDINGS.md`](../archive/historical-audits/UI_UX_AUDIT_2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md)
