# WiseResume RevenueCat Subscription Synchronization

**Last Verified:** 2026-08-22
**Status:** `IMPLEMENTED_UNVERIFIED` — implementation merged through PR #201 at `4ee28340618d12b6d1e10913013c2d18c7353bc1`; Appwrite schema application, function deployment, RevenueCat webhook creation, secret configuration, payment activation, and browser/Production verification were intentionally not performed.
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

`revenuecat_subscription_state` contains `user_id` (required string, 64), `plan` (required string, 16), `entitlement_id` (required string, 64), `product_id` (required string, 128), `environment` (required string, 16), `status` (required string, 24), `expires_at` (required string, 32), `will_renew` (required boolean, default `true`), `latest_event_id` (required string, 128), `latest_event_type` (required string, 32), `latest_event_timestamp_ms` (required integer), and `updated_at` (required string, 32). The `user_id_unique` unique index guarantees at most one current provider-state document per canonical user; the companion user index supports server-side lookup, and the latest-event index supports operational inspection.

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

Local validation completed for the new code includes 15 focused Node tests across webhook lifecycle, schema contract, AI plan regression, and Appwrite function-policy coverage; existing coupon and AI concurrency hub tests also passed. The full frontend Vitest suite passed with 222 files, 1,236 tests, 8 skipped tests, and 1 todo. `node --check`, `git diff --check`, and `npx tsc --noEmit` passed. The first plain `npm run build` attempt was terminated by sandbox memory pressure; the same build completed successfully on a bounded-heap retry (`NODE_OPTIONS=--max-old-space-size=2048 npm run build`), retaining only the existing advisory large-chunk warnings and emitting no source maps.

This status remains `IMPLEMENTED_UNVERIFIED` after merge: No Appwrite schema setup script was executed, no Appwrite function was deployed, no RevenueCat webhook was created, no secret or environment value was entered or changed, no Paddle or Vercel configuration was changed, no checkout was activated, and no Production data was mutated. The repository implementation was committed, pushed, and merged through PR #201; no external deployment or payment activation occurred.

## References

[1]: https://www.revenuecat.com/docs/integrations/webhooks "RevenueCat Webhooks"
[2]: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields "RevenueCat Webhook Event Types and Fields"
