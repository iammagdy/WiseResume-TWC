# WiseResume PayPal Subscription Synchronization & Entitlement Resolution

**Last Verified:** 2026-09-03
**Status:** `IMPLEMENTED_UNVERIFIED_PAYPAL_PHASE2` — Phase 2 implementation for additive PayPal Appwrite schema, multi-provider subscription resolution, and Sandbox QA entitlement isolation is complete locally. Code is not committed, not pushed, and not deployed. No live Appwrite schema has been created, no PayPal webhook exists, no checkout API is enabled, and Production payments remain disabled.
**Location:** `Project Atlas/architecture/paypal-subscription-sync.md`

## Scope and Preserved Contracts

WiseResume supports PayPal Subscriptions as a secondary payment provider path alongside RevenueCat/Paddle. The implementation is additive and server-authoritative:
- Provider state is stored in a dedicated server-only collection (`paypal_subscription_state`).
- It never overwrites or pollutes the legacy `subscriptions` collection.
- Public plan labels remain **Free**, **Pro**, and **Ultimate**. Internal plan values remain `free`, `pro`, and `premium`.
- Public Ultimate maps strictly to internal `premium`; `ultimate` is never accepted as an internal plan value or written to the database.
- AI quota behavior remains: Free `5/day`, Pro `50/day`, Premium unlimited (`-1`).
- Existing RevenueCat/Paddle and manual/admin/coupon entitlements remain fully intact.

## Additive Appwrite Collections

The repository includes the idempotent, unexecuted provisioner script `scripts/setup_paypal_schema.cjs`. It defines two server-only collections (`permissions = []`, `documentSecurity = false`):

| Collection | Purpose | Browser Access | Retention |
|---|---|---|---|
| `paypal_subscription_state` | One normalized current PayPal subscription state per canonical Appwrite user | None (server API key only) | Durable current state |
| `paypal_event_ledger` | Durable event deduplication, outcome logging, and audit ledger | None (server API key only) | 90-day retention via `expires_at` |

### Provider State Attributes (`paypal_subscription_state`)
- `user_id`: string(64), required — **Unique Index (`user_id_unique`)**
- `plan`: string(16), required (`pro` | `premium`)
- `subscription_id`: string(64), required (PayPal `I-...`) — **Index (`subscription_id_idx`)**
- `plan_id`: string(64), required (PayPal `P-...`)
- `environment`: string(16), required (`sandbox` | `production`)
- `status`: string(32), required (`pending_initial_payment` | `active` | `billing_issue` | `canceled` | `suspended` | `expired`)
- `expires_at`: string(32), optional (ISO 8601)
- `will_renew`: boolean, default `true`
- `grace_period_expires_at`: string(32), optional (ISO 8601)
- `latest_event_id`: string(128), required
- `latest_event_type`: string(64), required
- `latest_event_timestamp_ms`: integer, required — **Index (`latest_event_idx` DESC)**
- `updated_at`: string(32), required

*Privacy Boundary:* `payer_id`, customer email, customer name, and payment credentials are intentionally excluded from persistence.

### Event Ledger Attributes (`paypal_event_ledger`)
- `event_id`: string(128), required — **Unique Index (`event_id_unique`)**
- `event_type`: string(64), required
- `user_id`: string(64), optional
- `subscription_id`: string(64), optional
- `event_timestamp_ms`: integer, required
- `received_at`: string(32), required
- `processing_status`: string(24), required (`processed` | `duplicate` | `ignored` | `rejected` | `failed`)
- `ordering_key`: string(160), required
- `outcome_code`: string(48), required
- `expires_at`: string(32), required (90-day retention) — **Index (`expires_at_idx`)**

## PayPal Sandbox Catalog (Verified 2026-09-03 via MCP)
- **Product Name:** `WiseResume`
- **Product ID:** `PROD-8XE5253028560521H`
- **Pro Plan ID:** `P-3A193536YV1432359NKM36QY` ($5.00 USD/month, active, unlimited cycles, threshold 1) -> internal `pro`
- **Ultimate Plan ID:** `P-17M39010JR353545NNKM36RA` ($10.00 USD/month, active, unlimited cycles, threshold 1) -> internal `premium`
- *Note:* Previously created plan IDs `P-2X...` and `P-9D...` belong to Live production and are strictly reserved for production wiring in Phase 4.

## Multi-Provider Resolver Policy

`appwrite-hubs/shared-subscription-resolver` evaluates candidate entitlements with strict ranking:
```
free (rank 0) < pro (rank 1) < premium (rank 2)
```

Candidates are gathered from:
1. `free` fallback (rank 0)
2. Legacy manual/admin or coupon subscription (`subscriptions`)
3. Active trial (`subscriptions.trial_plan` with future expiration)
4. RevenueCat provider state (`revenuecat_subscription_state`)
5. PayPal provider state (`paypal_subscription_state`)

### Provider Environment Isolation
- **RevenueCat Environment:** Configured via `BILLING_ACCESS_ENVIRONMENT || BILLING_CHECKOUT_ENVIRONMENT` (or explicit `providerEnvironment`).
- **PayPal Environment:** Configured via `PAYPAL_ACCESS_ENVIRONMENT` (or explicit `paypalProviderEnvironment`).
- **Decoupling Guarantee:** PayPal Sandbox testing does not require setting `BILLING_ACCESS_ENVIRONMENT=sandbox`. RevenueCat Sandbox state remains rejected if RevenueCat's environment is unconfigured or set to `production`.
- **Fail-Closed:** Missing PayPal environment configuration evaluates to `''` and fails closed to Free.

### PayPal Candidate Qualification Rules
A PayPal candidate qualifies for paid access if and only if:
1. **Environment Match:** `paypalProviderState.environment` matches caller's configured `selectedPaypalEnvironment`.
2. **Valid Paid Plan:** Plan is normalized to `pro` or `premium`.
3. **Allowed Status:** Status is in `VALID_PROVIDER_STATUSES` (`active`, `billing_issue`, `canceled`).
   - `pending_initial_payment`: Disallowed (grants no paid access).
   - `suspended`: Disallowed (grants no paid access).
   - `expired`: Disallowed (grants no paid access).
4. **Future Expiration:** `expires_at` is in the future relative to `nowMs`.
   - `billing_issue`: Paid access preserved until 48-hour grace expires.
   - `canceled`: Paid access preserved until already-paid billing cycle expires.
5. **Canonical QA Ownership Boundary:** If `environment === 'sandbox'`, candidate is accepted only when:
   - `currentCanonicalUserId === BILLING_CHECKOUT_QA_USER_ID`
   - AND `paypal_subscription_state.user_id === currentCanonicalUserId`
   - Both must be non-empty and match. No fallback logic. If unconfigured or mismatched, fails closed to Free.

### Multi-Provider Precedence
Existing candidate order is preserved for same-rank candidates (`reduce` using strict `>` rank comparison). Manual/admin or coupon beats RevenueCat, and RevenueCat beats PayPal for identical plan ranks. Higher plan rank strictly wins (e.g. PayPal Premium beats RevenueCat Pro).

## Server-Side Consumers Updated in Phase 2
- `appwrite-hubs/coupons/src/main.js`: `getMySubscription` queries `findPaypalProviderState` and passes `paypalProviderState` and `userId` to `resolveEffectivePlan`.
- `appwrite-hubs/ai-gateway/src/main.js`: `getEffectivePlan` queries `paypal_subscription_state` and passes `paypalProviderState` and `userId` to `resolveEffectivePlan`.
- `appwrite-hubs/admin-devkit-data/src/main.js`: `resolvedPlan` accepts `paypalProviderState` and `userId`.
- `appwrite-hubs/billing-checkout/src/main.js`: `getEffectivePlan` queries `paypal_subscription_state` and passes `paypalProviderState` and `userId` to `resolveEffectivePlan`.

All reads wrap the PayPal collection in safe `try/catch` blocks that fallback to `null` if the collection does not yet exist in live Appwrite.
