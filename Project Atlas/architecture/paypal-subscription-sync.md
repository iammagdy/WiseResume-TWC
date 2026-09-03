# WiseResume PayPal Subscription Synchronization & Entitlement Resolution

**Last Verified:** 2026-09-04
**Status:** `PAYPAL_PHASE3_CONCURRENCY_PROVEN_CI_PASS_READY_FOR_FINAL_MERGE_REVIEW` — Phase 3 implementation for dedicated Appwrite Function webhook ingress (`paypal-webhook`), signature verification, canonical correlation bridge, idempotency ledger, single-winner reservation reclamation lease (`reclaimLedgerReservation` via Appwrite transaction conflict detection; un-versioned delete-create eliminated), memoized server-side PayPal subscription snapshot reuse, strict fail-closed authoritative paid-through expiry resolution (zero manufactured 30-day calendar dates), retry-safe HTTP 503 transient error classification, failed-payment grace invariant enforcement (no paid grace without prior verified payment; initial payment failure yields Free), terminal event grace preservation (provider `SUSPENDED`/`CANCELLED`/`EXPIRED` cannot shorten active 48-hour app grace), `BILLING.SUBSCRIPTION.UPDATED` entitlement-bearing duration freeze, Sandbox QA mutation boundary, two-stage deployment bootstrap contract, non-mutating preflight validation before schema mutation, explicit fail-closed environment contract (zero implicit sandbox default), webhook-ID anti-downgrade protection, remote CI PR validation wiring (`.github/workflows/pr-validation.yml`), and multi-provider subscription resolution is complete and verified locally via 125 automated test cases across all billing suites (63 tests in `paypal-webhook.test.cjs`).
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

## Dedicated Appwrite Function: paypal-webhook (Phase 3)

The dedicated server-only function `appwrite-hubs/paypal-webhook` provides verified ingress for PayPal Subscriptions webhooks.

### 1. Webhook Signature Verification (`POST /v1/notifications/verify-webhook-signature`)
- Extracts official PayPal transmission headers:
  - `paypal-transmission-id`
  - `paypal-transmission-time`
  - `paypal-cert-url`
  - `paypal-auth-algo`
  - `paypal-transmission-sig`
- Obtains fresh/in-memory OAuth 2.0 access token via `POST /v1/oauth2/token` using server-owned `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
- Calls PayPal verification endpoint with `webhook_id = PAYPAL_WEBHOOK_ID` and raw event payload.
- Requires `verification_status === "SUCCESS"`. Missing headers, network failure, or failed verification fails closed immediately (HTTP 400/401) without mutating state.
- Sensitive credentials, tokens, and authorization headers are never logged or exposed.

### 2. Hard Sandbox-Only Runtime Gate
- In Phase 3, runtime is strictly gated to PayPal Sandbox.
- `PAYPAL_ACCESS_ENVIRONMENT=sandbox`: Allowed (`https://api-m.sandbox.paypal.com`).
- `PAYPAL_ACCESS_ENVIRONMENT=production`: **FAILS CLOSED** (base URL returns empty string; event rejected with `sandbox_only_phase3_gate`).
- Missing or invalid environment: **FAILS CLOSED**.
- Production PayPal remains strictly disabled.

### 3. Canonical User Correlation (Checkout Session Bridge)
To guarantee account ownership without trusting client-supplied data or payer email, user correlation follows a strict 4-step hierarchy:
1. **Local State Check:** Queries `paypal_subscription_state` by `subscription_id`. If correlated previously, uses bound `user_id`.
2. **Server-Owned Checkout Session Bridge:** Queries `billing_checkout_sessions` by `subscriptionId` (checking `provider_transaction_id`, `checkout_reference`, and `session_key`). Validates the resulting `user_id` exists in Appwrite Users (`users.get(userId)`).
3. **Server-Side PayPal GET Subscription:** Queries `GET /v1/billing/subscriptions/{subscriptionId}` to retrieve `custom_id` bound at checkout creation in Phase 4. Validates user exists in Appwrite Users.
4. **Direct Resource `custom_id` Fallback:** If present in event payload, validates user exists in Appwrite Users.
5. If canonical user cannot be established through these trusted server channels, event is safely recorded in `paypal_event_ledger` with `outcome_code: 'unresolved_user_correlation'` and zero state mutation occurs. Payer email is never trusted.

### 4. Idempotency & Single-Winner Concurrency Reservation (`paypal_event_ledger`)
- Global uniqueness: Deterministic Document ID `ppe_${sha256(eventId).slice(0, 29)}` and unique `event_id` index.
- **Write-Order Boundary:** Event identity must be claimed *before* state mutation.
  1. Processor creates a ledger reservation with `processing_status: 'processing'`, `outcome_code: 'in_progress'`.
  2. A concurrent processor receives Appwrite 409 (conflict), inspects the reservation, detects `'processing'` in-flight, and **stops before state mutation** (`outcome: 'duplicate'`, `code: 'concurrent_processing'`).
  3. Redelivery of completed events detects `'processed'`/`'ignored'`/`'rejected'` and returns duplicate without secondary mutation.
  4. **Single-Winner Crash/Timeout Recovery Lease:** If a processor crashes, dies, or times out after reserving the event, the reservation has `processing_status: 'processing'`. Any retry arriving after `PROCESSING_RESERVATION_TTL_MS = 60000` (60 seconds) safely reclaims the lease (`reclaimLedgerReservation`) using an Appwrite database transaction (`createTransaction`). Appwrite's transaction conflict detection guarantees that if multiple recovery deliveries race to reclaim the same reservation, exactly ONE transaction can commit; the losing transaction receives HTTP 409 Conflict, rolls back, and halts safely without mutating state. Un-versioned delete-then-create was proven unsafe via adversarial barrier testing and eliminated. If status is `'failed'`, retries immediately re-claim the lease via transaction.

### 5. Event Ordering & Equal-Timestamp Determinism
- Evaluates incoming `event.eventTimestampMs` against `previousState.latest_event_timestamp_ms`.
- **Strictly Older Events (`incoming < latest`):** Ignored as `stale_event` in ledger; state is not regressed.
- **Equal-Timestamp Events (`incoming == latest`):** Deterministic safety tie-break rule:
  - An equal-timestamp event that would regress or elevate entitlement without a verified payment must **not** mutate state.
  - If existing state is `active`, an equal-timestamp non-payment event (`PAYMENT.FAILED`, `CANCELLED`) cannot regress active state (`outcome_code: 'equal_timestamp_ignored'`).
  - If existing state is `pending_initial_payment`, an equal-timestamp `UPDATED` cannot elevate entitlement (`outcome_code: 'equal_timestamp_ignored'`).
  - Only `PAYMENT.SALE.COMPLETED` on an inactive state is allowed to confirm payment at the same millisecond.

### 6. Event Lifecycle State Machine & UPDATED Non-Elevation Policy

| Event | Status | Plan | `will_renew` | `grace_period_expires_at` | `expires_at` | Description |
|---|---|---|---|---|---|---|
| `BILLING.SUBSCRIPTION.ACTIVATED` | `pending_initial_payment` | Valid Pro/Premium | `true` | `null` | `null` | Initial subscription setup; grants **no** paid access until first payment. |
| `PAYMENT.SALE.COMPLETED` | `active` | Valid Pro/Premium | `true` | `null` | Authoritative next billing time | Verified payment; grants/renews active paid access, clears grace. |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` (initial payment) | `billing_issue` | Preserved | `false` | `null` | `null` | Initial payment failure; records billing problem, grants **zero** paid grace and zero paid entitlement (Free). |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` (renewal) | `billing_issue` | Preserved | `true` | `eventTimestamp + 48h` | `eventTimestamp + 48h` | Renewal failure of active subscription; activates exactly 48-hour grace window. |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` (in grace) | `billing_issue` | Preserved | `true` | Preserved original `G` | Preserved original `G` | Distinct or duplicate failure while already in grace; **never extends** grace period. |
| `BILLING.SUBSCRIPTION.CANCELLED` (in grace) | `billing_issue` | Preserved | `false` | Preserved original `G` | Preserved original `G` | Cancellation during active grace; **must not shorten** the 48-hour app grace. |
| `BILLING.SUBSCRIPTION.CANCELLED` (outside grace) | `canceled` | Preserved | `false` | `null` | Preserved paid expiry | Normal cancellation; retains paid access through already-paid period if prior verified payment exists; otherwise `null`. |
| `BILLING.SUBSCRIPTION.SUSPENDED` (in grace) | `billing_issue` | Preserved | `false` | Preserved original `G` | Preserved original `G` | Suspension during active grace; **must not shorten** the 48-hour app grace. |
| `BILLING.SUBSCRIPTION.SUSPENDED` (outside grace) | `suspended` | Preserved | `false` | `null` | `null` | Subscription suspended outside grace; immediately loses paid entitlement. |
| `BILLING.SUBSCRIPTION.EXPIRED` (in grace) | `billing_issue` | Preserved | `false` | Preserved original `G` | Preserved original `G` | Expiration during active grace; **must not shorten** the 48-hour app grace. |
| `BILLING.SUBSCRIPTION.EXPIRED` (outside grace) | `expired` | Preserved | `false` | `null` | `null` | Subscription expired outside grace; immediately loses paid entitlement. |
| `BILLING.SUBSCRIPTION.UPDATED` | Preserved | **PRESERVED** | Preserved | Preserved | Preserved | Refreshes metadata only; **never elevates paid plan** or extends paid duration without verified payment. |
| `PAYMENT.SALE.REFUNDED` | N/A | N/A | N/A | N/A | N/A | Ledger-only (`ledger_only_policy_pending`); zero state mutation. |
| `PAYMENT.SALE.REVERSED` | N/A | N/A | N/A | N/A | N/A | Ledger-only (`ledger_only_policy_pending`); zero state mutation. |

### 7. 48-Hour Failed Payment Grace Model
- **Prior-Paid Prerequisite:** An app-level 48-hour grace period applies exclusively to a failed renewal of an active, previously verified paid subscription (`previous.status === 'active'`).
- **Initial Payment Failure (`pending_initial_payment` + `PAYMENT.FAILED`):** Sets `status = 'billing_issue'`, `grace_period_expires_at = null`, `expires_at = null`, `will_renew = false`. Zero paid entitlement is granted; resolver yields Free.
- **Preserved Window:** Once an active grace window `G` has started, subsequent failure events (duplicate or distinct) cannot extend `G`.
- **Terminal Event Grace Preservation:** Provider status events (`SUSPENDED`, `CANCELLED`, `EXPIRED`) arriving while `now < G` must **not** shorten the existing 48-hour window. The normalized state remains `billing_issue` with original grace `G` so the resolver continues to grant access until `G` expires.
- **Natural Expiration:** Once `G` passes, `isFutureTimestamp(expires_at, nowMs)` evaluates to false, and the resolver naturally drops entitlement to Free.
- **Recovery:** When a subsequent `PAYMENT.SALE.COMPLETED` arrives, `status = 'active'`, `grace_period_expires_at = null` (grace cleared), and `expires_at` is updated to the authoritative next billing time from PayPal.

### 8. Refund & Reversal Policy Status
- In Phase 3, `PAYMENT.SALE.REFUNDED` and `PAYMENT.SALE.REVERSED` are cryptographically verified, deduplicated, and recorded in `paypal_event_ledger` with `processing_status: 'processed'`, `outcome_code: 'ledger_only_policy_pending'`.
- They do not mutate `paypal_subscription_state`. Production activation remains blocked until an explicit commercial/administrative refund entitlement policy is established.

### 9. Canonical Appwrite Deployment Contract & Reliability
- **Deployment Registration:**
  - `appwrite.json`: Registered as `paypal-webhook` (Node 22, `execute: ["any"]`, entrypoint `src/main.js`).
  - `scripts/appwrite-function-policy.cjs`: Registered under `FUNCTION_EXECUTION_POLICIES` as `anonymous-public` with caller `PayPal HTTPS webhook delivery`.
  - `scripts/deploy_hubs.cjs`: Added to canonical `HUBS` (`paypal-webhook.tar.gz`), `SAFE_SMOKE_CHECKS` (fails closed with 400/401), and variable preparation `ensurePaypalWebhookVariables()`.
  - `.github/workflows/deploy-appwrite-hubs.yml`: Added non-mutating preflight validation step (`Validate PayPal Sandbox bootstrap configuration`) executing `scripts/validate_paypal_bootstrap.cjs` strictly BEFORE `Ensure PayPal subscription schema`.
  - `scripts/validate_paypal_bootstrap.cjs`: Non-mutating preflight validator (zero network/Appwrite calls, zero mutations, zero secret leaks).
  - `appwrite-hubs/paypal-webhook/package-lock.json`: Deterministic lockfile committed with local `@wiseresume/subscription-resolver` file link.
- **Hard-Crash / Timeout Recovery Lease:**
  - In addition to status `'failed'`, reservations in `'processing'` older than `PROCESSING_RESERVATION_TTL_MS = 60000` (derived from `received_at`) are deterministically classified as abandoned crashes/timeouts.
  - Retry deliveries re-claim the lease and complete state mutation without creating duplicate mutations.
- **Sandbox QA Mutation Boundary:**
  - After canonical user correlation, state mutation in Sandbox is strictly gated to `BILLING_CHECKOUT_QA_USER_ID`. Non-QA users or missing QA config are safely ledgered (`sandbox_qa_boundary_rejected` / `missing_qa_user_config`) without mutating provider state.
- **Two-Stage Bootstrap Contract & Pre-Mutation Safety:**
  - `REQUIRED_FOR_BOOTSTRAP` (Stage A): `PAYPAL_ACCESS_ENVIRONMENT=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `BILLING_CHECKOUT_QA_USER_ID`. Missing any of these fails before schema mutation.
  - `REQUIRED_FOR_WEBHOOK_ACTIVATION` (Stage B): `PAYPAL_WEBHOOK_ID`. In Stage A, missing webhook ID is intentionally supported to allow initial function deployment; webhook ingress fails closed (HTTP 401) with zero state mutation until Stage B registration.
  - **Webhook-ID Anti-Downgrade Rule:** Once `PAYPAL_WEBHOOK_ID` has been configured for an existing deployed function, a later deployment with missing incoming `PAYPAL_SANDBOX_WEBHOOK_ID` preserves the existing runtime webhook ID; it is never cleared, replaced with empty string, or silently downgraded to bootstrap mode.

### 10. Future Authorized Deployment & Webhook Activation Sequence
*(None of these steps have occurred yet; all await explicit owner authorization after Phase 3 merge)*
1. Merge Phase 3 to `main`.
2. Owner provisions Sandbox deployment secrets in approved secret store: `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_CLIENT_SECRET`, `BILLING_CHECKOUT_QA_USER_ID` (Stage A).
3. Targeted workflow runs non-mutating bootstrap configuration preflight (`scripts/validate_paypal_bootstrap.cjs`).
4. Apply PayPal schema through approved targeted workflow (`scripts/setup_paypal_schema.cjs`).
5. Deploy ONLY `paypal-webhook` via targeted workflow (`--only=paypal-webhook`).
6. Run safe smoke check (`SAFE_SMOKE_CHECKS` succeeds on 400/401).
7. Read exact generated Appwrite Function HTTPS URL from Appwrite Console.
8. Register that URL as a Webhook in the PayPal Developer Dashboard (Sandbox).
9. Select approved event set (`BILLING.SUBSCRIPTION.*`, `PAYMENT.SALE.*`).
10. Receive actual PayPal Webhook ID from PayPal Developer Dashboard.
11. Store `PAYPAL_SANDBOX_WEBHOOK_ID` in approved secret store (Stage B).
12. Re-run targeted `paypal-webhook` deployment/configuration to provision `PAYPAL_WEBHOOK_ID`.
13. Send/receive real Sandbox webhook from PayPal Sandbox Simulator or live Sandbox checkout.
14. Verify cryptographic signature verification, ledger write, and provider-state write.
15. Only then classify Phase 3 as Appwrite/PayPal Sandbox runtime verified.

### 11. OWNER_ACTION_REQUIRED
The following actions must be performed explicitly by the owner before/during deployment:
- **Before Initial Bootstrap Deployment (Stage A):**
  - Provision `PAYPAL_SANDBOX_CLIENT_ID` in GitHub repository secrets.
  - Provision `PAYPAL_SANDBOX_CLIENT_SECRET` in GitHub repository secrets.
  - Provision `BILLING_CHECKOUT_QA_USER_ID` in approved GitHub repository secrets or variables.
- **After Initial Bootstrap Deployment (Stage B):**
  - Register the deployed Appwrite HTTPS endpoint URL in PayPal Sandbox Developer Dashboard.
  - Provision the resulting `PAYPAL_SANDBOX_WEBHOOK_ID` in GitHub repository secrets or variables.
*(Note: Never commit or expose actual secret values in repository files or commit messages).*

### 12. Operational Boundaries & Verification Status
- **Current Status:** `PAYPAL_PHASE3_FINAL_TESTED_LOCAL_READY_TO_COMMIT` (QA label: `TESTED_LOCAL`).
- **Pre-Mutation Safety Preflight:** Verified (`scripts/validate_paypal_bootstrap.cjs` fails closed on missing/empty/invalid/production environment).
- **Target Validation:** `node scripts/validate-hub-targets.cjs "paypal-webhook"` validated successfully (`PASS`).
- **Appwrite Schema:** Committed in `scripts/setup_paypal_schema.cjs`; **NOT APPLIED** to live Appwrite.
- **Appwrite Function:** Implemented and registered; **NOT DEPLOYED**.
- **PayPal Webhook Registration:** **NOT REGISTERED** in PayPal Sandbox or Live dashboard.
- **PayPal Webhook ID:** **NOT CREATED**.
- **Production PayPal:** **DISABLED**.
- **Billing Checkout:** **`BILLING_CHECKOUT_DISABLED`**.
- **External Runtime Boundaries:** Unverified against live Appwrite runtime, real PayPal webhook signature delivery, actual PayPal OAuth token requests from deployed function, and live database writes.
