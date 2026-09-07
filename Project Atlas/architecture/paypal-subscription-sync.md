# WiseResume PayPal Subscription Synchronization & Entitlement Resolution

**Last Verified:** 2026-09-07
**Status:** `PAYPAL_REFUND_REVERSAL_PREDEPLOY_READY` (Frontend: `DEPLOYED_TO_PRODUCTION` via Vercel, Backend: `PENDING_TARGETED_DEPLOYMENT`, Schema: `UNVERIFIED / PENDING_PROVISIONING`, `PAYPAL_PRODUCTION_READY = NO`, Main Baseline: `84aa793d1cea97a9233caf3b388a4dc3f1fdf61c`) — Option B refund and reversal implementation and provider-contract hardening merged into main: (1) Full refund immediately revokes entitlement (`expires_at = null`), preserves payment identity, sets `renewal_cancellation_pending = true`, and initiates server-side provider cancellation; (2) Partial refund preserves entitlement and renewals without local arithmetic (`partial_refund_recorded`); (3) Historical refunds/reversals leave active state untouched (`historical_refund_ignored` / `historical_reversal_ignored`), using authoritative state/ledger sale payment timestamps rather than provider `tx.time` or webhook arrival time; (4) Reversal immediately revokes entitlement while preserving truthful provider status; reversal payment identity uses `resource.id` as the affected sale transaction `paymentId` (`resource.parent_payment` captured as non-entitlement parent reference metadata); (5) `PAYMENT.SALE.COMPLETED` blocks entitlement restoration while cancellation is pending; (6) Fail-closed tombstone lookup prevents stale sale reactivation; verified reversal tombstone takes strict precedence over refund (`reversal > refund`) dropping activation (`sale_already_refunded`) without calling Transactions API; verified refund tombstone with unconverged `COMPLETED` Transactions API status fails closed as retryable 503 (`provider_state_not_converged`); `PARTIALLY_REFUNDED` allows normal sale activation; missing schema attributes/indices during tombstone lookup fail closed as retryable 503 (`tombstone_lookup_failed`); conflicting tombstone identity fails closed (`ambiguous_payment_ledger_correlation`); (7) Direct refund convergence: `COMPLETED` and `PENDING` fail closed as retryable 503 (`provider_state_not_converged`); unknown/unexpected provider statuses fail closed as retryable 502 (`unsupported_provider_transaction_status`, zero entitlement mutation, not permanently 2xx-ignored); (8) True legacy migration-on-touch: when existing state documents lack payment identity and old ledger lacks `payment_id`, the canonical subscription snapshot (`GET /v1/billing/subscriptions/{id}`) provides authoritative `start_time` to query the Transactions API (`start_time` to `nowMs`), populating payment identity without bulk backfill; (9) HATEOAS Transactions API pagination with fail-closed behavior; (10) Frontend suppresses active free copy during pending cancellation. Environment isolation is enforced by the hard Sandbox runtime gate. Backend (134/134), frontend (30/30), and all hubs (362/362) tests passing. Frontend deployed to production via Vercel; Appwrite schema index readiness hardened (`waitForIndexAvailable`); live schema state unverified; hubs pending targeted deployment (paypal-webhook then coupons); NOT runtime verified in PayPal Sandbox; Production PayPal untouched.
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

The repository includes the idempotent provisioner script `scripts/setup_paypal_schema.cjs`. It guarantees both attributes and indexes are polled until status === 'available' (via `waitForAttributeAvailable` and `waitForIndexAvailable`) before returning. It defines two server-only collections (`permissions = []`, `documentSecurity = false`):

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
- `last_entitlement_payment_id`: string(64), optional — **Index (`last_payment_idx` ASC)**
- `last_entitlement_payment_timestamp_ms`: integer, optional
- `renewal_cancellation_pending`: boolean, default `false`
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
- `payment_id`: string(64), optional — **Index (`payment_idx`)**
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
- **Natural Expiration & Exact-at-$G$ Boundary:** Once `G` passes, or at the exact millisecond `nowMs === Date.parse(G)`, `isFutureTimestamp(expires_at, nowMs)` evaluates to `false` (strictly enforcing `parsed > nowMs`), and the resolver candidate is rejected, cleanly dropping to `free` when no other entitlement exists.
- **Multi-Provider Fallback:** If a PayPal subscription grace candidate is expired (`status: billing_issue`, `expires_at: expiredG`), the candidate is discarded and the authoritative resolver naturally falls back to an active secondary entitlement (such as an active RevenueCat Pro or Manual/Admin Pro grant) rather than forcing `free`.
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
- **Current Status:** `PAYPAL_FAILED_RENEWAL_LOCAL_CONTRACT_FULLY_TESTED` (`PAYPAL_PRODUCTION_READY = NO`).
- **Local Contract Verification Baseline:**
  - Hardened and merged via PR #299 (`84a5f005`) in `tests/hubs/paypal-subscription-resolver.test.cjs` (+60 lines, -0 lines).
  - Case 20 proves exact-at-$G$ evaluation drops to `free` when no other entitlement exists.
  - Case 21 proves expired PayPal grace does not force Free when an active secondary entitlement (RevenueCat Pro or Manual/Admin Pro) exists.
  - All local hub test suites pass (21/21 resolver, 76/76 webhook, 21/21 coupons, 299/299 hubs).
- **Provider Capability Proof & Runtime Reality:**
  - Audit of official PayPal Developer documentation confirms `ON_DEMAND_RENEWAL_TRIGGER = NO_DOCUMENTED_METHOD`, `CLOCK_ACCELERATION = NO_DOCUMENTED_METHOD`, and `DETERMINISTIC_RENEWAL_DECLINE = NO_DOCUMENTED_METHOD` (PayPal official documentation exposes no documented method to deterministically force a scheduled recurring renewal decline in Sandbox; PayPal-Mock-Response / documented negative-testing mechanisms do not constitute a genuine provider-generated recurring renewal lifecycle proof).
  - Authentic natural-expiry verification requires waiting for PayPal's real scheduled billing lifecycle to emit a genuine `BILLING.SUBSCRIPTION.PAYMENT.FAILED` event, then waiting until the WiseResume grace boundary $G = \text{eventTimestamp} + 48\text{ hours}$. The provider-side time from subscription creation to the genuine failure event is not deterministic for this QA plan.
  - Webhook Simulator cannot be used for runtime verification: PayPal Webhook Simulator events are synthetic, are not associated with a real transaction/resource, and cannot be verified through `POST /v1/notifications/verify-webhook-signature`; therefore they are not accepted as WiseResume runtime lifecycle proof.
  - Evidence Boundary Distinction:
    - Local / Test Verified: Initial failure zero grace; renewal failure exact 172,800,000ms (48h) grace calculation; repeated failure no grace extension; terminal events (`SUSPENDED`, `CANCELLED`, `EXPIRED`) preserve $G$; recovery transition on payment; before-$G$ paid access; exactly-at-$G$ expired to free; after-$G$ expired to free; secondary valid entitlement fallback (RevenueCat Pro or Manual/Admin Pro).
    - Not Provider-Runtime Verified (`FAILED_RENEWAL_FULL_SANDBOX_RUNTIME_VERIFIED = NO`): Genuine recurring `PAYMENT.FAILED` lifecycle; first automatic failed-renewal webhook; natural real-time 48h expiry after genuine failure; provider recovery after genuine renewal failure.
- **Targeted Hub Deployments:** Deployed on `main` commit `291c5c69`: `paypal-webhook` (run `34028770031`) and `billing-checkout` (run `34029085832`). For PR #299, zero deployments were performed or required.
- **Appwrite Schema:** Server-only collections `paypal_subscription_state` and `paypal_event_ledger` provisioned and verified in live Appwrite cluster.
- **US Sandbox Cancellation Paid-Through E2E:** Verified. Designated Sandbox QA user canceled verified Ultimate Sandbox subscription on live `https://wiseresume.app/subscription`. Direct PayPal REST API verified `CANCELLED`.
- **Authoritative Paid Expiry Invariant:** `status = canceled`, `will_renew = false`, `expires_at` is preserved (not null), effective plan remains `premium` with unlimited AI quota retained until end of prepaid cycle; server-side AI entitlement follows unchanged resolver contract (no post-cancellation AI execution run).
- **Webhook Delivery & Signature Verification:**
  - `BILLING.SUBSCRIPTION.CANCELLED` arrived on authentic first automatic provider delivery without manual resend and processed cleanly.
  - Real provider-generated activation and payment events were successfully processed after provider re-delivery during runtime recovery.
  - Webhook signature verification contract: `POST /v1/notifications/verify-webhook-signature` returned `SUCCESS` (PayPal POSTBACK verification).
- **Checkout Fail-Closed Gate:** Restored fail-closed (`BILLING_CHECKOUT_ENABLED=false`, `BILLING_CHECKOUT_PROVIDER_READY=false`). Verified HTTP 403 `payments_disabled` on `/create-session`.
- **Retained Pre-Existing Gaps:** `BILLING_CHECKOUT_DEVKIT_SOURCE_HASH_NOT_TRACKED_PRE_EXISTING` retained as pre-existing gap; not claimed as fixed.
- **Live Webhook Endpoint:** `UNVERIFIED_FOR_LIVE` (preserving approved custom domain `https://paypal-webhook.wiseresume.app` architecture; direct Appwrite execution endpoint is not the canonical public endpoint).
- **Production Blockers:** Refund / reversal lifecycle and Live PayPal rollout remain unverified. Provider-runtime failed renewal remains not verified. Production PayPal remains strictly disabled (`PAYPAL_PRODUCTION_READY = NO`).
- **What's New Decision:** `WHATS_NEW_NOT_REQUIRED` (test-only change).
- **Next Workstream:** `PAYPAL_REFUND_REVERSAL_POLICY`.

### 13. Phase 4 Architecture: Checkout, Subscription UX, Cancellation & Entitlement Surfacing

Phase 4 completes the end-to-end checkout and customer-facing subscription lifecycle:

1. **Coupons Hub Subscription Lifecycle Contract (`getMySubscription`):**
   - Resolves authoritative subscription plan via `@wiseresume/subscription-resolver`.
   - Surfaces `can_subscribe` (boolean, false when provider disabled or unconfigured).
   - Surfaces `can_cancel_subscription` (boolean, true strictly when status is `active` or `billing_issue` and `will_renew === true`).
   - Surfaces `provider_expires_at`, `provider_source`, `provider_status`, `expires_at`, and `will_renew`.

2. **Billing-Checkout Hub Provider Abstraction (`PayPalSubscriptionProvider`):**
   - **OAuth Token Acquisition & Caching:** Requests client-credentials token from `/v1/oauth2/token` and caches in-memory with a 60-second safety margin before `expires_in`.
   - **Idempotent Subscription Creation:** Sends `PayPal-Request-Id: wr_sub_<sha256(userId:plan:sessionKey)>` to PayPal `POST /v1/billing/subscriptions` to guarantee exactly-once subscription creation per checkout attempt.
   - **Approved Origin Validation:** Validates PayPal approval URL against `PAYPAL_APPROVED_ORIGINS` (`https://www.sandbox.paypal.com`, `https://www.paypal.com`).
   - **Session Error Isolation:** Distinguishes deterministic provider rejections (marked `failed`) from transient/ambiguous network and 5xx errors (marked `uncertain` via `markUncertain`), protecting session audit trails.
   - **Subscription Cancellation Action:** Routed under `action === 'cancel-subscription'`. Verifies caller ownership via `paypal_subscription_state`. Calls PayPal `POST /v1/billing/subscriptions/{id}/cancel` with HTTP 204 success handling. If PayPal returns HTTP 400/422, verifies whether subscription is already cancelled via `GET /v1/billing/subscriptions/{id}` before failing.
   - **Fail-Closed Provider Selection:** When `BILLING_CHECKOUT_PROVIDER === 'paddle'`, returns HTTP 403 `provider_unsupported`.

3. **Frontend Billing Libs & Security Defense-in-Depth:**
   - `src/lib/billing.ts`: Customer-facing copy cleaned up; retired provider references removed; `isSandboxTestMode() => false`.
   - `src/lib/billingCheckout.ts`: Added `cancelBillingSubscription`. Defense-in-depth redirect validation checks `APPROVED_PAYPAL_ORIGINS` before navigating.

4. **UI Workspaces (`PricingPage.tsx`, `SubscriptionPage.tsx`):**
   - Pricing page: Removed sandbox test-mode warning banner; updated FAQ #3 with self-serve cancellation copy.
   - Subscription page: Redesigned premium workspace. Enforced strict "Subscribe" CTA button. Disabled CTA with "Subscription enrollments are currently closed." when `can_subscribe === false`.
    - Preparation state ("Preparing your subscription…") prevents double clicks.
    - Return detection (`?billing=success`, `?billing=pending`, `?billing=canceled`). Immediate status check followed by 5-second polling interval (up to 90s timeout).
    - Subscription Management card with cancellation trigger, accessible confirmation dialog, and formatted `provider_expires_at` retention notices.

### 14. Option B Refund and Reversal Policy (Merged, Pending Deployment)

**Status:** `MERGED_NOT_DEPLOYED` / `TESTED_LOCAL` (`PAYPAL_PRODUCTION_READY = NO`, Merged PR: #301, Merge SHA: `69b31c0d4c762f8650435390ce92ba2e030e19b4`).
The Option B refund and reversal policy is owner-locked and approved:

1. **Full Refund of Current Entitlement-Bearing Payment:**
   - **Immediate Entitlement Revocation:** `expires_at = null` and `grace_period_expires_at = null`. Entitlement ends immediately upon confirmed full refund.
   - **Identity Retention:** Preserves `last_entitlement_payment_id` and `last_entitlement_payment_timestamp_ms` on `paypal_subscription_state` for audit and correlation.
   - **Future Renewal Cancellation:** Flags `renewal_cancellation_pending = true` and initiates server-side cancellation of future automatic PayPal renewals via `POST /v1/billing/subscriptions/{id}/cancel`.
   - **Truthful Provider State:** While cancellation is pending, provider status is kept truthful (e.g. `active`, `will_renew = true`); no provider status is fabricated.
   - **Convergence:** On confirmed provider cancellation (HTTP 204 or verified via `GET /v1/billing/subscriptions/{id}`), state converges to `status = 'canceled'`, `will_renew = false`, `renewal_cancellation_pending = false`, `expires_at = null`, and ledger outcome `refund_and_cancellation_settled`. Subsequent incoming `BILLING.SUBSCRIPTION.CANCELLED` webhooks remain idempotent and do not restore entitlement.
   - **Transient Cancellation Failure:** On transient cancel errors (5xx, 429, timeout, network failure), state remains `expires_at = null`, `renewal_cancellation_pending = true`, ledger records `provider_cancellation_pending_retry`, and webhook handler returns a retryable 5xx. Entitlement is never restored.
   - **Redelivery / Ambiguous Cancel Result:** On refund redelivery while `renewal_cancellation_pending === true`, the webhook first queries `GET /v1/billing/subscriptions/{id}`. If already cancelled at provider, settles locally; otherwise retries provider cancellation.

2. **Partial Refund Policy:**
   - **Preserves Entitlement and Renewal:** Current paid access (`expires_at`, `grace_period_expires_at`) and future renewal (`will_renew`) remain completely untouched.
   - **Audit Record:** Recorded in `paypal_event_ledger` only with `outcome_code = 'partial_refund_recorded'`.
   - **Authoritative Provider Transaction Status:** The handler relies strictly on PayPal's authoritative transaction status (`PARTIALLY_REFUNDED` preserves entitlement, while `REFUNDED` triggers the full refund policy). No local arithmetic or cumulative summation is performed over ledger balances; if provider status is not converged or unsupported, it fails closed.

3. **Historical Refund and Reversal Policy:**
   - When a refund or reversal event arrives for a `payment_id` that is not the subscription's `last_entitlement_payment_id`:
     - **Authoritative payment timestamps:** Historical payment ordering uses either `paypal_subscription_state.last_entitlement_payment_timestamp_ms` or `paypal_event_ledger.event_timestamp_ms` from the correlated `PAYMENT.SALE.COMPLETED` ledger event. Provider transaction string timestamps (`tx.time`) are NEVER used for the ordering comparison (preventing malformed date strings from producing `NaN` and misclassifying historical refunds as current).
     - If the correlated payment is older than current entitlement: active provider state is left untouched (zero downgrade, zero cancellation), and the ledger records `outcome_code = 'historical_refund_ignored'` or `'historical_reversal_ignored'`. Unresolved historical correlation fails closed (`unresolved_historical_payment_timestamp` or `unresolved_historical_reversal_correlation`) with zero state mutation.

4. **Payment Reversal Policy:**
   - **Immediate Entitlement Revocation:** `expires_at = null` and `grace_period_expires_at = null` for the current payment.
   - **Truthful Provider Status:** Provider status remains truthful (`active` if provider has not suspended/cancelled; no fabrication of `suspended` or `expired`).
   - **Identity Retention:** `last_entitlement_payment_id` is preserved. Future renewals are not cancelled automatically by PayPal reversal unless provider cancels or full refund occurs.
   - **Sale Reversal Identifier Contract:** `PAYMENT.SALE.REVERSED` extracts `paymentId` from `resource.id` (the affected sale transaction ID). The `resource.parent_payment` field (e.g. `PAYID-...`) is stored as separate non-entitlement parent reference metadata and is never treated as the primary sale payment ID.
   - **Historical Reversals:** Authoritative payment identity and timestamp are queried from the ledger `PAYMENT.SALE.COMPLETED` event by `payment_id` (not reversal webhook arrival time). If the correlated sale is older than the current entitlement payment (`last_entitlement_payment_timestamp_ms`), the delayed reversal is ignored (`historical_reversal_ignored`) with zero state mutation. Unresolved historical correlation fails closed (`unresolved_historical_reversal_correlation`) with zero state mutation.

5. **Cancellation-Pending Guard on New Sales:**
   - If `PAYMENT.SALE.COMPLETED` arrives while `renewal_cancellation_pending === true`, paid entitlement is strictly blocked (`expires_at` is NOT updated).
   - Ledger records `outcome_code = 'unexpected_payment_during_cancellation_pending'`.
   - Flags operational alert: `UNEXPECTED_PAYMENT_DURING_REFUND_CLOSURE = OWNER/OPERATIONS_REVIEW_REQUIRED`.

6. **Tombstone Lookup and Precedence on `PAYMENT.SALE.COMPLETED`:**
   - Before granting entitlement, `PAYMENT.SALE.COMPLETED` checks the event ledger for refund or reversal tombstones for the sale's `payment_id`. Tombstone lookup fails closed: missing schema attributes/indices or database/infrastructure failures fail closed as retryable HTTP 503 (`tombstone_lookup_failed`) with zero entitlement granted. Conflicting tombstone subscription/user identity fails closed with rejection (`ambiguous_payment_ledger_correlation`).
   - **Reversal Precedence (`reversal > refund`):** If a verified `PAYMENT.SALE.REVERSED` tombstone exists in the ledger, it is authoritative reversal evidence on its own and takes strict precedence over any refund tombstone; sale activation is dropped immediately (`sale_already_refunded`) without calling the Transactions API.
   - **Refund Tombstone Eventual Consistency:** If a verified `PAYMENT.SALE.REFUNDED` tombstone exists (and no reversal tombstone), it verifies authoritative provider status via the Transactions API:
     - Status `REFUNDED`: drops sale activation immediately (`sale_already_refunded`).
     - Status `PARTIALLY_REFUNDED`: preserves entitlement and renewals, allowing normal sale activation to proceed.
     - Status `COMPLETED`: represents provider eventual consistency lag (Transactions API has not converged yet); fails closed as retryable HTTP 503 (`provider_state_not_converged`) with zero entitlement activation granted.
     - Status unsupported/unknown (`PENDING`, `FAILED`, etc.): fails closed as retryable HTTP 502 (`unsupported_provider_transaction_status`). Normal sales without tombstones proceed without calling the Transactions API.

7. **Transactions API Pagination Contract:**
   - Calls `GET /v1/billing/subscriptions/{id}/transactions` strictly with required query parameters `start_time` and `end_time`.
   - Follows provider HATEOAS `rel="next"` pagination links.
   - Validates HTTPS protocol and `/v1/billing/subscriptions/` path prefix before following any next URL.
   - Enforces safety limit `MAX_TRANSACTION_PAGE_FOLLOWS = 5` (bounding lookups to a maximum of 5 pages examined).
   - Fail-closed behavior: returns empty/null on error without crashing or hanging.

8. **Legacy Migration-on-Touch:**
   - Pre-PR#301 ledger documents did not have `payment_id`. Legacy states with `last_entitlement_payment_id = null` must not fail with `unresolved_historical_payment_timestamp` when receiving refunds.
   - When the canonical subscription ID is known, the handler fetches authoritative subscription details (`GET /v1/billing/subscriptions/{id}`) to extract the provider's `start_time`. It queries the Transactions API (`GET /v1/billing/subscriptions/{id}/transactions`) with an explicit query range (`startTimeMs = provider start_time`, `endTimeMs = nowMs`), matches the exact `transaction.id === refund resource.sale_id`, validates that provider `tx.time` parses to a positive safe integer, and populates `last_entitlement_payment_id` and `last_entitlement_payment_timestamp_ms` from authoritative provider data.
   - If the canonical subscription ID is absent, provider `start_time` is missing/invalid, or `tx.time` is malformed, it fails closed with zero state mutation (`unresolved_legacy_payment_correlation` or retryable 502 `invalid_provider_transaction_time`). No bulk backfill is required.

9. **Frontend Surface Contract:**
   - `useMe.ts` surfaces `renewal_cancellation_pending?: boolean` from `getMySubscription`.
   - `SubscriptionPage.tsx` checks `effectivePlan === 'free'` and `(canCancelSubscription || renewalCancellationPending)`. When true, suppresses misleading "You have an active Free subscription" and renders neutral notification: *"Your paid access has ended. Your subscription cancellation is still being confirmed."*

10. **Multi-Provider Resolver Unchanged:**
    - `@wiseresume/subscription-resolver` requires zero changes. Entitlement revocation is achieved through authoritative `expires_at = null` in provider state, allowing natural fallback to Free (or secondary valid entitlement).
