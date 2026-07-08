# Prioritized Fix Plan

## Batch 1 — P0 blockers

No P0 was proven. Do not create emergency changes without live evidence.

## Batch 2 — P1 launch blockers

1. Replace/fix missing `/api/fetch-url` contract.
   - Likely files: `src/pages/UploadPage.tsx`, `src/hooks/useImportJob.ts`, possibly `api/fetch-url.ts`, tests.
   - Risk: High (untrusted URL/SSRF).
   - Tests: contract test, auth, URL allowlist, redirects/private IP, body/time limits, successful import.
   - Browser QA: desktop/mobile valid URL, invalid URL, timeout, provider error.
   - Deploy: Vercel; Appwrite only if routing changes.
   - Manual Appwrite: No by default.
2. Remove `all`/blank deployment path.
   - Files: `.github/workflows/deploy-appwrite-hubs.yml`, workflow/deploy-script tests, Atlas deployment docs.
   - Risk: High.
   - Tests: static workflow assertion and dry-run target mapping.
   - Browser QA: No.
   - Deploy: workflow merge only; do not execute.

## Batch 3 — P2 quality/stability

- Bind portfolio visit completion to a signed token; Vercel deploy, possible schema change, API tests.
- Make AI credit charging concurrency-safe; Appwrite function + likely schema/index; concurrency tests.
- Prove SSRF defenses in `job-import`; targeted Appwrite deploy only if changed.
- Reconcile gateway exceptions and shared policy; targeted hub tests/deploys.
- Add explicit persistence status to job-import response and test fallback.
- Verify Appwrite permissions/env/source hashes manually before deployment.

## Batch 4 — UI/UX polish

- Replace toast-only feature-gate redirect with persistent accessible state.
- Decide Arabic URL policy and add deep-link tests.
- Resolve `/portfolio` and `/preview` route/spec drift; add redirects if needed.
- Run desktop/mobile/dark/light/RTL visual and keyboard audit.
- Vercel deployment is sufficient for frontend-only changes.

## Batch 5 — Backlog

- Performance budgets for heavy parsers/export and route chunks.
- Durable distributed rate limiting across remaining public endpoints.
- Consolidate stale Atlas file/function/workflow references.
- Expand production smoke automation using safe test accounts and non-destructive fixtures.

