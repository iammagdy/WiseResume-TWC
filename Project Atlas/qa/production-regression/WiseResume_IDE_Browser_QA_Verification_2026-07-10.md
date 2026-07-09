# WiseResume IDE Browser QA Verification Report

Date: 2026-07-10
Tester/Agent: Codex IDE QA agent
Environment: Production
Account: Premium demo
Production URL: https://wiseresume.app
GitHub Issue: #140

## Executive Summary

* Overall status: FAIL - major paid AI flows are not ready.
* Previous Comet report matched: Partially. Tailoring, cover letter, editor global AI, interview resume selector, dashboard data mismatch, export failure, and AI Studio route/tool instability were reproduced or partially reproduced.
* Ready for broad user testing: No.
* Ready for launch: No.
* Top confirmed blockers:
  * Tailoring Hub calls `ai-gateway` but ends with "Tailoring could not complete."
  * Cover Letter calls `ai-gateway` after "Generate Anyway" but returns to the form with no generated output or visible error.
  * Editor global "Improve with AI" button does nothing visible and sends no network request.
  * Dashboard card data is inconsistent: Tailored resumes metric shows 0 while the resume filter shows Tailored 10.
  * Tailored result export did not produce a captured PDF download.
* Top differences from previous report:
  * AI Studio did not show a sustained black screen; content appeared in about 759 ms.
  * Portfolio mobile preview content rendered; no blank/spinner state reproduced.
  * Applications Quick Add was inconclusive from automation because fields remained empty and Save was not reached.

## Reproduction Matrix for Previous Report

| Previous Finding | Severity | Reproduced? | Evidence | Notes |
| ---------------- | -------- | ----------- | -------- | ----- |
| Tailoring Hub job analysis/create tailored CV failure | P1 | Reproduced | `/tailoring-hub?mode=workspace`; visible error: "Tailoring could not complete. Please try again in a moment."; `ai-gateway` executions returned HTTP 201 before failure state | No result page, no before/after score, no exportable tailored output |
| Cover Letter Generate with AI unresponsive/fails | P1 | Reproduced | `/cover-letter/new`; Generate with AI opened missing-contact warning; Generate Anyway sent `ai-gateway` HTTP 201 then returned to the form | No generated letter, no save/export surface, no visible error |
| Interview Prep Launch Interview unresponsive | P1 | Partially reproduced | `/interview`; "Practicing as" was blank on load; resume dropdown opened with duplicated options and blocked clean launch | Initial Launch click did not start a session |
| Applications Tracker Quick Add save unresponsive | P2 | Needs more evidence | `/applications`; Quick Add form opened, but automation did not successfully populate visible required fields | Not enough evidence to call a product failure |
| LinkedIn Optimizer generation failure | P2 | Partially reproduced | `/ai-studio/linkedin` initially opened modal-like content, then returned to `/ai-studio`; card path exposed resume context instead of stable generator | Generate button could not be reached reliably |
| Company Briefing generation failure | P2 | Partially reproduced | `/ai-studio/company-briefing` panel opened from card, but automation could not trigger Generate Briefing | Route/tool surface exists but action path was unstable |
| Editor global Improve with AI does not open | P1 | Reproduced | `/editor?id=6a30a39d00194dc4af04`; clicking top toolbar "Improve with AI" changed nothing and sent no network request | Per-section "Improve Summary" opened the section editor, not AI generation |
| Portfolio mobile preview blank/spinner | P2 | Not reproduced | `/portfolio`; Mobile preview text/content remained visible and no spinner-only state was observed | Mobile toggle was not confidently clicked, but content rendered |
| AI Studio black screen | P2 | Not reproduced | `/ai-studio`; content visible in about 759 ms | No sustained black screen seen |
| Interview Prep resume dropdown blank by default | P2 | Reproduced | `/interview`; "Practicing as" loaded without a selected resume | Dropdown then duplicated options |
| Version mismatch | P3 | Needs more evidence | `/settings`; About text showed `v4.7.3`; What New click did not visibly open a dialog in automation | Could not compare a second version string |
| Portfolio public page quote/tagline wrong | P3 | Partially reproduced | `/p/explore-test-portfolio`; tagline rendered as "Experienced professional building with AI." | Could not verify intended source field from browser UI |
| Dashboard greeting broken truncation | P3 | Not reproduced | `/dashboard`; greeting displayed "Good morning, Premium" | Uses account first/display name, not broken truncation |

## Coverage Summary

| Area | Status | Notes |
| ---- | ------ | ----- |
| Auth/session | Pass | Login succeeded and refresh/navigation kept the session. |
| Dashboard | Fail | Primary metrics inconsistent; tailored count mismatch reproduced. |
| Cards/counts/data accuracy | Fail | Tailored metric and filter disagree; several values not independently verifiable from UI. |
| Resume Editor | Fail | Existing resume opens in editor from result page, but global AI button is inert. |
| Upload/Import | Pass with limited coverage | `/upload` loads with upload and URL import surfaces; file picker/parser not exercised. |
| Preview/Export | Fail | Tailored result "Download CV PDF" did not yield a captured download; `/preview/<known id>` returned 404. |
| Tailoring Hub | Fail | Create Tailored CV fails after AI consent. |
| AI Tools | Fail | AI Studio loads, but deep tool routes and card tool flows are unstable. |
| Cover Letters | Fail | AI call fires but no output appears. |
| Portfolio | Pass with issues | Editor/public page load; mobile preview content renders; completion/status low but not independently verifiable. |
| Jobs/Fast Tailor | Fail | `/jobs` loads but reports 0 remote jobs and "Last updated: Not yet synced." |
| Applications | Needs more evidence | Quick Add opens; creation/persistence not verified. |
| Settings | Pass with issues | Premium/unlimited plan shown; About/What's New dialogs not visibly verified. |
| Mobile | Pass with issues | Dashboard and portfolio render, but mobile dashboard hides Edit/Tailor actions and shows mostly Duplicate/Delete. |
| Arabic/RTL | Blocked | No Arabic switch was found in the tested Settings surface; `html dir` stayed `ltr`. |

## Detailed Findings

### Finding 1 - [P1] Tailoring Hub fails after AI gateway execution

* Area: Tailoring Hub
* Route: `/tailoring-hub?mode=workspace`
* Control/button/card: Create Tailored CV, then "I understand, continue"
* Reproduced: Yes
* Steps: Open route, paste SaaS Marketing Manager job description, keep default selected resume, click Create Tailored CV, accept AI Data Processing Notice.
* Expected: AI tailoring completes, result page opens, before/after score and changed content are visible.
* Actual: Flow returns to form with "Tailoring failed" and "Tailoring could not complete. Please try again in a moment."
* Console summary: Repeated safe 401/400 Appwrite collection errors observed during the session.
* Network summary: `ai-gateway` execution requests were sent and returned HTTP 201 before the visible failure.
* Evidence: Browser text captured on production route after 90 seconds.
* Likely frontend/backend/data/AI category: AI Gateway or tailoring response handling.
* Suggested investigation direction: Inspect `ai-gateway` execution logs for the failed tailoring action and verify frontend handling of execution response payload status/error fields.

### Finding 2 - [P1] Cover Letter AI generation returns no output

* Area: Cover Letters
* Route: `/cover-letter/new`
* Control/button/card: Generate with AI, Generate Anyway
* Reproduced: Yes
* Steps: Fill job title, company, select resume, paste job description, click Generate with AI, confirm Generate Anyway after missing contact warning.
* Expected: Loading state, generated cover letter, save/export controls.
* Actual: `ai-gateway` request fired, then page returned to the form with no generated letter and no visible error.
* Console summary: No useful user-facing error surfaced.
* Network summary: `ai-gateway` execution returned HTTP 201; Appwrite collection calls returned mixed 200/401.
* Evidence: Browser text after 70 seconds still showed only the form and Generate with AI button.
* Likely frontend/backend/data/AI category: AI Gateway response handling or cover-letter output persistence/rendering.
* Suggested investigation direction: Compare Appwrite execution response body with frontend expected schema; add explicit visible error when generation fails or output is empty.

### Finding 3 - [P1] Editor global Improve with AI is inert

* Area: Resume Editor
* Route: `/editor?id=6a30a39d00194dc4af04`
* Control/button/card: Top toolbar "Improve with AI"
* Reproduced: Yes
* Steps: Open tailored result, click Open in editor, click Improve with AI.
* Expected: AI sheet/dialog opens or AI request starts.
* Actual: No visible sheet/dialog and no network request.
* Console summary: No specific click error surfaced.
* Network summary: No new network request after click.
* Evidence: Body text before/after remained on editor canvas.
* Likely frontend/backend/data/AI category: Frontend event binding or feature-gate state.
* Suggested investigation direction: Trace toolbar button `onClick` and any hidden dismissed/onboarding overlay state.

### Finding 4 - [P1] Dashboard Tailored Resumes metric contradicts visible resume filters

* Area: Dashboard
* Route: `/dashboard`
* Control/button/card: Tailored resumes metric card and resume filter chips
* Reproduced: Yes
* Steps: Login and open dashboard; refresh dashboard.
* Expected: Tailored resumes metric should match visible tailored resume count, or label should explain a different scope.
* Actual: Metric card shows `Tailored resumes 0 / 0 this week`; filter chip shows `Tailored 10`.
* Console summary: `useSavedJobPostings` and `tailor_history` unauthorized warnings appeared.
* Network summary: Multiple Appwrite collection queries returned HTTP 401.
* Evidence: Same mismatch appeared on initial login and final dashboard refresh.
* Likely frontend/backend/data/AI category: Data query/permissions or metric source mismatch.
* Suggested investigation direction: Verify dashboard metric uses the same tailored-resume source as the list filter, or clarify "this week" vs total.

### Finding 5 - [P1] Tailored result export did not produce a real download

* Area: Preview/Export
* Route: `/tailoring-hub/result/6a30a39d00194dc4af04`
* Control/button/card: Download CV PDF
* Reproduced: Yes
* Steps: Open tailored result, click Download CV PDF, wait for browser download event.
* Expected: Real PDF file download for the displayed resume.
* Actual: No download event captured.
* Console summary: No user-facing error observed in captured text.
* Network summary: Not enough safe detail captured for the export endpoint.
* Evidence: Playwright download wait returned no file.
* Likely frontend/backend/data/AI category: Frontend export trigger or export endpoint.
* Suggested investigation direction: Verify click handler and browser download response headers; do not count toast-only success as export success.

### Finding 6 - [P2] Interview Prep resume selector is blank and unstable

* Area: Interview Prep
* Route: `/interview`
* Control/button/card: Practicing as dropdown, Launch Interview
* Reproduced: Partially
* Steps: Open `/interview`, observe "Practicing as", click resume dropdown, attempt selection, click Launch Interview.
* Expected: Default/last resume selected or clean selector; launch starts interview.
* Actual: "Practicing as" was blank; dropdown showed duplicated option text and automation could not reach a clean launch.
* Console summary: Appwrite collection calls returned 400/401 during route load.
* Network summary: No `ai-gateway` call confirmed for launch.
* Evidence: Browser text showed repeated resume names and still displayed Launch Interview.
* Likely frontend/backend/data/AI category: Frontend selector state and possibly data query permissions.
* Suggested investigation direction: Set stable default resume and verify dropdown portal closes after selection.

### Finding 7 - [P2] AI Studio deep routes and card tool flows are unstable

* Area: AI Studio
* Route: `/ai-studio`, `/ai-studio/linkedin`, `/ai-studio/company-briefing`
* Control/button/card: LinkedIn Optimize Profile, Company Create Briefing
* Reproduced: Partially
* Steps: Navigate directly to deep routes and via visible cards.
* Expected: Tool route/panel remains stable and Generate action can be completed.
* Actual: Deep routes initially showed tool panels plus welcome overlay, then after close ended back on `/ai-studio`; LinkedIn card exposed a resume-context panel instead of a ready generator; Company panel opened but Generate was not reached.
* Console summary: Repeated Appwrite collection 401s and CSP websocket errors observed.
* Network summary: Mostly app/settings, coupons, tracking, collection requests; no confirmed tool `ai-gateway` call.
* Evidence: Browser text captured for AI Studio and tool routes.
* Likely frontend/backend/data/AI category: Frontend route/modal state.
* Suggested investigation direction: Validate route-driven modal lifecycle and required resume-context step for each tool.

### Finding 8 - [P2] Jobs feed is empty/not synced in production

* Area: Jobs/Fast Tailor
* Route: `/jobs`
* Control/button/card: Remote Jobs Feed
* Reproduced: Yes
* Steps: Open `/jobs`.
* Expected: Remote job list loads or shows current sync state with jobs.
* Actual: Page shows `0 remote jobs available` and `Last updated: Not yet synced`.
* Console summary: Appwrite collection 400/401 and aborted `get-remote-jobs` request were observed during navigation.
* Network summary: `get-remote-jobs` request aborted during route transition in captured session.
* Evidence: Browser text on production `/jobs`.
* Likely frontend/backend/data/AI category: Backend/Appwrite job feed sync or read path.
* Suggested investigation direction: Check latest `job-feed-sync` run and `get-remote-jobs` function health.

### Finding 9 - [P3] Public portfolio tagline is generic and source is unclear

* Area: Portfolio
* Route: `/p/explore-test-portfolio`
* Control/button/card: Public portfolio hero/about text
* Reproduced: Partially
* Steps: Open public portfolio link from portfolio studio.
* Expected: Public quote/tagline should reflect the selected portfolio/resume content.
* Actual: Public page displayed "Experienced professional building with AI."
* Console summary: Public page had Appwrite collection 400/401 and aborted tracking calls.
* Network summary: `track-portfolio-view` requests aborted during route transitions.
* Evidence: Browser text from public page.
* Likely frontend/backend/data/AI category: Data mapping/content defaulting.
* Suggested investigation direction: Verify whether tagline maps from headline, bio, availability, or fallback.

## Card/Data Accuracy Results

| Page | Card/Widget | Displayed Value | Expected Value | Result | Notes |
| ---- | ----------- | --------------: | -------------: | ------ | ----- |
| Dashboard | ATS average | 55% / Across 13 resumes | Not independently verifiable from browser UI | Needs more evidence | Resume list shows 18 total; score source not visible. |
| Dashboard | Tailored resumes | 0 / 0 this week | 10 total tailored visible in filter | Fail | Label is misleading or metric source is broken. |
| Dashboard | App. Matches | 0 | Not independently verifiable from browser UI | Needs more evidence | No target job score visible. |
| Dashboard | Saved jobs | 0 | Jobs route showed 0 jobs | Pass | Saved job count appears consistent with visible empty state. |
| Dashboard | Resume filters | All 18, Normal 8, Tailored 10 | Visible list count not fully counted due scroll | Needs more evidence | Values internally sum correctly. |
| Settings | Account stats | 18 Resumes, 0 Cover Letters, 0 Applications | Dashboard shows All 18; cover/app empty states visible | Pass with caveat | Cover letter failure means 0 cover letters remains expected. |
| Settings | Plan | Premium / Unlimited AI actions | Premium demo account | Pass | No upgrade spam observed. |
| Portfolio | Completion | 20%, Live 18% | Not independently verifiable from browser UI | Needs more evidence | Low progress shown while public page is live. |
| Jobs | Remote jobs | 0 remote jobs available | Not independently verifiable from browser UI | Fail/Needs evidence | Production feed also says not yet synced. |

## Resume Card Action Matrix

| Resume Card | Action | Expected Target | Actual Target | Result | Notes |
| ----------- | ------ | --------------- | ------------- | ------ | ----- |
| Ahmed Hassan - Job (Tailored) | Edit | Editor for same resume | Tailoring result page first, then Open in editor worked | Fail | Dashboard card Edit routed to `/tailoring-hub/result/...` in this run. |
| Ahmed Hassan - Job (Tailored) | Tailor | Tailoring flow for selected resume | Not separately verified | Needs more evidence | Tailoring Hub defaulted to Test Blank Resume, not this card. |
| Ahmed Hassan - Job (Tailored) | Preview | Preview for same resume | `/preview/6a30a39d00194dc4af04` returned 404 | Fail | Known ID from editor/result route did not work as preview route. |
| Ahmed Hassan - Job (Tailored) | Export | Download correct resume file | No PDF download captured from result page | Fail | Export evidence missing. |
| Dashboard list | Duplicate/Delete menu | Safe menu actions | Buttons visible | Not tested | Delete avoided except disposable resume; new disposable creation did not complete visibly. |

## Dialogs / Sheets / Popovers / Toasts Results

| Page | UI Surface | Trigger | Opens Correctly | Layout OK | Action Works | Notes |
| ---- | ---------- | ------- | --------------- | --------- | ------------ | ----- |
| Dashboard | Cookie banner | Initial login | Yes | Yes | Yes | Accepted/cleared for testing. |
| Dashboard | New Resume modal/sheet | New Resume | Yes | Needs evidence | Fail/Needs evidence | Create clicked, but no new resume appeared and count stayed 18. |
| Editor | Global AI sheet | Improve with AI | No | N/A | No | Inert click, no network request. |
| Editor | Summary section editor | Improve Summary | Yes | Yes | Partial | Opens editor section, not AI output. |
| Tailoring Hub | AI Data Processing Notice | Create Tailored CV | Yes | Yes | Yes | Consent continues into failing AI flow. |
| Cover Letter | Missing contact info dialog | Generate with AI | Yes | Yes | Partial | Generate Anyway sends AI request but no output appears. |
| Applications | Quick Add Application | Quick Add | Yes | Yes | Needs evidence | Required fields remained empty in automation. |
| Portfolio | Live Preview | Desktop/Mobile controls | Visible | Yes | Pass with caveat | Mobile preview content rendered; button click not confidently detected. |
| Settings | About | About WiseResume | Needs evidence | Needs evidence | Needs evidence | Button clicked, no distinct dialog text captured. |
| Settings | What's New | What's New | Needs evidence | Needs evidence | Needs evidence | Button clicked, no distinct dialog text captured. |

## AI Tool Results

| Tool | Input | Result Quality | Save/Apply Worked | Persisted After Refresh | Issues |
| ---- | ----- | -------------- | ----------------- | ----------------------- | ------ |
| Tailoring Hub | SaaS Marketing Manager JD | No output | No | No | Visible failure after `ai-gateway` execution. |
| Cover Letter Generator | HubSpot Marketing Manager JD | No output | No | No | AI request fired but output never appeared. |
| Editor Improve with AI | Existing tailored resume | No output | No | No | Button inert. |
| Editor Improve Summary | Existing summary | Not generated | No | No | Opened section editor only. |
| Interview Prep | Existing resume, Quick 5 | No session | No | No | Blank/default selector and dropdown instability. |
| LinkedIn Optimizer | Requested SaaS Marketing headline | Not reached | No | No | Route/card flow unstable. |
| Company Briefing | HubSpot | Not reached | No | No | Panel visible, Generate not triggered in automation. |

## Export Evidence

| Resume | Export Type | Real File Downloaded? | Correct Resume? | Notes |
| ------ | ----------- | --------------------- | --------------- | ----- |
| Ahmed Hassan - Job (Tailored) | Download CV PDF | No | Not verified | No Playwright download event captured. |
| Ahmed Hassan - Job (Tailored) | ATS PDF | Not verified | Not verified | Later export buttons were not reached after first failure. |
| Ahmed Hassan - Job (Tailored) | Word | Not verified | Not verified | Later export buttons were not reached after first failure. |

## Backend/Appwrite/AI suspicion map

| Issue | Likely frontend | Likely backend/Appwrite | Likely AI Gateway | Evidence |
| ----- | --------------- | ----------------------- | ----------------- | -------- |
| Tailoring fails | Possible response handling | Possible data/permission side effects | Yes | `ai-gateway` executions sent, visible failure. |
| Cover letter no output | Possible output rendering/persistence | Possible output save failure | Yes | `ai-gateway` execution sent, no result. |
| Dashboard tailored count mismatch | Possible metric source mismatch | Yes | No | `tailor_history`/collection 401 warnings and visible count disagreement. |
| Editor Improve with AI inert | Yes | No evidence | No request sent | Click did not trigger route, dialog, or request. |
| Interview selector unstable | Yes | Possible resume query issue | No request sent | Blank selector and duplicated dropdown text. |
| Jobs feed empty | Possible UI fallback | Yes | No | 0 jobs and not-yet-synced production state. |
| Export no download | Yes | Possible export endpoint | No | No download event. |

## Additional Issues Found

* `/preview/6a30a39d00194dc4af04` returned the app 404 page even though the same id opened in editor/result routes.
* Production console repeatedly reports CSP blocking Appwrite realtime websocket connections.
* Production console repeatedly logs Appwrite 401/400 collection requests on normal user routes.
* Settings exposes a support User ID in the UI; not included here, but screenshots/reports should avoid exposing it.
* Mobile dashboard renders resume cards but primary Edit/Tailor actions were not visible in the captured mobile text; Duplicate/Delete dominated.
* Arabic/RTL could not be reached from the tested Settings surface.

## Final Recommendation

* Must fix before launch:
  * Tailoring Hub AI completion failure.
  * Cover Letter generation no-output failure.
  * Editor global Improve with AI inert button.
  * Dashboard Tailored Resumes metric mismatch.
  * Export/download failure on tailored result.
* Should fix before broad user testing:
  * Interview Prep default resume/dropdown behavior.
  * AI Studio route/modal stability for LinkedIn and Company Briefing.
  * Jobs feed production sync/read health.
  * Preview route 404 for known resume/result id.
* Can defer:
  * Portfolio tagline/source clarity if mapping is intentional.
  * About/What's New dialog polish after core flows pass.
* Suggested next step for coding agent:
  * Start with `ai-gateway` execution logs for Tailoring and Cover Letter using the timestamps from this QA pass, then trace frontend response handling for empty/error execution payloads. In parallel, inspect dashboard metric query sources and editor toolbar `Improve with AI` click wiring.

## Final cleanup

* No password or private token/header data is included in this report.
* No commits, pushes, deploys, environment changes, schema changes, or backend settings changes were performed.
* Temporary browser state was in-memory only; no credential scripts were kept.
* Final Git status is recorded separately in the closeout response.
