# WiseResume Payments Phase 2D-C.1 — Server Checkout Contract and Threat Model

**Date:** 2026-08-28
**Mode:** Contract / threat-model design only
**Repository:** `iammagdy/WiseResume-TWC`
**Main before docs closeout:** `c54afd9a1beba93734786549c42a7bea5a69662b`
**Main after authorized docs merge:** `4d1e906f039ee49fb3a05ee8ecba447214f0766b`
**Production:** `https://wiseresume.app`
**Verdict:** `CONTRACT_READY_NOT_IMPLEMENTED`

## Scope and non-goals

This document defines the proposed server-owned checkout/session boundary for a future WiseResume Production payment implementation. It does not implement code, enable `paymentsEnabled`, change Paddle, RevenueCat, Appwrite, DNS, Vercel, secrets, provider configuration, or Production data. It does not create transactions or make payments. The current Sandbox-only `_ptxn` helper remains unchanged and provisional.

The existing verified authority chain remains:

> Paddle billing event → RevenueCat entitlement/event → Appwrite `revenuecat-webhook` → server-only provider state and event ledger → shared effective-plan resolver → WiseResume UI and server-side enforcement.

The browser may start a checkout and display status, but it must never grant or persist plan access. The current Paddle Sandbox API-key exposure remains `OWNER_ACCEPTED_UNRESOLVED_RISK`; this design does not reopen credential-bearing provider views or require rotation in order to complete the design phase.

## 1. Proposed API contract

The proposed boundary is a new, separately targeted Appwrite Function, provisionally named `billing-checkout`. The name is a design placeholder and must be confirmed during Phase 2D-C.2 implementation. It should not be added to the current codebase during this contract-only task.

### 1.1 Request

The client sends one authenticated request to create or reuse a checkout session:

```http
POST /billing-checkout
Content-Type: application/json
```

```json
{
  "action": "create-session",
  "plan": "pro"
}
```

The only accepted `plan` values are `pro` and `premium`. The public word `ultimate` is not accepted. The client does not send `user_id`, Paddle `price_id`, Paddle `transaction_id`, RevenueCat identifiers, environment, currency, amount, discount, return URL, or any provider configuration.

Authentication is out-of-band from the JSON contract. The Function must use the established Appwrite authenticated invocation/JWT mechanism, resolve the current Appwrite user on the server, and reject the request if the authenticated identity is absent or invalid. A browser-supplied user ID is never used for ownership, metadata, or authorization.

The server chooses the return route from a fixed allowlist, for example the WiseResume subscription route with a server-generated correlation reference. The client cannot provide an arbitrary redirect URL or open-redirect target.

### 1.2 Successful response

The server returns only the minimum information required to open the provider checkout:

```json
{
  "status": "success",
  "data": {
    "checkout_url": "https://<approved-provider-checkout-host>/...",
    "session_reference": "opaque-server-reference",
    "plan": "pro",
    "state": "created_or_reused",
    "expires_at": "2026-08-28T12:15:00.000Z"
  }
}
```

`checkout_url` is returned only when the approved client flow requires a hosted URL. If a later implementation uses Paddle.js with a server-created transaction, the response may instead contain an opaque checkout reference that the browser passes to Paddle.js. The response must never contain an API key, RevenueCat secret, Appwrite key, webhook secret, authorization value, Paddle secret, raw provider response, or temporary provider-management URL.

`session_reference` must be opaque and non-authoritative. The browser cannot use it to infer a plan, entitlement, credit limit, or successful payment. The server retains the authoritative mapping to the canonical user, internal plan, environment, price, and provider transaction.

### 1.3 Safe error response

All expected failures use a stable safe code and user-safe message. Provider payloads and raw exception text are not returned.

| HTTP status | Code | Meaning |
|---:|---|---|
| 401 | `unauthorized` | No valid authenticated Appwrite user was resolved. |
| 403 | `payments_disabled` | Server-backed Production kill switch is off. |
| 400 | `invalid_plan` | Plan is not exactly `pro` or `premium`. |
| 409 | `already_entitled` | User already has the requested or stronger effective plan. |
| 409 | `checkout_in_progress` | An unexpired active session exists for this user and plan. |
| 409 | `idempotency_conflict` | Same request key was reused with different normalized input. |
| 409 | `environment_mismatch` | Runtime/provider/catalog environment does not match the server policy. |
| 409 | `catalog_mismatch` | Allowlisted price/product/entitlement contract is not valid. |
| 429 | `rate_limited` | User/session abuse threshold was exceeded. |
| 502 | `provider_unavailable` | Provider transaction/session creation failed or timed out. |
| 500 | `checkout_unavailable` | Safe generic fallback for an unexpected server-side failure. |

The client must not display a success state for any non-2xx response. A 2xx response means only that a checkout session was created or safely reused; it does not mean that payment or entitlement activation succeeded.

### 1.4 Completion and return contract

Paddle or RevenueCat callbacks are not trusted as authorization input. The browser return route may include only a fixed `billing=pending` state and an opaque session reference. On return, the client:

1. Clears any checkout query parameter that could be replayed as a new session.
2. Displays a pending/reconciliation state.
3. Refetches the server-owned subscription and credit data.
4. Shows confirmed access only after Appwrite provider state is present, valid, unexpired, and selected by the effective-plan resolver.
5. Shows delayed/missing-webhook support guidance after a bounded timeout.

The browser must never call Appwrite databases to write plan, credits, provider state, or lifecycle records. The RevenueCat-to-Appwrite webhook remains the lifecycle authority.

## 2. Server validation rules

The Function validates in this order, before provider creation:

| Order | Validation | Required behavior on failure |
|---:|---|---|
| 1 | Authentication and canonical Appwrite identity | Return `401`; no provider call and no session write. |
| 2 | Server kill switch and runtime environment | Return `403` or `409`; no provider call. |
| 3 | JSON shape and request size | Reject arrays, unknown action, unknown fields if strict parsing is selected, and oversized bodies. |
| 4 | Plan | Accept only exact internal `pro` or `premium`; reject `ultimate`, display labels, null, empty, or unknown values. |
| 5 | Existing effective plan | Prevent downgrade and avoid a checkout when the user already has the target or stronger plan. |
| 6 | Environment | Use only server-selected Production configuration; never trust a browser environment field. |
| 7 | Catalog | Map `pro` and `premium` to server-side allowlisted Production price IDs and matching product/entitlement contracts. |
| 8 | Existing active session | Reuse only a session bound to the same user, normalized plan, environment, price, and unexpired request window. |
| 9 | Rate limit | Enforce per-user and session creation limits before provider mutation. |
| 10 | Idempotency | Resolve deterministic request identity and reject conflicting reuse. |
| 11 | Provider request | Create automatic collection only, with canonical `app_user_id` and safe correlation data. |
| 12 | Response | Return only the safe checkout reference/URL and session metadata. |

The server must re-check the user’s effective plan immediately before provider creation. A stale frontend snapshot cannot authorize a new purchase. If the provider returns a transaction that does not match the expected environment, price, collection mode, or custom data, the server must not return it as usable; it must quarantine the session and return a safe provider/catalog error.

## 3. Catalog and metadata design

The browser sends `pro` or `premium`; the server maps these to an environment-specific catalog table. The table is configuration owned by the server and reviewed with the provider inventory.

| Internal plan | Public label | Production collection | Required provider contract |
|---|---|---|---|
| `pro` | Pro | `automatic` | Approved Production Paddle price and RevenueCat `pro` entitlement |
| `premium` | Ultimate | `automatic` | Approved Production Paddle price and RevenueCat `premium` entitlement |

The server attaches:

```json
{
  "app_user_id": "<canonical Appwrite user ID>",
  "checkout_session_reference": "<opaque correlation value>",
  "source": "wiseresume-web"
}
```

Only non-secret correlation metadata is allowed. The canonical Appwrite user ID is necessary for deterministic RevenueCat association, but it is not authorization by itself; the webhook must still verify that the Appwrite user exists before mutation. The server must not put JWTs, API keys, email addresses unless explicitly required and approved, card data, or provider secrets into custom data.

RevenueCat documents that Paddle server notifications can read an App User ID from a configured Paddle metadata field and that absent metadata can result in an anonymous association.[2] The Production integration must therefore verify the exact `app_user_id` metadata key and fail or quarantine ambiguous purchases rather than silently creating an anonymous paid customer.

## 4. Idempotency and concurrency design

The proposed session record is server-only and is a design requirement, not an instruction to change the current schema during this task. A future repository-controlled schema may be named `billing_checkout_sessions` and should include:

| Field | Purpose |
|---|---|
| `session_key` | Deterministic unique key for user, plan, and retry window. Store a one-way digest, not raw authorization material. |
| `user_id` | Canonical Appwrite user owner. |
| `plan` | Internal `pro` or `premium`; never `ultimate`. |
| `environment` | Server-selected `production` or `sandbox`; never client-selected. |
| `price_id` | Server-resolved allowlisted price identifier. |
| `provider_transaction_id` | Provider reference needed for reconciliation; server-only. |
| `state` | `created`, `opened`, `pending`, `completed`, `canceled`, `expired`, or `failed`. |
| `correlation_id` | Safe support and log correlation value. |
| `created_at` / `updated_at` | Operational timestamps. |
| `expires_at` | Checkout reuse and stale-session boundary. |
| `last_error_code` | Safe internal classification, never raw provider error text. |

Recommended initial policy values are **one active session per user and plan**, a **15-minute active checkout window**, a **24-hour idempotency replay window**, and a **three-session creation limit per user in ten minutes**. These values are proposed defaults and require product/security approval before implementation.

The deterministic request key should be derived from the canonical user ID, normalized plan, selected environment, and an explicit retry bucket. The digest must not be used as a secret or bearer token. Two identical requests in the active window return the same safe checkout reference and must not create another Paddle transaction. A request with the same key but different plan, user, environment, price, or return policy returns `idempotency_conflict`.

Concurrent requests must be serialized by a unique server-side record or equivalent atomic create operation. If an existing active session is found, the server must verify ownership and parameter equality before reuse. An expired or terminal session is not silently reopened; the server first checks the authoritative subscription state and then creates a new session under a new retry bucket if policy permits.

A browser refresh after payment must not create a new transaction. A user who has already become `pro` or `premium` must receive `already_entitled` rather than a second checkout. A failed provider call may be retried only after the session record is safely classified and the idempotency policy determines that a new provider attempt is allowed.

## 5. Authorization and ownership

Every session is owned by exactly one canonical Appwrite user. The server obtains that identity from the authenticated Appwrite context and writes it into the session record and Paddle custom data. The client cannot choose another user, reuse another user’s session, or substitute another user’s Paddle transaction.

A future `get-session` or status endpoint, if needed, must require the same authenticated user and return only that user’s safe status. A session reference received from the browser is an index into a server-side ownership check, not proof of ownership. Wrong-owner, unknown, completed, canceled, expired, wrong-price, and wrong-environment references must fail closed.

Provider callbacks must be authenticated according to the provider integration contract. Browser-originated success callbacks, query parameters, referrers, postMessage values, and local storage are never lifecycle authority. The Appwrite RevenueCat webhook must continue to validate the event identity, environment, product, entitlement, timestamp, and Appwrite user before state mutation.[10]

## 6. Rate limiting and abuse protection

The Function should apply a server-side limit keyed primarily by canonical Appwrite user, with a secondary coarse request-source signal where available. It must not rely only on a browser-provided IP or user-agent. Recommended defaults are three session creation attempts per user per ten minutes, one active session per plan, and a bounded provider timeout. Repeated invalid plans, wrong-owner references, catalog mismatches, and environment mismatches should contribute to an abuse signal without revealing sensitive diagnostic detail to the client.

The rate limiter must fail closed when its backing state is unavailable if provider creation could otherwise proceed without protection. Rate-limit records and checkout sessions require server-only access and retention appropriate to support/reconciliation needs. No rate-limit or checkout record should contain card data, authorization values, API keys, or raw provider payloads.

## 7. Environment separation

Environment is selected by deployment configuration, never by request input. Production and Sandbox need separate Paddle client/API credentials, RevenueCat app/config, product/price allowlists, webhook destination and secret, Appwrite environment variables, monitoring labels, and test fixtures.

The future Production server must assert all of the following before creating a transaction:

| Assertion | Production requirement |
|---|---|
| Paddle API base | Live Paddle API only. |
| Paddle client token | Live client-side token only in the browser bundle, if Paddle.js is used. |
| Paddle API key | Server-side only; never in frontend or logs. |
| RevenueCat mapping | Production product/entitlement association only. |
| Webhook | Intended Production route and secret only. |
| Price IDs | Production allowlist only. |
| Custom data | Canonical user and safe correlation only. |
| Runtime flag | Server-backed Production checkout flag explicitly enabled; default is disabled. |

A Sandbox token prefix, Sandbox price ID, Sandbox transaction ID, or Sandbox webhook event must be rejected by a Production path. The current single-transaction QA allowlist must not be reused for Production. Likewise, a Production identifier must not be accepted by the Sandbox QA helper.

Paddle’s official documentation distinguishes Sandbox and Live client-side tokens and states that client-side tokens are safe for frontend checkout use while API keys must remain server-side.[3] That rule does not remove the need for environment assertions, domain approval, provider catalog review, or server-side secret handling.

## 8. Production kill switch

The primary activation control must be server-backed, fail-closed, and checked before any provider transaction/session creation. A proposed configuration is:

```text
BILLING_CHECKOUT_ENABLED=false
BILLING_CHECKOUT_ENVIRONMENT=production
```

The Function returns `payments_disabled` unless the server-side flag is explicitly `true`, the runtime environment is exactly the expected deployment environment, the Production catalog contract is loaded and valid, and required provider credentials/configuration are present. Missing, malformed, or inconsistent configuration must evaluate to disabled.

The frontend `paymentsEnabled` flag remains a secondary presentation control. It may hide CTAs, but it cannot be the only safety boundary because a caller can bypass the UI. The kill switch must stop new checkout creation while preserving read-only subscription resolution and existing paid access according to the lifecycle policy. It must not delete provider state, downgrade users, or modify the event ledger.

Rollback consists of disabling the server-backed creation flag, confirming that new checkout requests return `payments_disabled`, preserving the webhook and read-only resolver, and documenting the observed deployment/configuration evidence. Re-enabling requires the same reviewed activation gate; it is not an automatic recovery action.

## 9. Threat model

| Threat | Control | Required test/evidence |
|---|---|---|
| Forged plan (`ultimate`, display label, arbitrary string) | Exact internal-plan enum; normalize only approved internal values; never persist `ultimate` | Unit and function tests reject all non-`pro`/`premium` values. |
| Forged user ID | Resolve user from authenticated Appwrite context; ignore request user fields | Test request user differs from authenticated user; no provider call or cross-user write. |
| Forged price ID | Client never sends price; server maps plan to environment allowlist | Test arbitrary/wrong-environment price cannot reach provider. |
| Arbitrary transaction ID | Client cannot choose an existing provider transaction; server owns session mapping | Test unknown, completed, wrong-owner, and QA transaction references fail closed. |
| Replay | One-time/expiring session semantics, terminal state, idempotency record | Replay same request/return after completion does not create a new transaction or grant access. |
| Duplicate click | Atomic active-session creation and deterministic key | Parallel requests yield one provider transaction and one reusable response. |
| Concurrent checkout | One active session per user/plan with ownership and parameter equality | Multi-tab race test proves no duplicate provider creation. |
| Sandbox/Production confusion | Deployment-selected environment, separate allowlists and credentials, runtime assertions | Cross-environment identifiers and prefixes are rejected. |
| Client-token leakage misuse | Only public client token in frontend; API keys and webhook secrets server-side | Bundle/source-map/log scans prove no server secret leakage. |
| API-key leakage | Server secret storage, redacted errors/logs, no provider credential views in QA | Static scan and log assertions contain no secret values. |
| CSRF/session misuse | Same-site auth/session controls, authenticated Appwrite context, no cookie-only mutation assumption | Cross-origin request and missing-auth tests return 401/403 without provider call. |
| Provider callback spoofing | Do not trust browser callbacks; authenticate provider webhooks; validate event identity/catalog/environment | Forged callback/postMessage/query cannot change state. |
| Stale provider state | Event timestamps/order keys and resolver expiry rules | Older lifecycle event cannot regress current provider state. |
| Missing/out-of-order webhook | Pending UI, durable ledger, reconciliation path, stale-event protection | Delayed, duplicate, missing, and out-of-order cases remain non-granting or policy-correct. |
| Privilege escalation | Server-only state writes and canonical-user ownership | Client cannot write provider state, ledger, legacy subscription, or credits. |
| Open redirect | Fixed return routes; no client-supplied arbitrary URL | Malicious return URL is ignored/rejected. |
| Provider timeout/partial failure | Persist safe session state, no false success, bounded retry | Timeout test proves no duplicate provider transaction and safe retry behavior. |
| Catalog drift | Startup/request contract validation and safe `catalog_mismatch` response | Removed/changed product or entitlement blocks checkout. |
| Entitlement conflict | Existing effective-plan check and explicit manual/coupon/trial policy | Stronger plan is not downgraded and conflict is surfaced safely. |
| Rate-limit bypass | Server-side user/session limits and atomic counters | Repeated requests, tabs, and altered client headers remain bounded. |

## 10. Reconciliation and lifecycle UX contract

The future UI must expose truthful states, not infer plan access from the checkout callback:

| State | UI behavior | Server behavior |
|---|---|---|
| `pending` | “Payment received or processing; we are verifying access.” | Refetch authoritative state; do not grant locally. |
| `confirmed` | Show Pro or Ultimate only after provider state resolves to `pro` or `premium`. | Provider state and ledger are the source of truth. |
| `canceled` | Return to prior effective plan with no success claim. | No local state mutation; provider event governs status. |
| `closed` | Explain checkout was closed and offer retry if allowed. | Existing session remains non-entitled. |
| `failed` | Show generic failure and safe retry/support option. | Preserve prior entitlement; no downgrade or grant. |
| `delayed webhook` | Keep bounded pending state, then show support-safe reconciliation message. | Read-only reconciliation can correlate provider/session records. |
| `missing webhook` | Never display paid access solely from Paddle browser success. | Operator/reconciliation path investigates; manual grant is prohibited. |

The return flow must work after refresh, direct reopen, lost focus, popup/overlay close, network recovery, and a transient Appwrite error. It must preserve a valid session and must not send the user to login merely because a provider checkout overlay changed focus or origin.

## 11. Legacy, manual, coupon, and trial precedence

The existing resolver is additive: it considers Free fallback, legacy manual/admin or coupon plan, active trial, and valid unexpired RevenueCat provider state, then selects the highest-ranked candidate (`free < pro < premium`). Provider state does not overwrite the legacy `subscriptions` record, and `ultimate` remains invalid as a persisted internal value.[11] [12]

Before implementation, the owner must approve the business policy for these cases:

1. Whether an active manual/admin, coupon, or trial candidate can outlive a canceled, expired, refunded, or charged-back provider subscription.
2. Whether a provider upgrade can coexist with a lower coupon or trial and how the effective expiry is displayed.
3. Whether immediate cancellation removes access or only stops renewal.
4. How billing issue and grace periods map to access.
5. How full refunds, partial refunds, disputes, and chargebacks affect access, credits, and support review.
6. Whether support overrides are time-bounded and whether they can exceed provider state.
7. How product changes and proration are represented without persisting `ultimate`.

These are policy gates, not implementation details. The server checkout boundary must preserve the existing resolver and must not introduce a browser-side shortcut around it.

## 12. Proposed future files and components

No files below were created or changed in this contract-only task. They are an implementation map for Phase 2D-C.2 and later.

| Proposed area | Future purpose |
|---|---|
| `appwrite-hubs/billing-checkout/src/main.js` | Authenticated server-owned session creation, plan/price mapping, kill switch, idempotency, rate limiting, and safe response. |
| `appwrite-hubs/shared-subscription-resolver/` | Preserve existing effective-plan behavior; extend only if approved policy requires it. |
| `scripts/setup_billing_checkout_schema.cjs` | Idempotent setup for any approved server-only checkout-session/idempotency collection. |
| `src/lib/billingCheckout.ts` | Typed client request/response/error contract; no provider secrets or arbitrary IDs. |
| `src/components/billing/CheckoutStatus.tsx` | Localized pending/confirmed/canceled/closed/failed/delayed states. |
| `src/pages/SubscriptionPage.tsx` | Invoke the server boundary only when the server-backed flag allows it; preserve paid-user CTA suppression. |
| `src/pages/PricingPage.tsx` | Route authenticated purchase intent to the safe server flow; preserve Free and lower-tier behavior. |
| `vite.config.ts` / deployment config | Only the minimum Live Paddle CSP sources required by the selected client flow, after provider approval. |
| `Project Atlas/` payment docs | Record policy decisions, schema, deployment, evidence, rollback, and activation sign-off. |

The current `src/lib/sandboxPaddleCheckout.ts` must not be generalized by simply removing its transaction allowlist. The future Production path must be a distinct server-owned flow, and the QA helper must be deleted, compiled out, or kept behind an explicitly non-Production boundary before activation.

## 13. Required tests for Phase 2D-C.2+

### Contract and unit tests

Tests must cover exact request schema, accepted plans, rejection of `ultimate`, authentication absence, canonical-user binding, server-side price mapping, environment mismatch, catalog mismatch, automatic collection, safe response shape, safe error codes, fixed return routes, and absence of provider secrets in output.

### Idempotency and concurrency tests

Tests must cover repeated identical requests, same-key different-input conflicts, refresh after return, parallel duplicate clicks, multi-tab concurrency, expired session retry, terminal session replay, already-entitled requests, provider timeout, partial failure, and rate-limit exhaustion.

### Security tests

Tests must cover forged user IDs, arbitrary price IDs, arbitrary transaction IDs, wrong-owner references, forged callback/postMessage/query data, CSRF/session misuse, Sandbox/Production cross-wiring, secret/source-map/log leakage, open redirects, stale provider state, missing webhook, out-of-order events, privilege escalation, and direct client writes to server-only collections.

### Lifecycle and integration tests

The existing repository tests must remain green, including TEST no-mutation, duplicate idempotency, stale-event protection, resolver precedence, Ultimate normalization, and schema contracts. Future live Sandbox evidence should cover Pro and Ultimate initial purchase, renewal, scheduled cancellation, access until expiry, expiration, billing issue, duplicate delivery, stale delivery, and Free regression. Paddle and RevenueCat simulator events must not be treated as completed-purchase proof; RevenueCat documents that Paddle webhook simulation does not update customer status or entitlements.[1]

### Browser matrix

Complete English LTR and Arabic RTL, desktop and mobile, light and dark, keyboard/focus, screen-reader, long Arabic text, overlay close, network recovery, refresh/reopen, pending, success, cancel, failure, delayed webhook, missing webhook, Free, Pro, and Ultimate UI verification. Confirm there is no horizontal or double-scroll regression and no upgrade CTA for the current or lower plan.

## 14. Blockers

| Blocker | Status |
|---|---|
| Production Paddle account/domain/catalog/payment policy | `UNVERIFIED` |
| Production RevenueCat app/config/product/offering mapping | `UNVERIFIED` |
| Production webhook destination, strict TLS, and secret parity | `UNVERIFIED` |
| Server-owned checkout/session implementation | `NOT_IMPLEMENTED` |
| Checkout session/idempotency schema | `NOT_IMPLEMENTED` |
| Lifecycle policy for refunds, chargebacks, billing issue, manual/coupon/trial conflicts | `POLICY_REVIEW_REQUIRED` |
| Monitoring, reconciliation, support, rollback, and kill switch | `DESIGN_REQUIRED` |
| Prior Paddle Sandbox API-key exposure | `OWNER_ACCEPTED_UNRESOLVED_RISK` |
| `paymentsEnabled` activation | `FORBIDDEN_UNTIL_ALL_GATES_PASS` |

## 15. Phase 2D-C.2 readiness

**Phase 2D-C.2 implementation may safely begin only as a separately authorized, non-activating implementation branch after this contract is accepted and the unresolved policy decisions are recorded.** It must not enable payments, create Production transactions, mutate provider configuration, deploy, or change secrets as part of the contract implementation unless those actions receive separate explicit authorization.

The contract is sufficiently defined to begin implementation planning, but the system is not ready to activate Production checkout. The prior credential-exposure warning, unverified Production provider inventory, absent server-owned session boundary, unresolved lifecycle policy, and incomplete operational controls remain release blockers.

## 16. Exact next action

Review and approve this contract and the legacy/manual/coupon/trial policy decisions. If approved, open a separate Phase 2D-C.2 implementation task limited to the new server-owned checkout/session Function, its idempotency/rate-limit storage contract, focused tests, and safe error/response types. Keep `paymentsEnabled=false`, keep the current Sandbox QA helper unchanged, and do not change Paddle, RevenueCat, Appwrite, DNS, Vercel, secrets, or Production configuration during that implementation stage.

## References

[1]: https://www.revenuecat.com/docs/web/integrations/paddle "RevenueCat Paddle Billing integration"
[2]: https://www.revenuecat.com/docs/platform-resources/server-notifications/paddle-server-notifications "RevenueCat Paddle Server Notifications"
[3]: https://developer.paddle.com/paddle-js/about/client-side-tokens/ "Paddle client-side tokens"
[4]: https://developer.paddle.com/build/transactions/pass-transaction-checkout/ "Paddle pass a transaction to checkout"
[5]: https://developer.paddle.com/build/transactions/default-payment-link/ "Paddle default payment links"
[6]: https://developer.paddle.com/webhooks/about/how-webhooks-work "Paddle how webhooks work"
[7]: https://developer.paddle.com/webhooks/about/respond-to-webhooks "Paddle handle webhook delivery"
[10]: https://github.com/iammagdy/WiseResume-TWC/blob/4d1e906f039ee49fb3a05ee8ecba447214f0766b/appwrite-hubs/revenuecat-webhook/src/main.js "WiseResume RevenueCat webhook"
[11]: https://github.com/iammagdy/WiseResume-TWC/blob/4d1e906f039ee49fb3a05ee8ecba447214f0766b/appwrite-hubs/shared-subscription-resolver/index.js "WiseResume shared subscription resolver"
[12]: https://github.com/iammagdy/WiseResume-TWC/blob/4d1e906f039ee49fb3a05ee8ecba447214f0766b/appwrite-hubs/coupons/src/main.js "WiseResume effective subscription boundary"
