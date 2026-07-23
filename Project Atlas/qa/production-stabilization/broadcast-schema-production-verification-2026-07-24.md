# Broadcast Schema and Production Verification

**Date:** 2026-07-24
**Verdict:** `PASS_WITH_WARNINGS`
**Production:** `https://wiseresume.app`
**Product Commit:** `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`

## Scope

This verification covered only the authenticated workspace Broadcast schema, server delivery path, owner management actions, visibility filtering, public-route silence, and a small final stabilization smoke. It did not reopen Tailoring, AI routing, credits, exports, owner-collection permissions, Realtime architecture, or Public Portfolio performance.

## Confirmed Root Cause

Classification: `MULTIPLE_LAYERS`.

The browser called:

```txt
databases.listDocuments("main", "broadcasts", [
  Query.equal("active", true),
  Query.select(["$id", "title", "body", "severity"]),
  Query.limit(20)
])
```

Appwrite returned:

```txt
400 Invalid query: Attribute not found in schema: active
```

Live pre-change metadata:

```txt
Collection ID: broadcasts
Collection permissions: []
documentSecurity: false
Attributes: user_id only
Indexes: none
Document count: 0
Replacement status fields: none
Creation path: none in the current Appwrite implementation
Read path: direct browser query in BroadcastBanner
```

Historical repository evidence showed the intended Supabase contract used `title`, `body`, `severity`, `active`, `created_by`, `created_at`, and optional `expires_at`. The Appwrite migration retained the client query but did not migrate that schema, the admin function, or the row-level delivery model.

## Implemented Model

Canonical fields:

```txt
title: required string(256)
body: required string(4096)
severity: enum(info, warning, critical), default info
active: boolean, default false
created_by: required string(36)
created_at: required datetime
expires_at: optional datetime
```

The legacy optional `user_id` attribute remains untouched. No start-time field was added because the approved historical model did not support one.

Security and delivery:

* Collection permissions remain empty.
* `documentSecurity` remains `false`.
* Normal users have no direct collection read or mutation permission.
* `GET /api/broadcasts` validates `X-Appwrite-JWT` through Appwrite `/account`.
* The server reads with the existing Vercel Appwrite server key and returns only `id`, `title`, `body`, and `severity`.
* Server filtering requires `active === true`, hides expired records, fails closed on malformed expiry/required fields, orders newest first, and caps the response at 20 records.
* Public standalone routes and pre-auth states do not call the endpoint.
* DevKit owner actions list, publish, and expire records through signed `admin-devkit-data` requests.

## Schema and Migration Evidence

Pre-apply dry-run:

```txt
collection=broadcasts documentSecurity=false
collectionPermissions=0
documents=0
attributesExisting=1
attributesPlanned=7
```

Workflow apply:

```txt
attributesCreated=7
documentsScanned=0
documentsUpdated=0
documentsSkipped=0
documentsFailed=0
```

Post-apply dry-run:

```txt
collection=broadcasts documentSecurity=false
collectionPermissions=0
documents=0
attributesExisting=8
attributesPlanned=0
```

No migration script was needed because there were no documents. No index was needed because current server and owner list paths do not query a Broadcast attribute.

## Validation

Passed commands:

```txt
git diff --check
node --check scripts/setup_broadcasts_schema.cjs
node --check appwrite-hubs/admin-devkit-data/src/main.js
npx tsc --noEmit
npx eslint <changed Broadcast TypeScript files>
npx vitest run <5 focused Broadcast files>                 5 files / 21 tests
npx vitest run <related shell/auth/navigation files>       4 files / 23 tests
npm run build
node --env-file=.env.deploy scripts/setup_broadcasts_schema.cjs --dry-run
```

The production build transformed 5,821 modules and the no-sourcemap check passed. Existing Browserslist age and large-chunk warnings remained.

## Deployment

Vercel:

```txt
Deployment: dpl_Hvot534UMdVDKrLwtDNuQHpiMigr
Commit: 51271e0a5ff355e5d5ad5c6078c7357b50f50f42
Status: READY
Target: production
Aliases: wiseresume.app, www.wiseresume.app, resume.thewise.cloud
```

Appwrite:

```txt
Workflow: 30051406249
Target: admin-devkit-data
Deployment: 6a629b8351abe36cd0c3
Status: ready
Source hash: 21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02
Smoke: HTTP 200
```

General schema jobs and unrelated hubs were skipped. The workflow's existing idempotent impersonation-session schema dependency for `admin-devkit-data` also ran.

## Production Route Evidence

| Route | Broadcast request | HTTP | Banner | Console | Result |
|---|---|---:|---|---|---|
| `/dashboard` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/editor` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/tailoring-hub` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/applications` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/notifications` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/settings` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/cover-letters` | `GET /api/broadcasts` | 200 | Hidden, empty collection | No Broadcast warning | PASS |
| `/p/explore-test-portfolio` | No Broadcast request | N/A | Not mounted | No Broadcast warning | PASS |

Vercel runtime logs tied every authenticated 200 to deployment `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` and reported no `/api/broadcasts` runtime errors. A time-bounded log query beginning immediately before the public portfolio navigation returned no Broadcast request.

The production `AppInterior-DBRkd_Gv.js` asset contains `account.createJWT()` and `fetch("/api/broadcasts")`; the old direct Broadcast collection query is absent from `BroadcastBanner`.

## Visibility and Dismissal Evidence

Production had zero Broadcast records and no existing safe test announcement. No real platform announcement was created or changed.

Focused tests prove:

* active, non-expired records render;
* inactive records do not render;
* expired records do not render;
* malformed optional expiry values fail closed;
* malformed/empty records do not render;
* empty collection renders nothing;
* newest records are returned first;
* public and pre-auth states make no request;
* authenticated state sends the Appwrite JWT;
* dismissal persists for the browser session;
* logout clears loaded Broadcast state;
* schema planning is idempotent and adds no broad permissions;
* owner publish/expire actions use the canonical `active` field.

Start-time scheduling is not supported by the approved model, so a future-start test is not applicable.

## Final Stabilization Smoke

Passed:

* Dashboard opened.
* A saved resume opened in the actual `/editor` route.
* Tailoring Hub and a saved Tailoring result opened.
* Applications opened.
* Notifications opened.
* Settings opened.
* Cover Letter library opened.
* Public Portfolio opened.
* Designed PDF, ATS PDF, Word/DOCX, and Export PDF controls remained available.

No AI action ran and no credits were consumed. No Realtime error appeared; Realtime code and CSP were unchanged from the previously verified state.

## Warnings

* Live active/inactive/expiry/dismissal behavior was not exercised with production content because the collection is empty and the task prohibited modifying real announcements without a safe existing test record.
* One unrelated controlled/uncontrolled Select warning appeared during the multi-route smoke.
* Public Portfolio cold-mobile LCP remains above the four-second target and is unchanged.

## Final Status

```txt
Broadcast repair: PASS_WITH_WARNINGS
Stabilization smoke: PASS_WITH_WARNINGS
Tailoring: VERIFIED_READY
Quick functionality audit: CLOSED
Performance sequence: CLOSED_WITH_PORTFOLIO_LCP_WARNING
Project Atlas: COMPLETE_AND_ROUTED after docs commit
```
