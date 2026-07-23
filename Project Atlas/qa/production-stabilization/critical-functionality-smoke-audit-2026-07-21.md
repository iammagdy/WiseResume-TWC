# Critical Functionality Smoke Audit - Reconciled Record

**Original audit date:** 2026-07-21
**Reconciled:** 2026-07-24
**Production:** `https://wiseresume.app`
**Historical verdict at initial sequence close:** `PASS_WITH_WARNINGS`
**Current sequence status:** `CLOSED`
**Readiness at sequence close:** `READY_FOR_BROAD_USER_TESTING`

## Evidence Note

The original audit was intentionally audit-only and did not leave a dedicated Atlas report. This record reconstructs the audit outcome from the original task brief, later production reports, `CHANGELOG.md`, `WHERE_WE_STOPPED.md`, and the product/documentation commits that closed its findings.

Where the original per-step browser evidence is no longer retained, the value is `UNKNOWN`; this report does not invent missing timings, request IDs, screenshots, or artifact details.

## Audit Scope

The smoke covered authentication/session persistence, Dashboard counts and resume targeting, Editor persistence and one AI action, Tailoring, Cover Letters, Designed/ATS PDF and DOCX exports, Public Portfolio behavior, and final refresh/reopen persistence.

## Reconciled Results

| Area | Initial audit outcome | Follow-up evidence | Current sequence result |
|---|---|---|---|
| Authentication/session | Passed; exact original evidence not retained | Later authenticated production phases reused the persisted session successfully | `COMPLETE` |
| Dashboard/resume targeting | Passed with no cross-resume issue recorded | Editor Phase 2 later verified route-first document identity and no stale-resume flash | `COMPLETE` |
| Editor persistence/AI | Passed with warnings | Editor Phase 2 verified edit, autosave, refresh, Preview, and cleanup persistence | `COMPLETE` |
| Tailoring generation/result | Passed at the time | Later export and recovery phases added stronger evidence; the 2026-07-23 date-preservation bug was fixed by `a14b306d` and production verified on 2026-07-24 | `COMPLETE` |
| Tailoring result exports | ATS PDF and DOCX failed from the result page | Fixed by `29e8eec8`; production artifacts verified in `export-download-qa.md` | `COMPLETE` |
| Owner collections | Browser reads exposed P2 access failures | Fixed by `854ac418` for `user_preferences`, `jobs`, and `job_applications` | `COMPLETE` |
| Legacy `tailor_history` | Unnecessary browser reads generated authorization noise | Removed from browser runtime by `854ac418` | `COMPLETE` |
| Appwrite Realtime | Websocket was blocked by the active CSP | Fixed by `854ac418`; production websocket open verified | `COMPLETE` |
| Browser GeoJS | Optional analytics request was blocked by CSP | Removed by `d6f0709e`; no CSP broadening | `COMPLETE` |
| Premium Cover Letter | Initially unavailable to the Free QA account | Later Premium production evidence confirms generation, persistence, update, ownership, and one charge | `COMPLETE_WITH_EVIDENCE_LIMITATION` |
| Public Portfolio core flow | Passed with warnings | Phase 3 later verified core public behavior and security; cold-mobile LCP remains above target | `COMPLETE_WITH_WARNING` |

## Follow-up Commit Chain

| Scope | Product commit | Documentation commit |
|---|---|---|
| Tailoring result ATS PDF/DOCX | `29e8eec8` | `308a5578` |
| Owner permissions, runtime history reads, Realtime CSP | `854ac418` | `63d0e31d` |
| Browser GeoJS removal | `d6f0709e` | `a2ccc7cd` |
| Tailoring project metadata preservation | `a14b306d` | This Atlas closeout |

The Premium Cover Letter verification was audit-only and did not produce a product commit.

## Final Status

The original smoke sequence reached `PASS_WITH_WARNINGS` and was sufficient to begin the separate performance audit. That historical outcome remains valid. The later 2026-07-23 Tailoring project-date finding was fixed and production verified on 2026-07-24, so the quick functionality audit is now `CLOSED`. Public Portfolio cold-mobile LCP remains a separate performance warning.

## Evidence Links

* [`export-download-qa.md`](./export-download-qa.md)
* [`owner-permissions-realtime-csp-2026-07-21.md`](./owner-permissions-realtime-csp-2026-07-21.md)
* [`geojs-csp-browser-lookup-2026-07-21.md`](./geojs-csp-browser-lookup-2026-07-21.md)
* [`premium-cover-letter-production-verification-2026-07-21.md`](./premium-cover-letter-production-verification-2026-07-21.md)
* [`tailoring-meaningful-production-verification-2026-07-23.md`](./tailoring-meaningful-production-verification-2026-07-23.md)
