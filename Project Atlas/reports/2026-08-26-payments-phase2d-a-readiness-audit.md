# WiseResume Payments Phase 2D-A — Production Readiness Inventory and Security Gate

**Date:** 2026-08-26
**Mode:** Audit / requirements / documentation only
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`
**Main at audit start:** `9d6cdfccb08cb72cbb59327a933aa7dd15c0001c`
**Verdict:** `PLAN_READY_NOT_PRODUCTION_READY`

## Scope and boundaries

This audit did not implement checkout, enable Production payments, change Paddle, RevenueCat, Appwrite, DNS, secrets, Vercel, or provider configuration, make a payment, repeat the Sandbox payment, grant an entitlement, deploy, commit, push, or merge. No credential-bearing RevenueCat app configuration endpoint was opened. The prior Paddle Sandbox credential exposure remains an unresolved warning because the owner declined rotation.

## 1. Current architecture

The current verified payment path is **Paddle Sandbox automatic checkout → RevenueCat Sandbox → RevenueCat webhook integration → Appwrite `revenuecat-webhook` Function → server-only provider-state and event-ledger collections → `coupons/get-subscription` effective-plan resolver → WiseResume UI and server-side AI enforcement**.

The webhook supports `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, and `PRODUCT_CHANGE`. It authenticates before parsing or mutating, validates the canonical Appwrite user, accepts only approved product/entitlement pairs, writes only `revenuecat_subscription_state` and `revenuecat_event_ledger`, and never writes provider lifecycle into legacy `subscriptions`.

The shared resolver combines Free, legacy manual/admin or coupon plan, active trial, and valid non-expired RevenueCat state. It ranks `free < pro < premium`; public Ultimate is normalized defensively to internal `premium`, and `ultimate` is not a valid persisted plan value. Manual/admin, coupon, and trial paths remain active parallel candidates and therefore need explicit Production policy.

## 2. Documentation drift fixed/planned

The audit found stale statements in living Atlas documents that still described the webhook custom domain as TLS-pending, the webhook as uncreated, the provider collections as empty, and the Appwrite source of Pro as unknown. Those statements were inconsistent with the later Phase 2C evidence.

This audit updates the relevant living documents only: `CURRENT_STATE.md`, `WHERE_WE_STOPPED.md`, `architecture/revenuecat-subscription-sync.md`, `architecture/integrations.md`, `architecture/data-model.md`, `deployment/current-deployment.md`, and this report. Historical reports remain unchanged. The updates are intentionally uncommitted and unpushed under the Phase 2D-A boundary.

## 3. Production provider inventory

| Area | Read-only result | Production classification |
|---|---|---|
| Paddle Sandbox | Existing automatic Pro transaction completed; current subscription evidence is retained from Phase 2C | Sandbox-only evidence; not Production evidence |
| Paddle Production | No credential-bearing or mutating inspection performed | `UNVERIFIED` |
| RevenueCat Sandbox app/config | Existing Sandbox app/config and webhook integration are known from safe prior evidence; no credential-bearing app view was reopened | Sandbox path verified; not Production evidence |
| RevenueCat Production app/config | No safe, non-credential-bearing evidence established in this audit | `UNVERIFIED` |
| RevenueCat entitlements | Safe project read confirms active `pro` and `premium` entitlements | Catalog contract present; Production association still `UNVERIFIED` |
| RevenueCat products | Safe project read shows multiple active app catalogs. The current Sandbox app has approved Pro and Ultimate/Premium monthly Paddle price IDs; other app IDs also contain products | Environment separation and Production mapping require explicit safe inventory; `UNVERIFIED` |
| RevenueCat offering/packages | Current Sandbox offering is active/current with monthly Pro and Ultimate/Premium packages attached to the Sandbox products | Sandbox catalog linkage confirmed; Production offering `UNVERIFIED` |
| RevenueCat webhook | Exactly one safe-listed integration targets `revenuecat-webhook.wiseresume.app`, environment `sandbox`, with no event filter, attached to the Sandbox app | Sandbox delivery configuration confirmed; Production webhook `UNVERIFIED` |
| Appwrite webhook transport | `revenuecat-webhook.wiseresume.app` returned expected unauthenticated HTTP 401; TLS certificate CN/SAN matched the hostname during the audit | Sandbox transport reachable; Production route `UNVERIFIED` |
| Appwrite Function inventory | Appwrite Console read-only inventory displayed `revenuecat-webhook` among 29 Functions; settings and variables were not opened | Function exists; Production source/variable parity `UNVERIFIED` |
| Appwrite state/ledger | Phase 2C read-only evidence shows one active Sandbox Pro state row and one processed `INITIAL_PURCHASE` ledger row for the QA fixture | Sandbox state verified; Production state `UNVERIFIED` |

No credential value was inspected or recorded. The safe RevenueCat product, entitlement, offering, package, webhook-integration, customer, event, and subscription reads did not reopen credential-bearing app configuration.

## 4. Plan and price contract

The preserved internal plan contract is:

| Public plan | Internal value | Current price/catalog contract |
|---|---|---|
| Free | `free` | `$0`; no provider entitlement |
| Pro | `pro` | Approved monthly Paddle price `pri_01m0fnjspex6yqqf6w9v9apaxg`; RevenueCat entitlement `pro` |
| Ultimate | `premium` | Approved monthly Paddle price `pri_01m0fnq9hetwdwm9e1sa49n08s`; RevenueCat entitlement `premium` |

The string `ultimate` is a public label only and must never be persisted in Appwrite provider state, legacy subscriptions, or internal plan fields. The current Sandbox catalog and repository mapping satisfy this contract for Pro and Ultimate/Premium; Production association is not verified.

## 5. Checkout design — requirements only

Checkout should start from authenticated Pricing or Subscription UI through a new server-owned Appwrite checkout/session boundary. The client should submit only an internal target plan such as `pro` or `premium`; the server should map it to an allowlisted environment-specific Production price and create an automatic-collection hosted checkout/session. The canonical Appwrite user ID must be attached through the provider-supported custom-data/metadata contract as `app_user_id`.

The server should return only a safe hosted-checkout URL or opaque session reference. Provider credentials remain server-side. A deterministic idempotency key and request correlation ID are required so refreshes, double clicks, retries, and multi-tab submissions cannot create ambiguous duplicate sessions. A successful browser return must not grant access; the webhook remains authoritative.

Success, cancel, pending, failure, missing-webhook, and already-entitled returns need explicit UI states. The app should refetch `get-subscription` and credits after return, show a pending/reconciliation state until provider state arrives, and provide a safe retry/support path. Paid users must not see an upgrade CTA for their current or lower plan. Free, Pro, and Ultimate states need separate copy, limits, disabled/loading/error behavior, and Arabic/English coverage. Cancellation should route to the provider’s supported customer-management path or a server-owned cancellation boundary; a toast alone is not proof of cancellation.

The current Pricing and Subscription pages do not perform any of these operations. They only route to auth or `/subscription`, and the Subscription upgrade buttons are disabled by `billingState.paymentsEnabled=false` with `paymentStatus=coming_soon`.

## 6. Lifecycle test strategy

| Scenario | Provider Sandbox event required? | Repository-controlled test sufficient for implementation? | Required future evidence |
|---|---|---|---|
| Pro activation | Yes for live integration | Yes for handler/validation | Paddle/RevenueCat Pro event, Appwrite ledger/state, effective Pro, UI/credits, persistence |
| Ultimate activation | Yes for live integration | Yes for normalization/mapping | RevenueCat `premium`, Appwrite internal `premium`, public Ultimate, unlimited limit, no persisted `ultimate` |
| Renewal / `will_renew` | Yes, or documented provider test clock | Yes for state patch | `RENEWAL` moves period/expiry and preserves active access with `will_renew=true` |
| Cancellation | Yes, or documented reversible provider control | Yes for status patch | `CANCELLATION` sets canceled/false renewal, access remains through verified expiry |
| Access until expiration | Yes after a cancellation/billing issue | Partially; resolver expiry tests are useful | Provider/Appwrite/UI remain accessible until verified expiry, then candidate ceases to win |
| Expiration | Yes, or documented provider test clock | Yes for prior-context handling | `EXPIRATION` sets expired/false renewal and Free/manual/coupon/trial precedence is verified after expiry |
| Billing issue | Yes, or documented reversible failure simulation | Yes for status patch | `BILLING_ISSUE` is ledgered, status is billing_issue, renewal intent false, expiry semantics verified |
| Duplicate event | Not necessarily | Yes | Same event ID returns already-recorded without a duplicate state row; a natural retry may supplement evidence |
| Stale/out-of-order event | Not necessarily | Yes | Older event is recorded as stale/ignored and cannot regress state; do not fabricate a live event |
| Free regression | No provider payment needed | Yes, plus approved Free fixture/browser test | No paid candidate, 5/day hard limit, Free gates/UI, no stale paid cache |

Phase 2C focused webhook/schema tests passed 12/12 for TEST no-mutation, lifecycle transitions, Ultimate normalization, duplicate idempotency, stale-event handling, resolver precedence, and schema contracts. These tests are not substitutes for live Production or live provider-transition evidence.

The remaining live transitions are `UNVERIFIED` because the current boundaries prohibit another payment, entitlement grant, fabricated event, or provider mutation. The existing Pro fixture must not be downgraded or repurchased to obtain them.

## 7. Legacy-plan policy decisions required

The current resolver intentionally allows a valid higher-ranked candidate to win across sources. Before Production activation, the owner must approve the following policy decisions without changing behavior in this audit:

1. A valid RevenueCat provider candidate should remain additive and should not overwrite legacy manual/admin or coupon/trial data.
2. A provider cancellation, billing issue, or expiration should remove only the provider candidate at the appropriate time; manual, coupon, or active trial access may survive by current resolver design.
3. Admin `set-plan`, trial grant, and trial revoke actions must remain auditable and must not silently erase an active stronger provider entitlement.
4. Refunds, chargebacks, disputes, grace periods, pending payments, and support overrides need explicit mapping to Appwrite state and effective-plan policy.
5. All operator actions and provider events need a support-safe reconciliation path, with no browser writes to provider state.

These are policy gates, not implementation approvals.

## 8. Security risks

| Risk | Classification | Required treatment |
|---|---|---|
| Prior Paddle Sandbox API-key exposure | `OWNER_ACCEPTED_UNRESOLVED_RISK` | Owner declined rotation. Keep warning visible; do not reopen credential-bearing views; do not treat as Production-cleared. |
| Production/Sandbox cross-wiring | `UNVERIFIED` | Separate app/config inventories, explicit environment assertions, and allowlisted price IDs. |
| Checkout success without webhook | `UNVERIFIED` | Webhook-authoritative access, pending/reconciliation state, and no client-side grants. |
| Duplicate/reordered delivery | `IMPLEMENTATION_TESTED / LIVE_UNVERIFIED` | Durable ledger, unique indexes, stale ordering, and safe natural retry evidence. |
| Manual/trial/coupon coexistence | `IMPLEMENTED / POLICY_REVIEW_REQUIRED` | Approve precedence, expiry, refund, and support policy before activation. |
| Documentation inconsistency | `RECONCILED_IN_THIS_AUDIT` | Living statements were updated; historical reports remain historical. |

## 9. Required code, schema, provider, and configuration changes

No changes were made. Future work will require, at minimum:

* A server-side Appwrite checkout/session function or equivalent server boundary with authenticated identity, environment-specific price allowlists, automatic collection, `app_user_id` metadata, idempotency, correlation, and safe return data.
* Frontend Pricing/Subscription integration with feature-flagged, fail-closed activation and explicit loading, pending, success, cancel, failure, and reconciliation states.
* Production RevenueCat app/configuration, Pro/Premium product association, entitlements, offering/packages, webhook integration, event scope, and secret parity verification without value disclosure.
* Production Paddle products/prices, automatic checkout, cancellation/customer portal, refund/tax/invoice policy, and environment separation.
* Read-only verification of Appwrite server-only collections, unique indexes, webhook source parity, required variable names, and a Production TEST returning 200 with `test_acknowledged` and `mutated=false`.
* Cross-plan tests for Free, Pro, and Premium, plus resolver policy tests for manual/admin, coupon, trial, cancellation, expiration, refunds, and support overrides.
* Monitoring, alerting, reconciliation, rollback/disable controls, legal copy, support runbooks, and a documented incident process.

## 10. Production activation checklist

Production activation is blocked until all of the following have evidence:

1. Security review and the credential-exposure decision are complete; no secrets appear in source, logs, reports, captures, or chat.
2. Production Paddle environment, products, prices, automatic collection, cancellation, refunds, invoices, tax behavior, and return states are verified.
3. Production RevenueCat app/configuration, products, entitlements, offering/packages, and environment separation are verified through safe non-credential-bearing reads.
4. Exactly one intended Production webhook exists, with no duplicate competing destination.
5. Production Appwrite route is strict-TLS valid; Function source parity and required variable presence are verified; secret parity is verified without value disclosure.
6. A safe Production TEST returns HTTP 200 with `test_acknowledged`, `mutated=false`, and no provider-state or ledger mutation.
7. Appwrite collections remain server-only with the intended unique indexes and the legacy collection remains policy-compatible.
8. Live Sandbox matrix is complete or formally accepted for Pro, Ultimate, renewal, cancellation, access until expiry, expiration, billing issue, duplicate, stale ordering, and Free regression.
9. Server-side checkout is implemented, reviewed, idempotent, and tested for success, pending, failure, duplicate, cancellation, and missing-webhook paths.
10. Frontend payment activation is behind a fail-closed server-backed flag, and paid users do not see invalid upgrade prompts.
11. Plan IDs, price IDs, entitlements, credits, resolver precedence, and persisted values are tested across Free, Pro, and Ultimate/premium.
12. Monitoring, support/refund operations, legal disclosures, rollback, and final owner authorization are complete.
13. Atlas living docs are consistent and record the exact release decision.

## 11. Ordered implementation phases

| Phase | Scope | Exit gate |
|---|---|---|
| 2D-A | Production readiness inventory, security gate, documentation reconciliation | This audit is complete as `PLAN_READY_NOT_PRODUCTION_READY`; risk and drift are explicitly recorded. |
| 2D-B | Owner-approved safe fixtures and lifecycle transition evidence | Required live Sandbox transitions are evidenced or explicitly accepted; no prohibited mutation is used. |
| 2D-C | Server-side checkout/session implementation | Idempotent, allowlisted, provider-secret-safe hosted checkout exists with webhook-authoritative activation. |
| 2D-D | Frontend payment activation behind a fail-closed flag | Pricing/Subscription invoke the server path and handle all terminal/pending states. |
| 2D-E | Production release gate and controlled canary | Provider, legal, operational, security, monitoring, rollback, and owner approvals are complete. |

## 12. Can Phase 2D-B implementation begin?

**No, not under this prompt.** A separately authorized requirements/design task may begin. Actual implementation should wait until the owner approves the scope and the Phase 2D-A security and Production inventory gate is accepted. Production activation remains explicitly blocked.

## 13. Exact next action

Keep `main` unchanged and retain `PLAN_READY_NOT_PRODUCTION_READY`. The next task should be a separately authorized **Phase 2D-B safe-fixture and lifecycle-evidence plan**, beginning with owner approval of the test-fixture strategy and legacy-plan policy. Do not repeat payment, grant an entitlement, mutate providers, change secrets, deploy, or enable checkout.

## References

[1]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/appwrite-hubs/revenuecat-webhook/src/main.js "WiseResume RevenueCat webhook implementation"
[2]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/appwrite-hubs/shared-subscription-resolver/index.js "WiseResume shared subscription resolver"
[3]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/appwrite-hubs/coupons/src/main.js "WiseResume subscription resolver function"
[4]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/appwrite-hubs/ai-gateway/src/main.js "WiseResume server-side AI plan enforcement"
[5]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/src/lib/billing.ts "WiseResume billing feature gate"
[6]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/src/pages/SubscriptionPage.tsx "WiseResume Subscription page"
[7]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/src/pages/PricingPage.tsx "WiseResume Pricing page"
[8]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/Project%20Atlas/CURRENT_STATE.md "WiseResume current production state"
[9]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/Project%20Atlas/architecture/revenuecat-subscription-sync.md "WiseResume RevenueCat architecture"
[10]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/Project%20Atlas/deployment/current-deployment.md "WiseResume current deployment specification"
[11]: https://github.com/iammagdy/WiseResume-TWC/blob/9d6cdfccb08cb72cbb59327a933aa7dd15c0001c/appwrite-hubs/admin-devkit-data/src/main.js "WiseResume admin/manual plan and trial paths"
