# WiseResume Credentialed E2E Remediation — 2026-07-02

## Verdict

`READY_WITH_WARNINGS`

The two verified P1 findings from the fresh credentialed pass are repaired locally and covered by regression tests. Authentication and disposable editor persistence passed live production verification. Fresh export files and upload parsing remain unproven because the in-app browser did not expose a working file attachment path and its download event produced no saved file.

## What was tested

- Fresh logout, invalid login, valid login, and session persistence after refresh.
- Disposable resume education and skills editing, autosave, and refresh persistence.
- One editor AI summary action on the Premium QA account.
- Tailoring history persistence design, result-page refresh fallback, and legacy history compatibility through focused tests.
- Arabic guides, guide detail, and examples route behavior.
- Production export dialog and Designed PDF download initiation.
- TypeScript, production build, focused regression tests, and whitespace validation.

## Passed

- Logout returned to the public landing page.
- Invalid credentials produced the inline message `Invalid email or password. You can reset your password if needed.`
- Valid login reached `/dashboard`; refresh retained the authenticated session.
- Education (`QA Test University`, `Bachelor of Engineering`, `Software Quality`) and skill (`Playwright QA 2026`) edits survived refresh.
- Premium AI usage remained an unlimited plan; no numeric credit deduction or double deduction was displayed.
- Tailoring no longer attempts the forbidden browser write to the server-only `tailor_history` collection. Compact job, score, section, lineage, and result metadata is saved on the tailored resume and synthesized into history.
- Arabic guide/example routes now show an honest Arabic review shell instead of English content under RTL. English routes remain unchanged.

## Failed or blocked

- Fresh upload parsing: blocked because the connected in-app browser exposes no supported file-input attachment method.
- Fresh export evidence: the export dialog and final Designed PDF control rendered, but waiting for the browser download event timed out and no new file appeared in Downloads. ATS PDF and DOCX were therefore not claimed as fresh evidence.
- Public contact form: not repeated; the earlier fresh pass remains blocked by the security challenge in this browser environment.
- Tailoring live post-deploy run: a second paid AI run was not performed; focused regression coverage proves the new storage path and production deployment completed successfully.

## Findings and fixes

### P1 — Tailoring history used a client write forbidden by collection permissions

- Steps: complete a Tailoring Hub run; observe successful tailored resume followed by a warning that history storage failed.
- Evidence: the collection contract is server-write-only while `TailoringHubPage` called `createDocument` from the browser.
- Root cause: the browser attempted a write it can never be authorized to perform.
- Files: `src/pages/TailoringHubPage.tsx`, `src/hooks/useCombinedTailorHistory.ts`, `src/pages/TailoringHubResultPage.tsx`, `src/lib/tailoringResumeMetadata.ts`, `src/types/resume.ts`.
- Fix: persist compact metadata in the already-authorized tailored resume document, derive history from resumes, and retain legacy history reads only as fallback. No permission weakening or Appwrite deployment is required.

### P1 — Arabic public guide/example routes rendered English as Arabic

- Steps: open `/ar/guides`, `/ar/guides/:slug`, or `/ar/examples`.
- Evidence: English headings, filters, and content rendered inside an RTL document.
- Root cause: these pages did not branch on locale and no reviewed Arabic content library exists.
- Files: `src/pages/GuidesPage.tsx`, `src/pages/GuidePage.tsx`, `src/pages/ExamplesPage.tsx`.
- Fix: render a clear Arabic review-status shell until professionally reviewed Arabic content exists; do not machine-present English content as localized.

## Tests run

- `npx tsc --noEmit` — pass.
- `npm run build` — pass; existing chunk-size and stale Browserslist warnings only.
- Focused Vitest: 3 files, 14 tests — pass.
- `git diff --check` — pass; line-ending notices only.

## Export file evidence

No fresh files are claimed in this run. Historical July 1 evidence remains: Designed PDF 158,029 bytes, ATS PDF 54,984 bytes, DOCX 8,109 bytes; those files were previously validated structurally.

## Remaining risks

- Repeat all three downloads and PDF/DOCX structure checks in a browser profile with reliable download capture.
- Repeat PDF and DOCX upload parsing with supported file attachment.
- Repeat the public contact security challenge in an environment where it loads.
- Arabic legal and long-form career content still requires professional owner/legal review.

## Repository state

At the start of remediation, local `main` was one commit ahead of `origin/main` (`a7375242` over `8a1957dc`). Remediation commit `227e31d4` was pushed, Vercel production deployment `dpl_Gtfc8YqNuSLZqontqbQBGjdpURsa` reached `READY`, and `/ar/guides`, `/ar/guides/:slug`, and `/ar/examples` were verified live. Local `main` equalled `origin/main` after the push.
