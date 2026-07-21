# Owner Permissions, Legacy Tailor History Reads, and Realtime CSP Verification

**Date:** 2026-07-21
**Environment:** Production, `https://wiseresume.app`
**Commit:** `854ac4185c0a4e89196c73a2d4704babb571270d`
**Vercel Deployment:** `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p`
**Verdict:** VERIFIED_TARGET_READY_WITH_RESIDUAL_GEOJS_CSP_WARNING

## Scope

This closeout verifies the P2 fix for owner-scoped access on `user_preferences`, `jobs`, and `job_applications`; removal of unnecessary browser `tailor_history` reads; and Appwrite Realtime websocket CSP access.

Cover Letter Pro/Premium verification remains out of scope for this run because the available QA account is Free.

## Root Causes

- `user_preferences`, `jobs`, and `job_applications` had `documentSecurity: false`, so document owner permissions were not being enforced.
- Existing `user_preferences` documents lacked owner read/update/delete permissions.
- Runtime browser code still queried legacy `tailor_history`, even though that collection is intentionally server-only.
- The active Vite meta CSP allowed `https://fra.cloud.appwrite.io` but not `wss://fra.cloud.appwrite.io`.

## Fix Summary

- Added `src/lib/appwriteOwnerPermissions.ts` and used it for new `user_preferences`, `jobs`, and `job_applications` documents.
- Added repo-controlled scripts:
  - `scripts/setup_owner_collections_schema.cjs`
  - `scripts/migrate_owner_document_permissions.cjs`
- Updated legacy schema wrappers to call the owner collection setup.
- Replaced browser Tailor History reads with owner-scoped resume lineage and tailoring metadata.
- Added `wss://fra.cloud.appwrite.io` to the active Vite CSP and mirrored it in `public/_headers`.
- Added focused security regression coverage in `src/lib/__tests__/ownerCollectionsSecurity.test.ts`.

## Live Appwrite State

- `user_preferences`: `documentSecurity=true`, permissions `create("users")`, owner documents correct. `language` exists. `user_id_idx` could not be created because the legacy `user_id` attribute size exceeds Appwrite index length limits; authenticated `user_id` queries were verified anyway.
- `jobs`: `documentSecurity=true`, permissions `create("users")`, `user_id_idx` available, existing documents owner-correct.
- `job_applications`: `documentSecurity=true`, permissions `create("users")`, required tracker attributes and indexes available.

Final dry-run after production browser verification:

```txt
user_preferences mode=dry_run scanned=22 updated=0 already_correct=22 skipped_invalid_owner=0 failed=0
jobs mode=dry_run scanned=4 updated=0 already_correct=4 skipped_invalid_owner=0 failed=0
job_applications mode=dry_run scanned=0 updated=0 already_correct=0 skipped_invalid_owner=0 failed=0
```

## Validation

- `node --check` for changed Node scripts: PASS.
- Related Vitest suite: PASS, 17 files / 121 tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS, existing chunk-size and Browserslist warnings only.
- `git diff --check`: PASS, Windows line-ending warnings only.

## Deployment Evidence

- `origin/main` and local `main` match `854ac4185c0a4e89196c73a2d4704babb571270d`.
- Vercel deployment `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p` reached `READY` for the same commit.
- Production HTML returned 200 and contained `wss://fra.cloud.appwrite.io` in the active CSP meta tag.
- Vercel runtime error scan for the last hour returned no runtime errors.

## Production Browser Evidence

- Authenticated QA browser loaded `https://wiseresume.app/dashboard`.
- Appwrite account endpoint returned 200.
- Runtime Appwrite calls to `user_preferences`, `jobs`, and `job_applications` returned 200/201 with no affected 401 responses.
- Direct authenticated browser REST checks returned 200 for all three owner collections.
- No runtime `tailor_history` requests were observed.
- Appwrite Realtime websocket opened from the app, and a manual `wss://fra.cloud.appwrite.io` websocket probe opened without a CSP block.

## Residual Risks

- Visitor geolocation currently attempts `https://get.geojs.io/v1/ip/country.json`, which production CSP blocks. This is unrelated to the Appwrite Realtime fix and should be triaged separately.
- Cover Letter Pro/Premium verification remains `BLOCKED_EXTERNAL_ACCESS` until a Pro/Premium QA account is available.
