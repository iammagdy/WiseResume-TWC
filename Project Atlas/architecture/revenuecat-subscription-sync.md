# WiseResume RevenueCat Subscription Synchronization

**Last Verified:** 2026-08-28
**Status:** `SANDBOX_RUNTIME_READY_SAFE_PROVIDER_CREDENTIAL_REQUIRED` — Phase 1 implementation, Phase 2A schema, targeted webhook deployment, existing Sandbox Pro lifecycle, public Sandbox checkout boundary, additive checkout schema, targeted kill-switch-off `billing-checkout` deployment, and final Codex handover are documented. Provider-authenticated checkout execution remains blocked because no safe server Paddle credential is authorized for use. Frontend billing and Production payments remain disabled. The prior Paddle Sandbox credential exposure is `SECURITY_INCIDENT_SECRET_EXPOSURE` / `OWNER_ACCEPTED_UNRESOLVED_RISK`; this is not a Production security approval.
**Location:** `Project Atlas/architecture/revenuecat-subscription-sync.md`

## Scope and preserved contracts

WiseResume uses RevenueCat as a future provider transport for Paddle subscription lifecycle events. The implementation is additive and does not write provider lifecycle directly into the overloaded `subscriptions.plan` or `subscriptions.effective_plan` fields. Public plan labels remain **Free**, **Pro**, and **Ultimate**. Internal plan values remain `free`, `pro`, and `premium`; public Ultimate maps to internal `premium`, and `ultimate` is never a provider-state write value.

Existing manual/admin, coupon, active-trial, Free fallback, server-side AI enforcement, and disabled checkout behavior remain in place. AI limits remain Free `5` per day, Pro `50` per day, and the existing premium unlimited behavior.

## Additive Appwrite collections

The repository includes the unexecuted `scripts/setup_revenuecat_schema.cjs` provisioner. It creates or verifies two server-only collections in the `main` database. The provisioner is idempotent and fail-closed: it adds only missing compatible attributes and indexes, rejects incompatible existing objects, requires empty collection permissions, and requires `documentSecurity=false`. It never changes the existing `subscriptions` collection.

| Collection | Purpose | Browser access | Retention |
|---|---|---|---|
| `revenuecat_subscription_state` | One normalized current RevenueCat state per canonical Appwrite user | No collection permissions; server API key only | Current state retained while useful; no event-history retention responsibility |
| `revenuecat_event_ledger` | Durable event-id deduplication, processing outcome, and stale-event ordering evidence | No collection permissions; server API key only | `expires_at` metadata is set to 90 days; a future scheduled cleanup may remove expired ledger documents |

### Provider-state attributes

`revenuecat_subscription_state` contains `user_id` (required string, 64), `plan` (required string, 16), `entitlement_id` (required string, 64), `product_id` (required string, 128), `environment` (required string, 16), `status` (required string, 24), `expires_at` (required string, 32), `will_renew` (optional boolean, default `true`), `latest_event_id` (required string, 128), `latest_event_type` (required string, 32), `latest_event_timestamp_ms` (required integer), and `updated_at` (required string, 32). The `user_id_unique` unique index guarantees at most one current provider-state document per canonical user; the companion user index supports server-side lookup, and the latest-event index supports operational inspection.

### Event-ledger attributes

`revenuecat_event_ledger` contains `event_id` (required string, 128), `event_type` (required string, 32), optional `user_id` (string, 64), `event_timestamp_ms` (required integer), `received_at` (required string, 32), `processing_status` (required string, 24), `ordering_key` (required string, 160), `outcome_code` (required string, 48), and `expires_at` (required string, 32). `event_id_unique` is a unique index, preventing the short-lived AI idempotency cache from being reused for payment lifecycle events.

## Effective-plan policy

The shared package `appwrite-hubs/shared-subscription-resolver` builds valid candidates from the legacy manual/admin or coupon plan, an unexpired trial, a valid unexpired RevenueCat provider state, and the Free fallback. Candidate rank is `free < pro < premium`, and `effective_plan` is the highest currently valid candidate rather than the last writer.

Provider expiration removes only the provider candidate. A manual, coupon, or trial candidate therefore survives provider expiration. Provider purchase cannot downgrade a higher valid candidate. Cancellation and billing issue set provider status and stop renewal intent but preserve the provider candidate until its verified expiry. Uncancellation restores renewal state. Unknown products, entitlements, event types, environments, identities, and malformed timestamps grant nothing. If no paid or trial candidate remains, the resolver returns Free.

The coupon subscription reader and the server-side AI gateway consume provider state through the shared resolver. Admin manual-plan and trial mutations recompute the effective plan against provider state so an admin action cannot accidentally erase a stronger active provider entitlement. No browser write path was added.

## RevenueCat webhook security and identity contract

The new `appwrite-hubs/revenuecat-webhook` function is declared with Appwrite `execute: ["any"]` because an external webhook transport cannot use a browser user session. The function authenticates before JSON parsing or database mutation by comparing the `Authorization` bearer value to the server environment variable name `REVENUECAT_WEBHOOK_AUTH_SECRET` with constant-time comparison. Missing configuration, missing authorization, and mismatches fail closed with HTTP 401. The function uses only the canonical RevenueCat `app_user_id` as the Appwrite user ID and verifies that the Appwrite Auth user exists before state mutation.

Logs contain only a generated/request execution identifier, event type, and safe outcome. Payloads, authorization values, customer details, secrets, and raw errors are not logged or returned. The function never trusts browser checkout state and never writes a provider event into the existing overloaded subscription document.

## Supported lifecycle

The webhook handles `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, and `PRODUCT_CHANGE`. Pro and premium are accepted only when both the verified Paddle Sandbox product/price identifier and the matching RevenueCat entitlement (`pro` or `premium`) agree. The current local mapping is Pro price `pri_01m0fnjspex6yqqf6w9v9apaxg` → `pro` and Premium price `pri_01m0fnq9hetwdwm9e1sa49n08s` → `premium`. These are identifiers, not secrets.

Duplicate deliveries are rejected as already recorded by the durable event ledger. Events older than the current provider-state timestamp are recorded as ignored and cannot regress state. RevenueCat documents HTTPS POST delivery, Authorization headers, at-least-once delivery, repeated event IDs on retries, and retrying non-200 responses; the implementation follows those verified transport requirements.[1] [2]

## Validation and release boundary

Local validation completed for the implementation includes 15 focused Node tests across webhook lifecycle, schema contract, AI plan regression, and Appwrite function-policy coverage; existing coupon and AI concurrency hub tests also passed. The full frontend Vitest suite passed with 222 files, 1,236 tests, 8 skipped tests, and 1 todo. `node --check`, `git diff --check`, and `npx tsc --noEmit` passed. The first plain `npm run build` attempt was terminated by sandbox memory pressure; the same build completed successfully on a bounded-heap retry (`NODE_OPTIONS=--max-old-space-size=2048 npm run build`), retaining only existing advisory large-chunk warnings and emitting no source maps.

Phase 2A applied and live-verified the two additive collections. After two repository-controlled packaging corrections, targeted workflow run `32659598098` from `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` deployed exactly `revenuecat-webhook,coupons,ai-gateway,admin-devkit-data`; each selected Function has a ready latest deployment. The API `live=false` field is not treated as an inferred Production-live claim. The webhook variable name `REVENUECAT_WEBHOOK_AUTH_SECRET` exists and is marked secret; its value is not recorded.

Phase 2C then verified the existing non-real Sandbox Pro path without repeating payment: Paddle automatic Pro completed, RevenueCat recorded one Sandbox `PURCHASES_INITIAL_PURCHASE` with the canonical Appwrite user ID, the Pro entitlement is active, Appwrite recorded one processed `INITIAL_PURCHASE` ledger row and one active provider-state row, and WiseResume resolves Pro from that provider state. The current custom domain returns HTTP 401 to an unauthenticated probe and presents a certificate for `revenuecat-webhook.wiseresume.app`; no lifecycle event was sent during this Phase 2D-A audit. Frontend checkout remains disabled and no Production payment state is authorized or verified. Live cancellation, expiration, billing issue, duplicate replay, stale replay, and Ultimate activation remain `UNVERIFIED`.

A prior RevenueCat app-list response exposed plaintext Paddle Sandbox API-key fields. The owner declined rotation, so the risk remains `OWNER_ACCEPTED_UNRESOLVED_RISK`; no credential-bearing app configuration is treated as cleared for Production.

## Public Sandbox checkout boundary

The public Sandbox/Test Mode contract is implemented locally but remains fail-closed and not provider-executable. The authenticated `billing-checkout` Function requires an explicit trusted `BILLING_CHECKOUT_ENVIRONMENT` of `sandbox` or `production`, selects catalog values only from the matching `BILLING_SANDBOX_*` or `BILLING_PRODUCTION_*` family, requires `BILLING_CHECKOUT_ENABLED=true` and `BILLING_CHECKOUT_PROVIDER_READY=true`, and validates an approved HTTPS checkout origin. Production remains disabled by default and no Production catalog or provider credential is configured by this phase.

The Paddle adapter creates only automatic transactions from server-selected catalog values and canonical Appwrite user metadata. It validates the returned transaction item, product, price, quantity, custom data, collection mode, environment when supplied, and approved HTTPS checkout URL. It returns no raw provider payload and never writes entitlement, credits, subscription, provider-state, or ledger data. RevenueCat-to-Appwrite webhook ingestion remains the only provider-state authority.

The shared resolver accepts a RevenueCat provider candidate only when a trusted caller supplies a valid environment and the persisted state carries the same environment. Missing or mismatched mode ignores the provider candidate while preserving manual/admin, coupon, active-trial, and Free precedence. This prevents retained Sandbox state from granting future Production access. All current resolver consumers use the same environment adapter; deploy-time environment synchronization is a separate targeted operations step.

Pricing and Subscription expose Sandbox/Test Mode and no-real-charge copy in English and Arabic. Authenticated checkout sends only `action`, internal `plan`, and optional idempotency key. Return/pending UI revalidates the authoritative subscription query and never grants a plan locally. The historical single-transaction `_ptxn` path remains a protected QA compatibility path, not the normal public checkout architecture.

The implementation is `SANDBOX_RUNTIME_READY_SAFE_PROVIDER_CREDENTIAL_REQUIRED`: no safe server Paddle credential was authorized, so no provider-authenticated request, new transaction, or live server checkout test occurred during the final completion mission. The additive checkout schema was applied and exactly `billing-checkout` was deployed with the kill switch and provider readiness disabled. The prior exposed Sandbox API-key warning remains an unresolved owner-accepted security warning and is not a Production approval. The complete continuation package is [`reports/2026-08-28-codex-billing-handover.md`](../reports/2026-08-28-codex-billing-handover.md).

## References

[1]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[2]: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields "RevenueCat Webhook Event Types and Fields"
