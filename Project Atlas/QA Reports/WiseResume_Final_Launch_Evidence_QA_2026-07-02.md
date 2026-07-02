# WiseResume Final Launch Evidence QA — 2026-07-02

## Verdict

`LAUNCH_READY`

The remaining file-handling evidence was completed with a fresh credentialed production session. Two export defects found during this pass were fixed, regression-tested, deployed, and reverified against `https://wiseresume.app`. No unresolved P0 or P1 issue remains in the tested scope.

## Scope and safety

- Production target: `https://wiseresume.app`
- Branch: `main`
- Disposable resume: `Jordan QA Candidate`
- Payments were not tested, accounts were not deleted, and no destructive admin/devkit action was performed.
- No credentials are included in this report or its evidence files.

## Upload evidence

Both files were attached through a real browser file input and parsed by production:

- PDF fixture: `tests/e2e/.artifacts/final-qa-resume.pdf`, 2,002 bytes, one valid PDF page with 498 extractable characters.
- DOCX fixture: `tests/e2e/.artifacts/final-qa-resume.docx`, 37,007 bytes, valid Office Open XML package.
- PDF and DOCX each reached `AI Analysis Complete`, displayed review guidance, imported selected data, continued to `/editor`, and displayed `Import complete` plus `Resume created`.
- Parsed contact information, summary, experience, education, and skills were present in the editor. Review warnings were explicit for fields that required confirmation.
- Screenshots: `upload-pdf-before.png`, `upload-pdf-attached.png`, `upload-pdf-result.png`, `upload-pdf-editor.png`, `upload-docx-before.png`, `upload-docx-attached.png`, `upload-docx-result.png`, and `upload-docx-editor.png` under `tests/e2e/.artifacts/final-launch-evidence/`.

## Fresh export evidence

Final production evidence was captured after deployment `dpl_65gKMajyQgySLU81CRCugoC9trHZ` reached `READY` for commit `8a0be13f`:

| Export | Saved file | Size | Validation |
|---|---|---:|---|
| Designed PDF | `tests/e2e/.artifacts/final-launch-evidence/fresh-designed.pdf` | 28,441 bytes | `%PDF-` signature; one page; full summary text extracted; rendered and visually inspected |
| ATS PDF | `tests/e2e/.artifacts/final-launch-evidence/fresh-ats.pdf` | 29,165 bytes | `%PDF-` signature; one page; full summary text extracted; rendered and visually inspected |
| DOCX | `tests/e2e/.artifacts/final-launch-evidence/fresh-resume.docx` | 8,277 bytes | ZIP signature; 20 package entries; no corrupt entry; required content, document, and styles parts present |

All three files were captured from actual browser download events with downloads enabled and saved explicitly. Both PDF API calls returned HTTP 200. The final renders are `fresh-designed-render.png` and `fresh-ats-render.png` in the same evidence directory.

## Portfolio contact evidence

- Public portfolio: `/p/explore-test-123-updated-001`.
- The contact form rendered and accepted disposable input. Submission remained disabled until the security challenge completed.
- Cloudflare Turnstile resources loaded, but the automated browser environment received challenge endpoint HTTP 400 responses. The product displayed `Security check failed to load. Refresh the page and try again.` and did not send a message.
- Classification: environment/challenge limitation, not a verified product defect. The UI failed closed and did not claim success.
- The public DOM exposed none of the checked private values: owner email, `user_id`, `password_hash`, `portfolio_settings`.
- Evidence: `tests/e2e/.artifacts/final-launch-evidence/portfolio-contact.json` and `portfolio-contact-challenge.png`.

## Defects found and resolved

### P2 — footer-only second PDF page

- Reproduction: a short resume exported as two PDF pages; page two contained only footer output.
- Root cause: `api/export/pdf-native.ts` and `server/index.ts` promoted the full-page layout sentinel into content height after computing the trimmed height.
- Fix: keep raw layout height only for custom-break validation and use measured/trimmed content height for pagination.
- Regression: `src/lib/security/pdfNativeTrimmedHeight.test.ts`.
- Commit: `29b0c16e` (`fix(pdf): prevent footer-only export pages`).

### P1 — fixed-width template text clipped in PDFs

- Reproduction: the source summary ended with `release confidence.`, while the production PDF clipped the line horizontally.
- Root cause: the cloned export root was resized from 816px to 612px but the fixed-width `.wrc-page` child remained 816px and was clipped by the native canvas.
- Fix: `src/lib/exportDomUtils.ts` now fits descendants that match the source root width to the export target width.
- Regression: `src/lib/exportDomUtils.test.ts` proves an 816px fixed-width child is fitted to 612px.
- Commit: `8a0be13f` (`fix(pdf): fit fixed-width templates to export canvas`).
- Production verification: both final PDFs contain and visibly render the complete summary, with one page and no footer-only page.

## Earlier fresh credentialed coverage retained from this QA sequence

- Auth/session: failed-login inline error, fresh login, refresh persistence, logout, and second login passed.
- Editor: disposable create/edit, autosave, refresh persistence, summary, experience, education, and skills passed.
- AI credits: one usable editor AI action passed; the account showed `Unlimited` before and after, so no numeric double deduction occurred.
- Tailoring Hub: meaningful live changes, honest 50-to-85 score increase, refresh, direct result URL, and legacy `/tailor` passed after the history repair.
- Portfolio publish, public access, password protection, correct/wrong password behavior, and restoration to public access passed.
- Arabic/RTL: the checked public/authenticated surfaces did not break; reviewed Arabic guide/example status shells prevent false English-as-Arabic content.

## Validation

- `npx tsc --noEmit` — PASS
- `npm run build` — PASS
- Focused export regression suites — PASS (including an earlier 3-file/27-test run and the final 3-file/8-test fix run)
- `git diff --check` — PASS before each product commit
- Production deployment `dpl_65gKMajyQgySLU81CRCugoC9trHZ` — `READY`, aliased to `wiseresume.app`

## Remaining risks

- Automated contact submission cannot be positively proven while Turnstile rejects the automation environment. The observed product behavior is safe and explicit; a final human-browser challenge completion remains desirable but is not a verified launch blocker.
- Existing console warnings include blocked GeoJS/realtime connections and authorization warnings on optional account/history reads. They did not prevent the tested upload/export paths, but should remain in the post-launch observability backlog.
- Arabic export was not repeated in this final file-evidence run; valid Arabic production export evidence from 2026-07-01 remains the most recent evidence.

## Repository state

Product commits were pushed to `origin/main`. Documentation is committed separately after this report. Final synchronization is recorded in the handoff and final response.
