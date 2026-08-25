# WiseResume Payments — Phase 2B Runtime-Contract Fix and Security-Gate Verification

**Date:** 2026-08-25
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** [wiseresume.app](https://wiseresume.app)
**Scope:** Minimal fix for the existing `revenuecat-webhook` request-body runtime mismatch, targeted deployment, and the three required security smoke tests.
**Protected boundary:** No RevenueCat webhook integration, lifecycle event, frontend checkout, Production payment activation, DNS change, secret change, payment schema/permission change, or unrelated Function deployment was performed.

## 1. Verdict

> **`RUNTIME_SECURITY_GATE_VERIFIED`**

The smallest safe runtime-contract fix was implemented, validated, committed on a scoped branch, deployed through the repository-controlled targeted GitHub Actions workflow with target `revenuecat-webhook` only, and verified against the live custom domain. Missing and invalid Authorization both return HTTP `401`. Valid Authorization with malformed `application/json` now returns HTTP `400` with response code `malformed_body`, and the Appwrite execution completes normally instead of entering Failed status.

Both live provider-state collections remain empty after the rejected-request tests. Per the stop condition, RevenueCat webhook configuration and Pro/Ultimate lifecycle testing were **not started**. Frontend checkout remains disabled and Production payments remain inactive.

## 2. Git and start state

At bootstrap, the isolated GitHub clone was on `main` at `35e8d5b5e2d7c363e15f5f03ba3dd9fd1b70a2d3`, with `HEAD` equal to `origin/main` and zero commits ahead or behind. The required source-of-truth and deployment files were inspected before editing. The connected Windows worktree was not modified; its Git checks remain `BLOCKED_EXTERNAL_ACCESS` because Git is not installed there. The local webhook secret file was used only as an in-memory input for the authorized smoke test; its contents were never printed, persisted, or included in any report.

The implementation was created on the scoped branch `fix/revenuecat-bodytext-runtime`. The code commit is `fffa2505` (`fix(payments): read RevenueCat webhook body via bodyText`) and was pushed to GitHub. No pull request was created or merged during this task, so PR state is **`NOT_CREATED`**. The branch contains the implementation commit and the separately maintained Atlas documentation changes are not part of the deployed implementation commit.

## 3. Confirmed root cause

The previous Function implementation accessed `req.body` inside `rawBody(req)`. In the current Appwrite Functions request contract, `req.bodyText` is the raw text field and `req.bodyJson` is the parsed JSON field; Appwrite explicitly recommends using `req.bodyText` or `req.bodyJson` instead of legacy `req.body`.[1]

For malformed `application/json`, the legacy `req.body` getter threw a `SyntaxError` before the repository’s explicit `JSON.parse` catch could classify the request as `malformed_body`. The live pre-fix execution `6a8d381db3c6209e9e6a` recorded HTTP `500` and status Failed. This was a runtime compatibility defect, not an authentication bypass, and the rejected request did not mutate either provider-state collection.

## 4. Exact implementation

The fix is limited to the request-body helper. It first attempts `req.bodyText` and returns it when it is a string. The compatibility fallback for legacy `req.body` remains inside its own defensive `try/catch`, so a throwing getter cannot escape the parser. The existing 256 KB size guard and explicit `JSON.parse` handling remain unchanged. Authentication still runs before parsing and database access.

A focused regression test now constructs a request with malformed `bodyText: '{'` and a legacy `body` getter that throws `SyntaxError` if accessed. The test invokes the real exported Function handler and proves that the response is `{ status: 'error', code: 'malformed_body', message: 'Malformed request.' }` with HTTP `400`.

## 5. Files changed

| File | Change | Status |
|---|---|---|
| `appwrite-hubs/revenuecat-webhook/src/main.js` | Prefer `req.bodyText`; defensively isolate legacy `req.body` fallback | Deployed |
| `tests/hubs/revenuecat-webhook.test.cjs` | Add real bodyText-plus-throwing-getter regression test | Validated |
| `src/lib/devkit/sourceHashes.generated.json` | Regenerate the webhook source hash | Validated |
| `Project Atlas/WHERE_WE_STOPPED.md` | Record the proven security-gate result | Documentation closeout |
| `Project Atlas/CHANGELOG.md` | Record implementation, deployment, and smoke evidence | Documentation closeout |
| `Project Atlas/reports/2026-08-25-payments-phase2b-runtime-verification.md` | Store this evidence report | Documentation closeout |

No source file for checkout, AI limits, unrelated Functions, payment collections, schema permissions, DNS, or provider catalog configuration was changed.

## 6. Local validation

The required validation completed successfully in the isolated clone. The focused RevenueCat webhook, schema, and AI plan-regression suite passed **12/12 tests**. `npx tsc --noEmit` passed. `node --check` passed for `appwrite-hubs/revenuecat-webhook/src/main.js` and `scripts/setup_revenuecat_schema.cjs`. `git diff --check` passed, and the repository source-hash generation/check completed successfully.

The test process emitted expected warnings for missing unrelated local AI/admin smoke-test environment variables. Those warnings did not fail the focused suite, no AI credits were spent, and no production secrets were exposed.

## 7. Source-hash state

The regenerated normalized source hash for `revenuecat-webhook` is:

`10c19ccbc0c62eeed81929a874b761f95e85bee259ef62cf341b68e72d5a8a4e`

The targeted deployment workflow recomputed the source-hash manifest and passed the repository’s committed-manifest check. The deployed Function’s active deployment was then verified through Appwrite and by live behavior. The Appwrite Console does not expose a normalized source-hash field in the inspected deployment card, so the hash is proven as the committed repository manifest and as the source used by the successful targeted workflow, rather than as a separately displayed Console hash.

## 8. Targeted deployment

The approved repository-controlled workflow `Deploy Appwrite Hubs` was dispatched on `fix/revenuecat-bodytext-runtime` with the exact input `target=revenuecat-webhook`. Run `32818859197` completed with status **success**. It validated the explicit target, recomputed and verified the source hash, ran the idempotent RevenueCat schema preflight, and deployed only the selected Function. No `target=all`, Appwrite Console deployment, or unrelated hub deployment was used.

The active Appwrite deployment is shown as:

| Field | Verified value |
|---|---|
| Function | `revenuecat-webhook` |
| Active deployment ID | `6a8d3bb7c758c5514b95` |
| Status | Active |
| Runtime | Node-22 |
| Build duration | 4 seconds |
| Total size | 3.1 MB |
| Source | Manual |
| Domain | `revenuecat-webhook.wiseresume.app` |
| Global CDN | Connected |
| DDoS protection | Connected |

The Appwrite Console still displays a generic warning that some configuration changes are not live yet. No additional Redeploy action was taken because the targeted deployment is active and the live smoke tests prove the body-handling fix is running. The warning should be reviewed separately if it persists after this branch is reviewed.

## 9. Post-deployment security smoke tests

| Test | Expected | Actual | Appwrite execution | Status |
|---|---:|---|---|---|
| Missing Authorization | `401` | `401` with `unauthorized` | `6a8d3bf091ccc6f14199`, Completed | Pass |
| Invalid Authorization | `401` | `401` with `unauthorized` | `6a8d3bfd1344215a26f4`, Completed | Pass |
| Valid secret + malformed JSON | `400 malformed_body` | `400` with `malformed_body` | `6a8d3c163f4c84b14675`, Completed | Pass |

The valid-secret malformed-body test was sent twice to confirm both the HTTP status and response payload. The first execution, `6a8d3c0bcbb4adac579c`, also completed with HTTP `400`; the second execution confirmed the exact JSON response:

```json
{"status":"error","code":"malformed_body","message":"Malformed request."}
```

The previous pre-fix Failed execution remains visible in Appwrite history, but it is not part of the post-deployment result set. All four post-deployment smoke executions were shown as Completed in the authenticated Appwrite Executions view.

## 10. Mutation checks

The live Appwrite table for `revenuecat_event_ledger` shows **“You have no rows yet”** after the post-deployment rejected-request tests. The live table for `revenuecat_subscription_state` also shows **“You have no rows yet.”** Therefore the three security smoke cases caused zero event-ledger rows and zero provider-state rows.

The collection names, server-only design, and existing schema were not changed by this task. No valid RevenueCat event was sent, so no provider state or ledger state was expected to be created.

## 11. Domain and authentication status

The exact custom hostname `https://revenuecat-webhook.wiseresume.app` remains strict-TLS valid and reaches the intended active Appwrite Function. The Function’s configured environment-variable names include `REVENUECAT_WEBHOOK_AUTH_SECRET`, marked Secret. The valid-secret smoke test passed authentication and reached the malformed-body response path; the secret value itself remains undisclosed.

No DNS record, certificate, nameserver, secret, or Function permission was modified. The Function remains intentionally reachable for HTTP execution while enforcing its own Authorization contract.

## 12. Provider and lifecycle boundary

RevenueCat webhook integration was not created, modified, deleted, or redelivered. RevenueCat project listing previously confirmed the accessible project `TheWiseCloud` (`proj6af6d43e`), but this fix session did not inspect or mutate webhook integrations after the security gate. No Production webhook was activated, no Sandbox lifecycle delivery was sent, and no fabricated webhook payload was used.

Pro activation, Paddle Sandbox transaction verification, App User ID mapping, persistence after refresh/reopen, duplicate delivery, out-of-order delivery, cancellation, billing issue, expiration, entitlement coexistence, Ultimate mapping, and live effective-plan UI verification remain **not started** by design. The repository-level state-machine and resolver tests passed, but they are not a substitute for live provider lifecycle evidence.[2] [3]

## 13. Checkout and Production status

Frontend checkout was not implemented or enabled. Production payments remain inactive. The previously recorded Paddle Sandbox credential-rotation warning remains unresolved; its value was not retrieved or repeated in this task. Rotation or revocation should occur before any future provider activation or Production payment work.

## 14. Atlas and documentation status

The Atlas handover and changelog were updated in the isolated fix branch with the final proven state: `RUNTIME_SECURITY_GATE_VERIFIED`, the exact root cause, the three smoke-test results, the successful targeted workflow, the active deployment ID, the empty live collections, and the fact that RevenueCat lifecycle testing and checkout remain stopped/disabled. The report is stored at `Project Atlas/reports/2026-08-25-payments-phase2b-runtime-verification.md`.

The documentation commit is intentionally separate from the deployed implementation commit. It has not been pushed or merged yet because the code deployment already completed from the implementation commit and no new runtime deployment is needed for documentation-only changes.

## 15. Remaining risks and exact next action

The security gate is verified, but live RevenueCat lifecycle behavior is still unknown. The Appwrite Console’s generic not-live warning should be reviewed separately if it persists. The Paddle Sandbox credential-rotation warning remains an operational risk. No real customer data or Production payment state was used.

**Exact next action:** owner review of this verified gate and the scoped branch/commit. Only after review and explicit authorization should a separate session inspect or reuse exactly one RevenueCat Sandbox webhook, confirm a dedicated non-real QA fixture, and begin Pro/Ultimate lifecycle testing. Do not activate frontend checkout or Production payments in this fix session.

## References

[1]: https://appwrite.io/docs/products/functions/develop "Appwrite Functions development and request contract"
[2]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[3]: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields "RevenueCat Webhook Event Types and Fields"
