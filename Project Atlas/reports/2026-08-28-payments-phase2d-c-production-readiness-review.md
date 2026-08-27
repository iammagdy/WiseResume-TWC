# WiseResume Payments Phase 2D-C — Production Readiness Review

**Date:** 2026-08-28
**Mode:** Audit / plan only
**Repository:** `iammagdy/WiseResume-TWC`
**Audited main:** `c54afd9a1beba93734786549c42a7bea5a69662b`
**Production:** `https://wiseresume.app`
**Verdict:** `PLAN_READY_NOT_PRODUCTION_READY`

## Executive verdict

WiseResume has a credible, verified **Sandbox** subscription path, including Paddle automatic checkout, RevenueCat `pro`/`premium` mapping, Appwrite provider-state and event-ledger synchronization, effective-plan resolution, UI credits, persistence, and the live-domain `_ptxn` bridge. The current implementation is intentionally not a Production billing implementation: `paymentsEnabled=false`, the public purchase CTAs remain inactive, the client helper is limited to one historical QA transaction, and the live provider configuration for Production is not verified.

**Production implementation can begin only as a separately reviewed, fail-closed server-side checkout/session project. Production activation cannot begin yet.** The unresolved Paddle Sandbox API-key exposure is a security warning, not a Production approval. Production must remain disabled until the provider, webhook, secret, lifecycle, policy, UX, monitoring, rollback, and owner-authorization gates below have independent evidence.

> **Hard rule:** A successful browser checkout or Paddle return is not an entitlement grant. Paddle and RevenueCat events must reach the authenticated Appwrite webhook, pass identity and catalog validation, enter the durable ledger, update provider state, and then be consumed by the existing effective-plan resolver.

## Current evidence and boundaries

| Area | Current evidence | Classification |
|---|---|---|
| Pro Sandbox | End-to-end Paddle → RevenueCat → Appwrite → WiseResume path verified with active `pro`, `will_renew`, `50/day`, and persistence | `VERIFIED_WITH_WARNINGS` |
| Ultimate Sandbox | End-to-end path verified with public Ultimate → internal `premium`, active Sandbox state, and unlimited UI limits | `VERIFIED_WITH_WARNINGS` |
| Live `_ptxn` bridge | PR #220 merged normally at `770591bfcdbcab34ad6914babadcf381554dba7`; live route opens the existing allowlisted Sandbox transaction and preserves session on return | `SANDBOX_ONLY_VERIFIED` |
| Frontend billing gate | `paymentStatus=coming_soon`, `paymentsEnabled=false`, no active purchase CTA | `SAFE_CURRENT_BOUNDARY` [8] |
| Current checkout helper | Official Paddle.js, Sandbox mode, `test_` token check, live-host flag, exact Paddle CSP, and one QA transaction allowlist | `PROVISIONAL; NOT PRODUCTION DESIGN` [9] |
| RevenueCat entitlements | Project-level `pro` and `premium` contracts are present and Sandbox mapping is verified | `PRODUCTION_ASSOCIATION_UNVERIFIED` |
| Paddle Production | Production account, products, prices, tax, checkout, domain approval, notification destination, and payment policy are not safely verified in this audit | `UNVERIFIED` |
| RevenueCat Production | Production app/config, product import, offering/packages, webhook destination, and event scope are not verified | `UNVERIFIED` |
| Appwrite Production webhook | Sandbox route and deployed handler are known; Production secret parity and Production TEST are not verified here | `UNVERIFIED` |
| Legacy/manual/coupon/trial policy | Resolver is implemented and tested, but Production business policy for coexistence, refunds, chargebacks, and support overrides is not approved | `POLICY_REVIEW_REQUIRED` |
| Security warning | Prior Paddle Sandbox API-key exposure remains `OWNER_ACCEPTED_UNRESOLVED_RISK` because rotation was declined | `BLOCKER_FOR_PRODUCTION_CLEARANCE` |

No provider, secret, DNS, Appwrite, Paddle, RevenueCat, deployment, payment, or code mutation was performed for this review. The only repository change from this audit is this local report; it remains uncommitted and unpushed.

## 1. Production Paddle requirements

Paddle Sandbox and Live are separate workspaces with separate client-side tokens and data. A Live integration requires a Live client-side token, while Sandbox tokens begin with `test_` and Live tokens begin with `live_`; API keys must never enter browser code. Paddle’s current documentation also states that client-side tokens are limited to checkout and preview operations and are safe to expose, whereas API keys belong only on the server.[3]

Paddle Production must have an approved WiseResume checkout domain, an explicit default payment link or an approved checkout URL strategy, the approved Pro and Ultimate/Premium catalog prices, automatic collection, tax and invoice settings, customer and payment-method behavior, refund policy, and a documented customer-portal/cancellation path. Paddle requires a default payment link to start selling and uses it for transaction checkout links and payment-method update links.[5] Production website approval is a provider gate; Sandbox approval does not substitute for it.[1]

The Production catalog contract must remain:

| Public label | Internal plan | Paddle price | RevenueCat entitlement |
|---|---|---|---|
| Free | `free` | None | None |
| Pro | `pro` | Existing approved Pro price, after a separate Production mapping is verified | `pro` |
| Ultimate | `premium` | Existing approved Ultimate/Premium price, after a separate Production mapping is verified | `premium` |

The public word **Ultimate** must never become the persisted internal value `ultimate`. Production price identifiers must be allowlisted by environment and must not be inferred from browser input or a public plan label.

## 2. Production RevenueCat requirements

RevenueCat’s documented Paddle flow requires a Paddle config in the same RevenueCat project, automatic purchase tracking, imported Paddle products, project entitlements, an offering with packages, and a safe association between the purchase and the App User ID.[1] The Production config must be distinct from Sandbox, must be connected to the Production Paddle account, and must be verified without reopening credential-bearing views.

The Production catalog must contain exactly the intended Pro and Ultimate/Premium product mappings. Each product must attach to the existing project-level entitlement rather than creating duplicate `pro` or `premium` entitlements. The active offering and packages must reference the Production products, and the customer-facing price labels, billing interval, tax display, and currency must be checked in a real Production-preview-safe path before activation.

The App User ID association must be deterministic. RevenueCat documents reading an App User ID from Paddle custom data/metadata for server notifications; if metadata is absent, the purchase may be associated anonymously.[2] The future checkout/session boundary must therefore write the canonical Appwrite user ID as `app_user_id` in provider-supported custom data, and the integration must reject or quarantine purchases that do not resolve to a known canonical Appwrite user.

RevenueCat’s Paddle documentation also states that Paddle is the billing engine and merchant of record, while RevenueCat handles entitlement synchronization and does not replace Paddle’s product, tax, or subscription-management responsibilities.[1] WiseResume must not treat a RevenueCat dashboard metric or a browser callback as a substitute for provider-state evidence.

## 3. Production webhook and environment separation

There must be one intended Production RevenueCat-to-Appwrite delivery path and no duplicate competing destination. Production and Sandbox must use separate provider configurations, product/price allowlists, webhook destinations or environment assertions, secrets, event evidence, and operational dashboards. A Sandbox event must not be able to create a Production provider-state candidate, and a Production event must not be accepted by a Sandbox-only mapping.

The current `revenuecat-webhook` function authenticates before parsing or mutating, validates event identity/environment/product/entitlement, writes only the server-only provider-state and event-ledger collections, and uses durable event-ID deduplication plus event ordering. Those contracts are production-shaped, but the current mapping comments and identifiers are Sandbox-specific and therefore cannot be treated as a Production catalog proof.[10]

A future Production gate requires a safe TEST request that returns HTTP 200 with `test_acknowledged` and `mutated=false`, followed by a read-only proof that neither provider-state nor event-ledger collections changed. The Production endpoint must be strict-TLS valid, respond within the provider’s delivery window, handle retries idempotently, and keep payloads, authorization values, credentials, and raw errors out of logs.

Paddle’s current delivery documentation says webhooks are at-least-once, may be retried when a 200 response is not received promptly, and may arrive out of order. It requires signature verification using `Paddle-Signature`, a fast HTTPS response, and idempotent handling based on event identity.[6] [7] This is a separate trust boundary from the current RevenueCat webhook and must be designed deliberately rather than assumed to be covered by RevenueCat’s downstream notification.

## 4. Server-owned checkout/session architecture

The current single-transaction browser helper is appropriate only as a controlled Sandbox QA bridge. It must not become the Production purchase architecture. A Production flow should be:

1. The authenticated WiseResume client submits only an internal target plan, `pro` or `premium`, to a server-owned Appwrite checkout/session boundary.
2. The server obtains the canonical Appwrite user from the authenticated Appwrite JWT rather than trusting a browser-supplied user ID.
3. The server maps the internal plan to an environment-specific allowlisted Production Paddle price and creates one automatic-collection transaction or provider-supported checkout session.
4. The server attaches `app_user_id` and a non-sensitive correlation/reference value through Paddle custom data.
5. The server uses a deterministic idempotency key tied to user, target plan, and an explicit retry window, and returns only a safe checkout URL or opaque session reference.
6. The browser opens Paddle Checkout using the returned transaction/session reference. No provider API key or server credential reaches the browser.
7. Success, cancel, close, and error callbacks update UI state only. They never write `subscriptions`, provider state, entitlements, credits, or plan fields.
8. The return route enters a pending/reconciliation state and refetches the authoritative subscription and credit endpoints until provider state is observed or a bounded timeout produces a support-safe pending message.

Paddle’s documented transaction flow supports creating a transaction server-side and passing its ID to Paddle.js, and also supports checkout payment links for automatically collected transactions.[4] The design decision for WiseResume should be made during implementation based on the approved Production provider setup, not by reusing the existing one-transaction QA allowlist.

## 5. Removing the single-transaction QA dependency

The current helper hardcodes `txn_01m0yynrv52wtsqcc7p7vgzxhj`, requires the live Sandbox flag, and only opens that transaction. This is an intentional containment measure. It must remain unchanged until a separate implementation begins.

The future design should remove the transaction literal from the Production runtime and replace it with a server response tied to the authenticated user and target plan. It should not replace the literal with a client-supplied arbitrary transaction ID. The server must reject mismatched ownership, wrong environment, wrong price, duplicate active checkout attempts, and stale or already-completed sessions.

The QA helper should either be deleted before Production activation or remain compiled out of the Production payment path behind a clearly non-production build boundary. A public query parameter must never be sufficient to start an arbitrary checkout. The future test suite must prove that unknown transaction IDs, Production identifiers in Sandbox, Sandbox identifiers in Production, invalid plan labels, unauthenticated requests, and replayed session requests all fail closed.

## 6. Production-safe client-token and CSP handling

Paddle’s official documentation distinguishes safe-to-expose client-side tokens from secret API keys.[3] A Production client-side token may appear in the browser bundle, but only after it is confirmed to be a Live client-side token for the correct Paddle workspace. It must not be used as evidence that the server-side Paddle API key, RevenueCat secret, Appwrite key, or webhook secret is safe.

The current CSP includes the exact observed Sandbox hosts: `cdn.paddle.com`, `sandbox-buy.paddle.com`, and `sandbox-api.paddle.com`.[9] Production must use the documented Live checkout/API hosts required by the selected Paddle.js flow, retain only the minimum script/frame/connect sources, preserve Appwrite HTTPS/WSS access, and keep `object-src 'none'`, `frame-ancestors`, and other existing security directives intact. CSP changes must be tested against real checkout loading, cancel, return, and failure paths in a controlled environment.

The future build must fail closed if a Production token is missing, has a Sandbox prefix, or is present in a non-Production build. Conversely, Sandbox tokens must never be injected into a Production activation. Environment variables with `VITE_` are public build-time values; server-only API keys and webhook secrets must use Appwrite/Vercel server-side secret storage and must not be included in frontend source, bundles, reports, screenshots, logs, or chat.

## 7. Success, cancel, pending, and error UX

The payment UI must distinguish at least six states: checkout opening, checkout open, payment submitted/processing, provider reconciliation pending, confirmed active subscription, and failed/canceled/closed. A browser return with `billing=pending` is not success. The UI must explain that access is being verified, avoid showing a false plan, and provide a bounded refresh/retry/support path.

A successful provider state must refresh the subscription and credit queries and survive a full refresh and direct reopen. A canceled or closed checkout must return the user to the prior plan without a success toast. A payment failure must not downgrade or upgrade the user locally. A delayed or missing webhook must show a pending state rather than claiming payment failure or granting access.

Paid users must not see upgrade prompts for their current or lower plan. Free users must see correct Free limits, Pro users the verified 50/day limit, and Ultimate users the verified unlimited behavior. Copy must be localized in English and Arabic, support LTR/RTL, fit long Arabic strings, remain accessible to keyboard and screen-reader users, and work in light and dark themes.

## 8. Subscription reconciliation and lifecycle policy

The existing resolver ranks `free < pro < premium`, normalizes the public label `ultimate` to internal `premium`, and combines Free fallback, legacy manual/admin or coupon state, active trial, and RevenueCat provider state.[11] [12] This is a useful safety foundation, but Production activation requires explicit business policy for conflicts.

| Lifecycle or policy case | Required Production decision and evidence |
|---|---|
| Initial purchase | RevenueCat event, Appwrite ledger `processed/state_updated`, provider state, effective plan, UI, credits, and persistence must agree. |
| Renewal | `RENEWAL` must update period/expiry and preserve access with `will_renew=true`; a provider-period change must not be inferred from a client callback. |
| Scheduled cancellation | User remains active through the verified paid period, provider state records cancellation/renewal intent, and access ends only when the effective expiry is reached. Paddle’s portal supports cancellation at the end of the billing period.[6] |
| Immediate cancellation | Policy must define whether access ends immediately; Appwrite state, UI, and support language must match Paddle’s actual status. |
| Expiration | Provider candidate ceases to win after verified expiry; Free/manual/coupon/trial precedence must be explicit and tested. |
| Billing issue / dunning | Define whether access continues through grace period, which status is stored, what `will_renew` means, and when support escalation occurs. |
| Refund | Define full versus partial refund handling, effective access time, credit reversal policy, and whether RevenueCat/Paddle events are sufficient or a reconciliation job is required. |
| Chargeback/dispute | Define immediate restriction versus access-through-expiry, evidence retention, support workflow, and fraud escalation. |
| Product change | Define upgrade/downgrade/proration behavior and ensure only approved price-to-entitlement pairs are accepted. |
| Duplicate/out-of-order delivery | Durable event ID uniqueness and ordering by provider event time must prevent duplicate state rows and stale regressions. |
| Manual/admin plan | Must remain auditable and must not silently erase a stronger active provider entitlement. |
| Coupon/trial | Must have explicit stacking, precedence, expiry, and post-provider-expiration policy. |
| Support override | Must be server-only, time-bounded, auditable, and clearly distinguishable from provider state. |

The live Sandbox activation, cancellation, expiration, billing-issue, renewal, duplicate-replay, stale-replay, and support-conflict matrix remains incomplete for several transitions. Repository tests are necessary but do not substitute for provider evidence or formally accepted risk.

## 9. Monitoring, reconciliation, rollback, and support

Before activation, implement or approve operational controls for the following:

| Control | Minimum requirement |
|---|---|
| Webhook monitoring | Count received, rejected, processed, duplicate, stale, and processing-failure events by environment and event type without logging secrets or payloads. |
| Provider reconciliation | Scheduled or operator-triggered read-only comparison of Paddle subscription/transaction state, RevenueCat state, Appwrite state, and WiseResume effective plan. Do not use minute-level Manus polling; use an application-side scheduled job or an operator workflow appropriate to the latency requirement. |
| Correlation | Store safe correlation IDs and provider identifiers needed for support; never store bearer tokens or temporary management URLs. |
| Alerting | Alert on webhook 4xx/5xx, signature/auth failure spikes, unknown catalog IDs, identity mismatch, provider/Appwrite lag, duplicate storms, and state conflicts. |
| Rollback | One action must disable new checkout/session creation while preserving read-only subscription resolution and existing paid access until policy says otherwise. |
| Kill switch | `paymentsEnabled` or an equivalent server-backed activation flag must be fail-closed and independently reversible; frontend flags alone are insufficient. |
| Support tools | Read-only lookup by canonical Appwrite user, Paddle customer/subscription/transaction ID, RevenueCat customer, and Appwrite ledger/state; mutation actions require explicit audited server controls. |
| Replay/recovery | Document when a provider notification can be replayed safely, how duplicate protection behaves, and how a missing webhook is reconciled without manual entitlement grants. |
| Data retention | Keep the 90-day event-ledger retention contract or revise it with a documented support/legal requirement; do not delete evidence before reconciliation obligations expire. |

Paddle’s current webhook documentation recommends a fast 200 response, idempotent event handling, signature verification, and inspection/replay of failed notifications.[6] [7] WiseResume should preserve those provider guarantees while keeping its own Appwrite ledger authoritative for downstream state application.

## 10. Exact conditions before `paymentsEnabled` may become true

`paymentsEnabled` must remain `false` until every condition below has a recorded pass or an explicit owner-approved exception. A green browser checkout alone is insufficient.

1. The prior Sandbox credential exposure is resolved, explicitly accepted with a written risk decision that is valid for Production, or the affected credentials are safely replaced. The current owner-accepted warning is not a Production clearance.
2. Production Paddle account verification, website approval, default payment link/checkout URL, automatic collection, tax, invoice, currency, refund, customer portal, cancellation, and payment-method-update behavior are complete.
3. Production Paddle Pro and Ultimate/Premium products and recurring prices are verified and frozen under an approved catalog contract.
4. Production RevenueCat app/config is connected to the correct Production Paddle workspace without exposing credentials, and the existing `pro`/`premium` entitlements are reused without duplicates.
5. Production RevenueCat products, offering, packages, automatic purchase tracking, App User ID metadata key, event scope, and environment separation are verified.
6. Exactly one intended Production RevenueCat webhook/integration path exists, and duplicate destinations or competing automatic tracking are ruled out.
7. The Production Appwrite webhook route has valid strict TLS, the deployed source hash matches reviewed code, required server variables are present, and secret parity is proven only through safe metadata/behavior.
8. A Production TEST returns HTTP 200 with `test_acknowledged` and `mutated=false`; read-only state checks prove no ledger/provider-state mutation.
9. The future server-owned checkout/session boundary is implemented, authenticated, allowlisted, idempotent, rate-limited, correlated, and covered by negative tests. The single-transaction QA allowlist is absent from the Production payment path.
10. No API key or server secret appears in frontend bundles, source maps, logs, screenshots, reports, CSP, or client-visible error messages.
11. Success, cancel, pending, failure, webhook-delay, duplicate-click, retry, and session-loss UX is implemented and localized in English and Arabic with LTR/RTL, light/dark, keyboard, mobile, and screen-reader QA.
12. The resolver policy for manual/admin, coupon, trial, provider, cancellation, expiration, refund, chargeback, billing issue, and support override is approved and covered by tests.
13. Sandbox live-transition evidence is complete or formally accepted for Pro, Ultimate, renewal, cancellation, access-until-expiration, expiration, billing issue, duplicate, stale ordering, and Free regression. Simulator events must not be treated as payment proof; RevenueCat documents that Paddle webhook simulation does not update customer status or entitlements.[1]
14. Monitoring, alerting, reconciliation, support, legal disclosures, refund/chargeback operations, rollback, kill switch, and incident runbooks are ready.
15. A controlled Production canary plan exists with a safe non-real account or owner-approved low-risk cohort, clear abort criteria, and no accidental public activation.
16. The owner explicitly approves the activation commit, provider configuration, Production environment variables, deployment, and canary. This audit does not constitute that approval.

## 11. Desktop/mobile and Arabic/English QA matrix

| Surface | English LTR | Arabic RTL | Light | Dark | Desktop | Mobile |
|---|---:|---:|---:|---:|---:|---:|
| Pricing catalog and CTA | Required | Required | Required | Required | Required | Required |
| Subscription current-plan state | Required | Required | Required | Required | Required | Required |
| Paddle overlay/inline checkout | Required | Required | Required | Required | Required | Required |
| Pending/reconciliation state | Required | Required | Required | Required | Required | Required |
| Success/active state | Required | Required | Required | Required | Required | Required |
| Cancel/close/error state | Required | Required | Required | Required | Required | Required |
| Sidebar account/billing access | Required | Required | Required | Required | Required | Required |
| Keyboard focus and Escape behavior | Required | Required | Required | Required | Required | Required |
| Long Arabic labels and validation errors | N/A | Required | Required | Required | Required | Required |
| No horizontal or double scroll | Required | Required | Required | Required | Required | Required |
| Refresh/reopen persistence | Required | Required | Required | Required | Required | Required |

Every paid-state claim must be checked against the server-effective plan and credits, not a local callback. Free regression must be tested after logout/login, refresh, expired pending state, rejected payment, and absent provider state.

## 12. Exact Sandbox-to-Production activation checklist

### Gate A — Security and repository

Confirm clean Git state, reviewed branch, no token/API key/secret leakage, no source-map leakage, no unexplained changes, and updated Atlas documentation. Resolve or formally re-accept the existing Sandbox API-key warning before Production approval.

### Gate B — Provider catalog

In Paddle Production, verify account readiness, approved domains, default payment link/checkout URL, automatic collection, Pro and Ultimate/Premium prices, tax/currency/invoice behavior, customer portal, cancellation, payment-method update, refund, and chargeback policy. In RevenueCat Production, verify the connected Paddle config, imported products, existing entitlement mapping, offering/packages, metadata key, automatic tracking, and absence of duplicate tracking. Do not use credential-bearing views unless the access path is designed to redact values.

### Gate C — Transport and state

Verify strict TLS and endpoint ownership. Deploy only reviewed targeted Appwrite changes through the approved repository workflow. Run one safe Production TEST and require HTTP 200, `test_acknowledged`, `mutated=false`, and zero provider-state/ledger mutation. Verify environment assertions, source parity, secret presence metadata, and logs.

### Gate D — Checkout/session

Implement and test authenticated server-owned session creation with plan/price allowlists, canonical user mapping, custom data, idempotency, rate limiting, correlation, and safe response shape. Test unauthenticated, invalid-plan, wrong-environment, wrong-price, duplicate-request, concurrent-request, expired-session, and provider-error paths.

### Gate E — Lifecycle and UX

Run the approved Sandbox matrix for Pro and Ultimate, then a controlled Production canary only after owner approval. Verify initial purchase, renewal, scheduled cancellation, expiration, billing issue, refund/chargeback policy, duplicate delivery, stale delivery, missing webhook, delayed webhook, session return, refresh/reopen, effective plan, credits, and support lookup. Complete English/Arabic, LTR/RTL, desktop/mobile, light/dark, accessibility, and overflow QA.

### Gate F — Release and rollback

Record the activation commit, provider/config evidence, deployment IDs, TEST execution, canary identity, observed events, Appwrite rows, UI evidence, monitoring dashboards, abort criteria, and rollback action. Keep `paymentsEnabled=false` until all gates are signed off; then enable only through the reviewed release path and immediately monitor the canary.

## 13. Recommended implementation phases

| Phase | Scope | Exit criterion |
|---|---|---|
| 2D-C.1 | Server checkout/session contract and threat model | Reviewed API shape, identity/price allowlists, idempotency and failure semantics approved; no provider mutation. |
| 2D-C.2 | Appwrite server-owned checkout/session implementation | Focused tests pass; no secret reaches client; QA helper is excluded from Production payment path. |
| 2D-C.3 | Sandbox checkout migration | Existing Pro/Ultimate Sandbox flows use the server boundary; live transition and negative-path matrix passes. |
| 2D-C.4 | Lifecycle policy and operations | Cancellation, expiry, billing issue, refund, chargeback, manual/coupon/trial precedence, monitoring, reconciliation, support, and rollback are approved. |
| 2D-D | Frontend activation behind a fail-closed server-backed flag | Pricing/Subscription invoke the server path and every UX state is verified across the required matrix. |
| 2D-E | Production provider/configuration and canary | Provider, webhook, secret, catalog, transport, legal, security, monitoring, rollback, and owner gates pass; canary is explicitly approved. |

## 14. Can Production implementation safely begin?

**Yes, but only in a non-activating, separately reviewed Phase 2D-C branch for the server-owned checkout/session contract and implementation.** It must not enable `paymentsEnabled`, expose active purchase buttons, create Production transactions, change Production provider configuration, deploy, or mutate Production data during the implementation stage.

**No, Production checkout activation cannot safely begin.** The current Production provider inventory, Production RevenueCat mapping, Production webhook/secret parity, server-owned checkout boundary, lifecycle policy, monitoring/rollback, and the unresolved Sandbox API-key warning remain blockers. The current single-transaction browser helper should be treated as a provisional Sandbox QA bridge, not as a Production design.

## 15. Exact next action

Create a separately authorized Phase 2D-C implementation task limited to the server-owned checkout/session contract and threat-model review, while keeping `paymentsEnabled=false` and all provider configuration unchanged. Before that task starts, the owner should make one decision: **resolve the existing Sandbox API-key exposure or formally accept a documented residual risk that is explicitly reviewed for Production suitability**. No payment, provider mutation, secret change, deployment, or public activation should occur in this audit-only phase.

## References

[1]: https://www.revenuecat.com/docs/web/integrations/paddle "RevenueCat Paddle Billing integration"
[2]: https://www.revenuecat.com/docs/platform-resources/server-notifications/paddle-server-notifications "RevenueCat Paddle Server Notifications"
[3]: https://developer.paddle.com/paddle-js/about/client-side-tokens/ "Paddle client-side tokens"
[4]: https://developer.paddle.com/build/transactions/pass-transaction-checkout/ "Paddle pass a transaction to checkout"
[5]: https://developer.paddle.com/build/transactions/default-payment-link/ "Paddle default payment links"
[6]: https://developer.paddle.com/webhooks/about/how-webhooks-work "Paddle how webhooks work"
[7]: https://developer.paddle.com/webhooks/about/respond-to-webhooks "Paddle handle webhook delivery"
[8]: https://github.com/iammagdy/WiseResume-TWC/blob/c54afd9a1beba93734786549c42a7bea5a69662b/src/lib/billing.ts "WiseResume billing feature gate"
[9]: https://github.com/iammagdy/WiseResume-TWC/blob/c54afd9a1beba93734786549c42a7bea5a69662b/src/lib/sandboxPaddleCheckout.ts "WiseResume provisional Sandbox Paddle checkout helper"
[10]: https://github.com/iammagdy/WiseResume-TWC/blob/c54afd9a1beba93734786549c42a7bea5a69662b/appwrite-hubs/revenuecat-webhook/src/main.js "WiseResume RevenueCat webhook"
[11]: https://github.com/iammagdy/WiseResume-TWC/blob/c54afd9a1beba93734786549c42a7bea5a69662b/appwrite-hubs/shared-subscription-resolver/index.js "WiseResume shared subscription resolver"
[12]: https://github.com/iammagdy/WiseResume-TWC/blob/c54afd9a1beba93734786549c42a7bea5a69662b/appwrite-hubs/coupons/src/main.js "WiseResume effective subscription boundary"
