# Tailoring Meaningful Production Verification

**Date:** 2026-07-23
**Production:** `https://wiseresume.app`
**Repository code HEAD:** `17a767d4e25220596d382c5b1233db4d0c3c905b`
**Final classification:** `PRODUCT_BUG`

## Scope and Fixture

One fictional Premium QA resume was created for this verification. It contained a four-sentence marketing summary, two roles with eight total bullets, fourteen relevant skills, one fictional education item, and one project. A fictional 101-word Senior Growth Marketing Manager job description was used.

The fixture contained no real employer, client, credential, or private job data. This report does not store the complete resume, complete job description, prompt, provider response, account identity, or credentials.

## Execution Evidence

### Initial action

| Signal | Evidence |
|---|---|
| Start | `2026-07-23T21:11:36.985Z` |
| Loading state | Visible about `4.1 s` after the click |
| Provider execution | `6a62838657ab0172051b`, completed HTTP 200 in `14.811 s` |
| Provider/model | DeepSeek `deepseek-chat` |
| Provider attempts | One |
| Provider latency | `11.929 s` |
| Fallback | No |
| Remaining gateway budget | about `54.605 s` |
| Browser terminal state | Actionable provider error at about `13.45 s`; no save or navigation |
| Result recovery execution | `6a6283880589e6af336f`, Appwrite platform failure in `3.345 s` |

The provider result was successfully cached and exactly one two-credit charge was recorded. Because the failure was isolated to the result-only Appwrite execution, one controlled retry was allowed.

### Controlled retry

| Signal | Evidence |
|---|---|
| Start | `2026-07-23T21:13:22.263Z` |
| Cache recovery | `6a6283ef9634bade737b`, HTTP 200 in `0.314 s` |
| Result-only retrieval | `6a6283f0e6b7f9158a7a`, HTTP 200 in `0.179 s` |
| Provider work | None |
| Additional credits | Zero |
| UI success | About `3.1 s` |
| Total retry wait to result route | `9.809 s` |
| Result resume | `6a6283f40001464122f4` |

## Behavior and Persistence

* Exactly one tailored child resume was created.
* The child's parent/source ID matches the controlled source resume.
* The source resume was not overwritten; its update timestamp remained unchanged.
* The result page opened, survived refresh, and reopened directly.
* Designed PDF, ATS PDF, Word, Editor, and Cover Letter actions remained available.
* Credits changed by two total for the task; result-only recovery and the controlled retry did not charge again.
* No duplicate provider execution or duplicate tailored resume was created.
* The legacy `tailor_history` collection had no browser-runtime row, as expected; lineage is stored on the tailored resume.

## Meaningful-Change Assessment

The result was materially different:

* The professional summary was rewritten and expanded.
* Both role descriptions changed.
* All eight experience bullets changed while preserving the two role structures and bullet counts.
* The fourteen source skills were retained.
* Contact and education data remained unchanged.
* No employer, role title, degree, certification, or unsupported numerical achievement was introduced.
* The stored score moved from `75` to `88`; the workspace had displayed a `78` baseline, so score presentation remains a minor warning.

## Confirmed Product Defect

The result violated the required content-preservation contract:

* The current role's empty end date was normalized to `Present` instead of being preserved exactly.
* The project start date `2023-02` and end date `2023-06` were dropped.

Code inspection proves the project-date loss mechanism: the Tailoring structured schema asks the model to preserve project dates, but `buildTailorMessages()` sends project ID, name, role, description, and technologies without sending project `startDate` or `endDate`. The model therefore cannot preserve values it never receives.

## Verdict

Timing, bounded recovery, idempotency, duplicate prevention, exactly-once charging, save/navigation, and refresh/reopen persistence passed. Tailoring is nevertheless `PRODUCT_BUG` because user-authored project dates can be lost in a saved tailored resume.

Per the task stop condition, no product code, prompt, provider routing, model, credit policy, schema, permission, environment, or deployment setting was changed.
