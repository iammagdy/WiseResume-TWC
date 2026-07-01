# WiseResume Fresh Credentialed E2E QA - 2026-07-02

## Verdict

**NOT_READY**

The fresh credentialed pass proved the principal account, editor AI, live tailoring, and portfolio flows. It also found two verified P1 launch warnings and could not produce fresh upload/download file evidence in the available in-app browser.

## What was tested

- Invalid login feedback, fresh login, refresh persistence, logout, and re-login.
- Disposable resume creation and Editor summary/experience persistence.
- One Editor AI summary improvement and Premium usage state before/after.
- Live Tailoring Hub run, comparison honesty, direct result URL, refresh, and legacy `/tailor`.
- Designed PDF and ATS PDF navigation through their final download controls.
- Portfolio publish, public route, password protection, wrong/correct password, public restoration, and visible private-field checks.
- Public contact-form validation/security state.
- Arabic landing, guides, examples, privacy, upload, editor, and Tailoring Hub route behavior.

## What passed

- Failed login produced an inline alert and toast without leaving the login form.
- Login, reload persistence, logout, and second login passed.
- `QA Launch Readiness 2026-07-02` was created as resume 36.
- The summary and experience content persisted after refresh.
- AI changed the summary from a short baseline to a recruiter-ready version while retaining the 5+ years and 40% regression reduction facts.
- Premium usage displayed `AI Credits (today): Unlimited` before and after; a numeric single/double deduction cannot be observed on an unlimited plan.
- Tailoring changed the summary, Skills, and Experience. The UI showed 50 before, 85 after, and +35. Added terms included SaaS, Playwright/Cypress, TypeScript, API testing, GitHub Actions, accessibility, and quality metrics.
- Tailoring result `6a459e7c002c3d85f954` survived refresh and direct navigation. `/tailor` remained available.
- Portfolio publish succeeded. `/p/explore-test-123-updated-001` rendered the selected tailored resume.
- Password protection rejected an incorrect password with clear feedback and accepted the temporary QA password. Public access was restored afterward.
- The rendered public DOM contained no owner email, `user_id`, `password_hash`, or `portfolio_settings` strings.
- Arabic landing and privacy pages rendered localized RTL content without sampled horizontal overflow.

## Findings

| ID | Severity | Area | Steps and evidence | Expected | Actual | Likely root cause / files | Recommendation | Fixed |
|---|---|---|---|---|---|---|---|---|
| E2E-01 | P1 | Tailoring history | Run live tailoring from `/tailoring-hub`. The result succeeds, then a toast states that the tailored resume may not appear until history storage is fixed. Hub showed zero history before the run. | Every successful run appears in Tailoring history. | Result resume and direct URL persist, but history storage is knowingly degraded. | Appwrite `tailor_history` permissions/schema/write path; `src/hooks/useCombinedTailorHistory.ts`, `src/pages/TailoringHubPage.tsx`, and the tailoring persistence path. | Trace the history write response, verify collection permissions/attributes, add a regression test, and deploy only the targeted Appwrite hub if hub code changes. | No |
| E2E-02 | P1 | Arabic public content | Open `/ar/guides` and `/ar/examples`. | Arabic routes show coherent Arabic content and controls. | Both routes set RTL but render English headings, filters, and cards. | English-only guide/example catalogs or missing locale mapping in `src/pages/GuidesPage.tsx`, `src/pages/ExamplesPage.tsx`, `src/lib/guidesData.ts`, and example data. | Add Arabic catalogs/data or intentionally redirect to English without claiming Arabic parity; add route-level render tests. | No |
| E2E-03 | P2 | Arabic authenticated switching | Open `/ar`, then authenticated `/upload`, `/editor`, and `/tailoring-hub`. Inspect Settings language controls. | A supported Arabic mode remains selectable in the signed-in app. | Authenticated routes reverted to English; `LanguageSwitcher` is hidden when `feature_arabic_locale` is false. | Production app-setting/rollout state in `AppearanceSection` and locale synchronization. | Confirm intended rollout state and enable only after Arabic authenticated coverage is approved. | No |
| E2E-04 | P2 | Tailored exports | Reach Designed PDF and ATS PDF final download controls and wait for download events/files. | Real non-trivial files are saved and observable. | No download event or new file was visible to this in-app browser. The UI emitted no false success toast. | Browser download capture/permission limitation remains possible; product regression is not proven because July 1 clean-profile downloads passed. | Re-run in a Chromium profile with downloads explicitly enabled; inspect response and artifact before changing code. | No |
| E2E-05 | P2 | Upload parsing | Open `/upload`; PDF and Word are advertised. | Attach disposable PDF/DOCX and verify editor parsing. | Native file attachment is not exposed by the in-app browser interface. | Test-environment limitation, not a verified application defect. | Re-run with an attachment-capable browser profile and controlled fixtures. | No |
| E2E-06 | P2 | Portfolio contact | Fill valid disposable contact data. | Security challenge loads and submission can complete. | Challenge was blocked by the browser environment; the form stayed disabled and showed clear recovery instructions. | Browser/ad-blocker challenge loading. | Re-run without the blocking extension; investigate CSP/challenge configuration only if reproducible there. | No |

## Export evidence

- Fresh Designed PDF: final download control reached; no captured event or saved file. Not counted as passed.
- Fresh ATS PDF: final `Download ATS PDF` control reached; no captured event or saved file. Not counted as passed.
- Fresh DOCX: not claimed.
- Historical July 1 evidence remains: Designed PDF 101,012 bytes, ATS PDF 25,367 bytes, DOCX 8,109 bytes. Those files are not substituted for fresh evidence in this verdict.

## Partial or blocked checks

- PDF and DOCX upload parsing: blocked by missing native file attachment support.
- Education and Skills manual editing: not completed; summary and experience were completed and persisted.
- Numeric credit-deduction count: unavailable because Premium reports unlimited usage.
- Contact submission: blocked by security challenge loading; input validation and recovery messaging passed.
- Arabic export: not attempted because fresh download capture was unavailable.

## Files changed

Documentation only:

- `CHANGELOG.md`
- `Project Atlas/CHANGELOG.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/04-For You (Plain Language)/stability-improvements.md`
- `Project Atlas/QA Reports/WiseResume_Fresh_Credentialed_E2E_QA_2026-07-02.md`

## Tests run

- Production browser E2E only; no product code changed.
- `git diff --check` is required before documentation commit.

## Remaining risks

- Tailoring history can omit successful sessions.
- Arabic guide/example routes are not localized.
- Fresh upload parsing and real export artifacts are still unproven.
- Contact delivery remains unproven in a browser where the security challenge loads.
- The QA account now contains the disposable source and tailored resumes; no account or resume deletion was performed.

## Launch recommendation

Do not approve launch yet. Close E2E-01 and E2E-02, then repeat upload, export, and contact checks in an attachment/download-capable clean browser. After those gates pass, reassess for `LAUNCH_READY`.
