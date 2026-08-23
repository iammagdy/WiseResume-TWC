# WiseResume Payments Phase 1 — RevenueCat Provider-State Implementation Report

**Date:** 2026-08-22
**Status:** `SCHEMA_APPLIED_VERIFIED` — Phase 2A only
**Branch:** `fix/payments-phase2a-schema-compat`
**Baseline:** `3cc66720a176912de22fefcc35b43028ed79ec68` (`origin/main` before this Phase 2A correction)
**Scope:** Repository-controlled additive Appwrite schema application and read-only live verification. No Function deployment, webhook configuration, secret configuration, payment activation, or Production data change was authorized or performed.

## Verdict

Phase 2A applied exactly the two repository-controlled additive RevenueCat collections to Appwrite project `69fd362b001eb325a192`, database `main`, and verified their live schema, indexes, uniqueness constraints, server-only permissions, document-security flags, and zero document counts. The existing overloaded `subscriptions` collection remained untouched. The Function, webhook secret, RevenueCat webhook configuration, checkout, and payment activation remain unconfigured and unverified.

> `SCHEMA_APPLIED_VERIFIED` means only the two additive collections were applied and their live contracts were verified; it does not mean the Appwrite Function is deployed, a RevenueCat webhook is configured, or payments are active.

## 1. Scope completed

The implementation adds a new Appwrite hub, a shared server-side resolver package, two idempotent schema definitions, targeted deployment metadata, focused test coverage, and Atlas documentation. Phase 2A executed only the schema setup script; it did not activate checkout, alter payment settings, create a RevenueCat webhook, deploy Appwrite Functions, change secrets, or mutate Production data.

| Area | Result | Evidence |
|---|---|---|
| Provider state | Implemented additively | `appwrite-hubs/revenuecat-webhook`, shared resolver |
| Durable idempotency | Implemented locally | `revenuecat_event_ledger`, unique `event_id` index definition |
| Effective-plan policy | Implemented locally | Shared resolver consumed by coupons, AI gateway, and admin plan/trial writes |
| Webhook authentication | Implemented fail-closed | `REVENUECAT_WEBHOOK_AUTH_SECRET`, constant-time comparison |
| Schema setup | Defined but not executed | `scripts/setup_revenuecat_schema.cjs` |
| Deployment | Not performed | No Appwrite or Vercel deployment run |
| Provider dashboard | Unchanged | No RevenueCat/Paddle dashboard action |
| Payments | Not activated | Checkout remains disabled |

## 2. Repository changes

The main implementation files are `appwrite-hubs/revenuecat-webhook/src/main.js`, `appwrite-hubs/shared-subscription-resolver/index.js`, and `scripts/setup_revenuecat_schema.cjs`. The existing `coupons`, `ai-gateway`, and `admin-devkit-data` hubs now consume the shared resolver or provider-state read path without changing their server-only mutation posture. `appwrite.json`, `scripts/appwrite-function-policy.cjs`, `scripts/compute-source-hashes.mjs`, `scripts/deploy_hubs.cjs`, and `.github/workflows/deploy-appwrite-hubs.yml` include the new function and explicit targeted setup references.

The generated source-hash manifest was refreshed locally. Hub package lockfiles were regenerated for the local file dependency. Focused tests were added under `tests/hubs/`. Atlas architecture, changelog, and handover documents were updated; this report is stored under `Project Atlas/reports/`.

## 3. Plan identity and commercial mapping

WiseResume public labels remain **Free**, **Pro**, and **Ultimate**. Internal values remain `free`, `pro`, and `premium`. The resolver defensively maps a legacy read of `ultimate` to `premium`, but the webhook only writes `pro` or `premium`; no provider state or ledger plan value is `ultimate`.

| Public plan | Internal plan | RevenueCat entitlement | Verified Sandbox product/price mapping |
|---|---|---|---|
| Free | `free` | None | None |
| Pro | `pro` | `pro` | `pri_01m0fnjspex6yqqf6w9v9apaxg` → `pro` |
| Ultimate | `premium` | `premium` | `pri_01m0fnq9hetwdwm9e1sa49n08s` → `premium` |

A product is accepted only when the product identifier and entitlement identifier agree. Unknown products, unknown entitlements, mismatches, malformed timestamps, unsupported environments, and unknown users grant no access.

## 4. Additive schema design

The unexecuted setup script defines two Appwrite `main` database collections. Both require empty collection permissions and `documentSecurity=false`, so browsers have no direct read or write access. The setup is idempotent and fail-closed: missing compatible attributes and indexes may be created, while incompatible existing objects stop the run rather than being overwritten.

### `revenuecat_subscription_state`

This collection stores the minimum normalized current provider state: canonical Appwrite `user_id`, internal `plan`, `entitlement_id`, verified `product_id`, `environment`, lifecycle `status`, `expires_at`, `will_renew`, `latest_event_id`, `latest_event_type`, `latest_event_timestamp_ms`, and `updated_at`. A unique `user_id_unique` index guarantees at most one current provider-state row per canonical Appwrite user; the webhook additionally uses a deterministic per-user document ID. A companion user lookup index and latest-event index are defined. The collection is server-only and is not an alternative browser subscription source.

### `revenuecat_event_ledger`

This collection stores `event_id`, `event_type`, canonical `user_id` when valid, `event_timestamp_ms`, `received_at`, `processing_status`, `ordering_key`, `outcome_code`, and `expires_at`. `event_id_unique` is a unique index. The local retention contract assigns a 90-day expiry marker; a future scheduled cleanup can delete expired ledger rows. The short-lived AI idempotency cache is not reused.

No attribute, index, permission, document-security setting, or document in the existing `subscriptions` collection was changed.

## 5. Effective-plan resolver

The shared resolver builds candidates from manual/admin entitlement, valid coupon entitlement, active trial entitlement, valid non-expired RevenueCat provider entitlement, and Free fallback. Plan rank is `free < pro < premium`; `effective_plan` is the highest currently valid candidate rather than the last writer.

This means provider expiration removes only the provider candidate. A stronger manual, coupon, or trial candidate survives. A provider purchase cannot downgrade a higher valid entitlement. Cancellation and billing issue stop renewal intent but preserve access until the verified expiration. Uncancellation restores renewal state. When no valid paid or trial candidate remains, Free is returned.

The coupon subscription reader now optionally reads provider state and falls back safely when the additive collection is not yet present. The AI gateway resolves provider state independently while preserving its current limits. Admin manual-plan and trial mutations recompute `effective_plan` against provider state so they cannot accidentally erase a stronger active provider entitlement.

## 6. Webhook transport and authentication

The new `revenuecat-webhook` function uses Appwrite `execute: ["any"]` solely because an external HTTPS webhook cannot present a browser user session. Function invocation permission is not treated as authorization. The function compares the bearer value from the `Authorization` header with the environment variable named `REVENUECAT_WEBHOOK_AUTH_SECRET` using a constant-time comparison. Missing configuration, missing authorization, and invalid authorization fail closed with HTTP 401 before request parsing or mutation.

The handler safely parses bounded JSON, never logs payloads, authorization values, customer details, secrets, or raw errors, and returns sanitized status codes/messages. It uses RevenueCat `app_user_id` as the canonical Appwrite user ID and verifies that the Appwrite Auth user exists before provider-state or ledger writes.

## 7. Supported lifecycle semantics

The local handler supports `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, and `PRODUCT_CHANGE`.

| Event | Local provider-state behavior | Access consequence through resolver |
|---|---|---|
| `INITIAL_PURCHASE` | Stores active verified plan and period end | Grants only the valid provider candidate |
| `RENEWAL` | Stores active plan and refreshed period end | Extends provider candidate |
| `CANCELLATION` | Stores canceled status and `will_renew=false` | Preserves access through expiration |
| `UNCANCELLATION` | Restores active status and renewal intent | Preserves/restores provider candidate |
| `EXPIRATION` | Marks only provider state expired | Removes provider candidate, not manual/coupon/trial access |
| `BILLING_ISSUE` | Stores billing-issue status without immediate revoke | Preserves access through expiration |
| `PRODUCT_CHANGE` | Stores the new verified product/entitlement and period end | Resolves the new valid provider candidate |

RevenueCat’s official documentation verifies HTTPS POST delivery, Authorization headers, at-least-once delivery, repeated event IDs on retries, and retrying non-200 responses.[1] [2] The implementation records duplicate and stale outcomes durably and does not use last-writer-wins semantics.

## 8. Idempotency and ordering

The ledger document ID is deterministically derived from the RevenueCat event ID, and the schema additionally defines a unique event ID index. A previously recorded event returns a duplicate outcome without state mutation. An event older than the stored provider-state timestamp is recorded as ignored and cannot regress the state. A concurrent unique-index conflict is expected to fail closed and can be retried by the provider delivery mechanism after the function returns a non-200 response.

## 9. Tests and validation evidence

The final security/schema review identified and fixed a local gap: the initial provider-state schema had only a non-unique lookup index, so `user_id_unique` was added and covered by regression tests. The following focused mock-only lifecycle and contract coverage passed:

| Suite | Result |
|---|---:|
| RevenueCat webhook lifecycle/security/ordering suite | 11 passed |
| RevenueCat schema contract suite | 3 passed |
| AI provider-plan regression suite | 2 passed |
| Appwrite function-policy suite | 4 passed |
| Existing coupon security and atomic-redemption suites | 2 passed |
| Existing AI credit concurrency suite | 1 passed |
| Focused Node total | **18 passed** |

The full frontend Vitest suite passed with **222 files passed, 1 skipped; 1,236 tests passed, 8 skipped, and 1 todo**. `node --check` passed for changed JavaScript/CJS files. `npx tsc --noEmit` passed. `git diff --check` passed. The first plain build attempt was terminated by sandbox memory pressure; the same `npm run build` completed successfully using `NODE_OPTIONS=--max-old-space-size=2048`. The successful build retained existing advisory large-chunk warnings and passed the no-sourcemap check.

Tests do not call Appwrite, RevenueCat, Paddle, Vercel, or Production services. Mocks cover authentication failures, malformed payloads, unknown identity/product/entitlement, Pro and premium purchase, renewal, cancellation without early revoke, uncancellation, expiration, billing issue, product change, duplicate delivery, stale delivery, manual/coupon/trial preservation, highest-valid-plan resolution, Free fallback, no `ultimate` persistence, AI plan regression, and no mutation on invalid identity.

## 10. Final security review result

The final review confirms authentication occurs before body parsing or mutation; missing or invalid Authorization fails closed; sensitive payloads, headers, customer data, secrets, and raw errors are not logged; browser checkout state cannot grant access; `app_user_id` is treated as the canonical Appwrite user ID; and unknown identity, product, entitlement, or event inputs cannot grant access. Provider state and the ledger use empty collection permissions with explicit `documentSecurity=false` in the repository-controlled schema contract.

The provider-state uniqueness requirement is proven by both the unique `user_id_unique` Appwrite index and the deterministic `rcs_<sha256(user_id)>` document ID strategy. Event uniqueness is proven by the unique `event_id_unique` index and deterministic ledger document ID. Setup compatibility checks are idempotent and fail closed on incompatible attributes, indexes, permissions, or document-security settings. The existing `subscriptions` collection is not destructively modified.

## 11. Git and deployment state

The implementation commits were pushed on `feat/revenuecat-subscription-sync` and merged through PR #201 at `2026-08-23T16:56:51Z` with merge commit `4ee28340618d12b6d1e10913013c2d18c7353bc1`. `origin/main` contains the implementation; no force operation occurred.

The repository-controlled schema setup command was executed against Appwrite project `69fd362b001eb325a192`, database `main`, and completed successfully after the Appwrite-compatible `will_renew` correction. No Appwrite Function was deployed. No RevenueCat webhook was created or changed. No Paddle product, price, webhook, API key, subscription, or dashboard setting was changed. No Vercel configuration or deployment was changed. No webhook secret or Appwrite Function environment value was configured. Checkout and payment activation remain disabled.

## 12. Phase 2A live schema verification

The live verification used a temporary sanitized Node/Appwrite SDK reader and inspected only collection metadata, attributes, indexes, permissions, `documentSecurity`, and document totals. No customer/provider documents were read.

| Collection | Live result |
|---|---|
| `revenuecat_subscription_state` | Exists in `main`; exact attributes available; `will_renew` is optional boolean with default `true`; `user_id_unique` is available and unique; `permissions=[]`; `documentSecurity=false`; document total `0`. |
| `revenuecat_event_ledger` | Exists in `main`; exact attributes available; `event_id_unique` is available and unique; `permissions=[]`; `documentSecurity=false`; document total `0`. |
| Existing `subscriptions` | Existing `User Subscriptions` collection remained readable with its existing permissions and `documentSecurity=true`; the setup script did not target or mutate it. |

The first setup attempt stopped on Appwrite’s rule that a required attribute cannot also have a default. The repository definition was corrected to `will_renew` optional/default `true`, the schema contract test was extended, and the idempotent setup was rerun successfully.

## 13. Merged PR state

PR [#201](https://github.com/iammagdy/WiseResume-TWC/pull/201) merged at `2026-08-23T16:56:51Z` with merge commit `4ee28340618d12b6d1e10913013c2d18c7353bc1`. Documentation closeout PR [#202](https://github.com/iammagdy/WiseResume-TWC/pull/202) merged at `2026-08-23T17:00:54Z` with merge commit `3cc66720a176912de22fefcc35b43028ed79ec68`. The implementation and closeout documentation are present on `main`; the live schema was subsequently applied only in this Phase 2A task.

Before merge, PR Validation, Security validation, Vercel, and Vercel Preview Comments passed after the root dependency fix. TestSprite Pre-Check reported `FAILURE` with no tests detected, remained informational, and was not modified. PR #201 was marked ready and merged through the normal workflow; no CI configuration was changed to alter these statuses.

## 14. Browser and live verification

Browser/runtime verification was not performed in this schema-only phase. Live Appwrite schema verification is complete for the two additive collections. RevenueCat webhook delivery, Appwrite user lookup through the Function, live provider-state persistence, Realtime subscription refresh, AI limit behavior against live provider state, and Production payment behavior remain **UNVERIFIED** because the Function and webhook are not deployed/configured.

## 15. Risks and required next action

The remaining risk is integration configuration and runtime verification: the Appwrite Function must be deployed through the targeted repository workflow, the webhook secret must be configured out of band, and RevenueCat must be pointed to the deployed HTTPS endpoint. Those steps were intentionally not performed here. A future rollout should re-check the live server-only collections, deploy only the targeted Function, configure the secret, create the RevenueCat webhook in the intended Sandbox environment, and then run safe lifecycle verification.

The required next action is a separate owner-approved Function/webhook configuration phase. Do not describe this work as Production-ready until the targeted Appwrite Function is deployed, the secret and RevenueCat webhook are configured, and browser/runtime verification is completed.

## References

[1]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[2]: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields "RevenueCat Webhook Event Types and Fields"

SCHEMA_APPLIED_VERIFIED
