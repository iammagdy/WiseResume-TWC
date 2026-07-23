# Tailoring Meaningful Production Verification

**Date:** 2026-07-23
**Production:** `https://wiseresume.app`
**Repository code HEAD:** `17a767d4e25220596d382c5b1233db4d0c3c905b`
**Original classification:** `PRODUCT_BUG`
**Current classification after 2026-07-24 resolution:** `VERIFIED_READY`

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

## Resolution Addendum - 2026-07-24

The original finding above is retained as historical evidence. A separately approved product task fixed the project metadata defect and ran one controlled production retest.

### Root Cause and Fix

The root cause classification is `MULTIPLE_LAYERS`:

* `buildTailorMessages()` omitted project dates, current state, and URLs.
* The structured Tailoring project schema omitted current and URL fields.
* Gateway normalization preserved only IDs.
* Generic frontend merging could allow blank AI metadata to erase source values and could append unsupported AI-only projects.

Product commit `a14b306da29e4ac7a1db16e85fcc54c790c3727c` added project metadata to the model context/schema and explicit allowlisted reconciliation at both gateway and frontend boundaries. Exact IDs are preferred; absent-ID fallback requires a deterministic unique identity match. Source IDs, chronology, current state, URLs, and order are authoritative. Unknown, ambiguous, unmatched, and AI-only projects are rejected.

### Validation

Focused Vitest passed `7` files / `63` tests:

```bash
npx vitest run src/lib/__tests__/tailorMerge.test.ts src/hooks/__tests__/useResumes.template.test.ts src/pages/__tests__/TailoringHubPage-F1.test.tsx src/pages/__tests__/TailoringHubPage-recovery.test.tsx src/pages/__tests__/TailoringHubResultPage.test.ts src/lib/__tests__/appwrite-functions.tailoring.test.ts src/lib/__tests__/aiTailor-D1.test.ts
```

Gateway metadata, routing, and recovery scripts passed:

```bash
node tests/hubs/ai-gateway-tailoring-project-metadata.test.cjs
node tests/hubs/ai-gateway-routing.test.cjs
node tests/hubs/ai-gateway-tailoring-recovery.test.cjs
```

Syntax, type, build, hash, and diff validation passed:

```bash
node --check appwrite-hubs/ai-gateway/src/main.js
npx tsc --noEmit
npm run build
node scripts/compute-source-hashes.mjs
git diff --check
```

Only the `ai-gateway` source hash changed.

### Deployment

| Signal | Evidence |
|---|---|
| Vercel | `dpl_BC5DxdhG1wEJR1m3TBuxhf9ZDfjm`, `READY` |
| Appwrite workflow | `30048216417`, targeted `ai-gateway` only |
| Appwrite deployment | `6a628eafd09be552df71`, `ready` |
| Source hash | `6a61da4d2b3efa73449ca7e3f77ebb6797d35dd005ff8f01f81644439bd72d12` |
| Safe smoke | HTTP 200 |

### Controlled Production Retest

One initial Tailoring action was run; no retry was required.

| Signal | Evidence |
|---|---|
| Start | `2026-07-23T22:08:59.632Z` |
| Result resume | `6a62910a0013a37009a3` |
| Provider execution | `6a6290fa703089c4479e`, completed HTTP 200 |
| Provider/model | DeepSeek `deepseek-chat` |
| Provider latency | `12.199 s` |
| Fallback | No |
| Provider requests | One |
| Credits | Exactly two; daily/total moved `4/84` to `6/86` |
| Result-only polling | `6a6290fb830f8d25676c` returned 409 and `6a629103ef677584ec84` returned 200; neither invoked a provider |

Safe project evidence:

| Project | ID | Source dates | Saved dates | Current | URL state | Content |
|---|---|---|---|---|---|---|
| Lifecycle Campaign QA Program | `e1e00a5b-9fcf-495d-ada5-f527f929447b` | `Apr 2024` to empty | `Apr 2024` to empty | `true` -> `true` | Preserved | Description hash changed; length `132` -> `183` |
| Growth Performance Dashboard | `qa-project-dashboard` | `2023-02` to `2023-06` | `2023-02` to `2023-06` | `false` -> `false` | Absent -> absent | Description hash changed; length `114` -> `186` |

The source resume timestamp remained `2026-07-23T22:05:28.458+00:00`. Exactly one new child was created, no project or date was invented, and no project metadata crossed between projects. The result page showed `Apr 2024 - Present` and `Feb 2023 - Jun 2023`; refresh, direct reopen, and `/preview` retained both displays and the current project's URL. The production Word action reported that its document download started, and ATS PDF completed its preparing state without an error. Both export paths consume the same loaded child resume snapshot; no export code changed in this fix.

### Resolution Verdict

Tailoring is `VERIFIED_READY`. Timing/recovery, no-duplicate behavior, exactly-once charging, source immutability, result persistence, project metadata integrity, and export-preview rendering all passed.
