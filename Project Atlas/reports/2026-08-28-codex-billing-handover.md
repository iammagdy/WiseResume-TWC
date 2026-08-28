# Codex Handover — WiseResume Billing and Sandbox Checkout

**Handover date:** 2026-08-28
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`
**Current branch:** `main`
**Current `main` / `origin/main`:** `c23ed096a21e4750ed274f27892b4da8c7a1b14b`
**Current repository status:** clean at the time of handover
**Primary backend:** Appwrite Cloud
**Frontend:** React + TypeScript + Vite + Tailwind + Radix/shadcn
**Auth:** Appwrite Auth
**Billing providers:** Paddle and RevenueCat

> This document is a continuation handover, not a permission to bypass payment security. Codex must preserve the server-owned billing architecture, never use the previously exposed Paddle credential, and never activate Production billing.

## 1. Current verdict

The non-credential public Sandbox billing implementation is complete, merged, documented, and deployed with a fail-closed server boundary. The final status is:

`SANDBOX_RUNTIME_READY_SAFE_PROVIDER_CREDENTIAL_REQUIRED`

The system is **not** currently verified for a new provider-authenticated checkout because no safe server Paddle credential was proven available through an approved masked path. No provider-authenticated request, new transaction, payment, entitlement mutation, or lifecycle mutation was performed during the final completion mission.

The prior credential incident remains:

`SECURITY_INCIDENT_SECRET_EXPOSURE` / `OWNER_ACCEPTED_UNRESOLVED_RISK`

The owner previously declined credential rotation. Do not ask Codex to retrieve, print, copy, hash, compare, validate, store, configure, or use the exposed credential. Do not reopen the provider inventory endpoint that exposed it. Do not put any server credential in frontend code or a `VITE_*` variable.

## 2. What has already been implemented

The server-owned checkout boundary is implemented in `appwrite-hubs/billing-checkout/src/main.js`. It requires an authenticated Appwrite caller, accepts only `action=create-session`, and accepts only internal plans `pro` and `premium`. Public **Ultimate** maps to internal `premium`; `ultimate` must never be accepted or persisted.

The server selects the price and product from an environment-scoped catalog. The browser cannot submit or override a price ID, product ID, transaction ID, user ID, environment, provider, entitlement, callback, or return authority. The provider is the only source that can create a checkout transaction, and RevenueCat-to-Appwrite webhook ingestion remains the only source of provider subscription state.

The Function has explicit configuration gates:

| Runtime control | Required behavior |
|---|---|
| `BILLING_CHECKOUT_ENABLED` | Must be `true` before checkout can run; default/off behavior is fail-closed |
| `BILLING_CHECKOUT_PROVIDER_READY` | Must be `true` before provider calls can run |
| `BILLING_CHECKOUT_ENVIRONMENT` | Must be exactly `sandbox` or `production` |
| `BILLING_CHECKOUT_APPROVED_ORIGIN` | Must be a valid approved HTTPS origin |
| Sandbox catalog | Uses only `BILLING_SANDBOX_*` variables |
| Production catalog | Uses only `BILLING_PRODUCTION_*` variables and remains disabled/unconfigured |
| Server Paddle key | Sandbox key is read only server-side at provider execution time; no key is in source or frontend |

The Paddle adapter posts only a server-selected automatic transaction to the matching Paddle API environment. It validates the returned transaction ID, automatic collection mode, exactly one matching item, price, product, quantity, canonical `custom_data.app_user_id`, environment consistency when supplied, and an HTTPS checkout URL. It returns only safe checkout data and never raw provider payloads.

The additive Appwrite collections are:

| Collection | Purpose | Security |
|---|---|---|
| `billing_checkout_sessions` | Short-lived server-owned checkout sessions and safe recovery state | Empty collection permissions; server API only |
| `billing_checkout_locks` | Transactional user/plan locking and duplicate prevention | Empty collection permissions; server API only |

The existing RevenueCat state and ledger collections remain authoritative for lifecycle state. The shared resolver in `appwrite-hubs/shared-subscription-resolver/index.js` now filters provider candidates by trusted environment. A Sandbox provider row is accepted only in trusted Sandbox mode and cannot grant access in a future Production mode. Manual/admin, coupon, active-trial, and Free precedence remains centralized and unchanged in principle.

## 3. Frontend status and requested Update button

The frontend client is `src/lib/billingCheckout.ts`. It invokes `billing-checkout` with only:

```json
{
  "action": "create-session",
  "plan": "pro|premium",
  "idempotency_key": "optional-client-generated-key"
}
```

The client validates only the sanitized response envelope and HTTPS checkout URL. It never treats a checkout session as entitlement success. It stores a short-lived pending-plan marker only for reconciliation and uses `useMe`/`refetchMe` for authoritative subscription refresh.

`src/pages/SubscriptionPage.tsx` already contains the authenticated Upgrade/Update control. The visible label in Sandbox mode is `Sandbox test checkout`. It is rendered for valid stronger-plan targets and disabled while preparing. If the server is disabled or provider-unavailable, it shows a truthful no-charge error and does not change the plan or credits.

`src/pages/PricingPage.tsx` exposes the public Sandbox/Test Mode disclosure. English and Arabic RTL copy includes the no-real-charge boundary. Anonymous users must authenticate before invoking checkout.

Current user-visible behavior is intentionally conservative:

1. A normal public visit is unchanged.
2. Anonymous users can view plans but cannot invoke authenticated checkout.
3. An authenticated user can click the Sandbox test checkout button.
4. If the server gates are off or no safe provider credential is configured, the request returns a sanitized unavailable result.
5. If a provider session is ever created, the browser opens only the server-returned safe checkout URL.
6. Return/pending UI waits for RevenueCat/Appwrite confirmation and never grants local access.

The historical `src/lib/sandboxPaddleCheckout.ts` `_ptxn` helper remains only as a tightly allowlisted QA compatibility path. It is not the normal public checkout architecture and must not be expanded into a general transaction mechanism.

## 4. Approved Sandbox catalog identifiers

These identifiers are non-secret provider catalog identifiers already documented in the project. Do not invent replacements, mutate products/prices, or use Production identifiers.

| Public plan | Internal plan | Paddle product | Paddle price | RevenueCat entitlement |
|---|---|---|---|---|
| Pro | `pro` | `pro_01m0fn08h7tmzm5cphvcvd30g6` | `pri_01m0fnjspex6yqqf6w9v9apaxg` | `pro` |
| Ultimate | `premium` | `pro_01m0fnm7000501f67z1bmhzaff` | `pri_01m0fnq9hetwdwm9e1sa49n08s` | `premium` |

The adapter and webhook must continue to require product, price, entitlement, and environment agreement. Never persist `ultimate`; persist only `premium`.

## 5. Verified historical lifecycle evidence

The existing dedicated non-real Pro fixture is Appwrite user ID `6a8d5e4c0029004e93c3`. It must not be repurchased or mutated. The verified Pro path was:

`Paddle Sandbox automatic Pro payment -> RevenueCat customer/Pro entitlement -> RevenueCat INITIAL_PURCHASE -> Appwrite event ledger/provider state -> WiseResume effective Pro`

The Pro provider state was the exact current source of WiseResume Pro; legacy `subscriptions` had no winning row. The verified UI showed Pro, Active, and 50 daily AI credits.

An Ultimate QA fixture used Appwrite user ID `6a8ece270002216e92cb`. A previous `_ptxn`/Hosted Checkout attempt was not accepted as final lifecycle evidence when the transaction remained Incomplete. The final Atlas status deliberately treats new Ultimate provider E2E as `UNVERIFIED` unless a future safe run proves completed Paddle payment, RevenueCat premium entitlement, Appwrite provider state/ledger, internal `premium`, public Ultimate, limits, and persistence. Do not repeat payment using historical fixtures without a new explicit safe test plan.

Repository-controlled tests cover duplicate/idempotency protection, stale-event protection, environment isolation, Ultimate normalization, resolver precedence, schema contracts, safe errors, and no-local-grant behavior. Live cancellation, expiration, billing issue, upgrade, duplicate provider replay, and new Ultimate activation remain unverified.

## 6. Merge and deployment history

| Change | Result |
|---|---|
| PR #198 | Earlier Sentry/runtime fixes; merged and deployed before billing work |
| PR #214 | Pro credit display fix; merged after scope review |
| PR #216 | Sidebar overflow fix; merged at `82d3640c743442db304c50cb57a229648685b59a` |
| PR #220 | Phase 2D-B live-domain Sandbox `_ptxn` support; merged at `770591bfcdbcab34ad6914b1abadcf381554dba7` |
| PR #222 | Production-readiness audit; merged at `4d1e906f03949fb3a05ee8ecba447214f0766b` |
| PR #223 | Server-owned checkout C2 implementation and corrections; merged at `a910c7679058d3283edb807e780836da39a917a4` |
| PR #224 | C1/C2 documentation closeout; merged at `2d7a31d8e2aec52cbed80c17be2e3a571bf04b25` |
| PR #225 | Public Sandbox implementation; merged at `1abe49349d0998f13709c7af9d80164435b5069e` |
| PR #226 | Post-merge/post-deployment Atlas reconciliation; merged at `5f57d990fa16686d7ee57a341885e57aa347d9e8` |
| PR #227 | Final provider-blocked Atlas handover reconciliation; merged at `c23ed096a21e4750ed274f27892b4da8c7a1b14b` |

The additive checkout schema was applied by targeted workflow `33135870481`. Exactly `billing-checkout` was deployed and reached ready deployment `6a90f1babbd3925c3583`. The Vercel Production deployment for the merged product implementation was `6134499586` and succeeded. No `target=all` deployment was used.

## 7. Validation already completed

The final implementation passed focused billing-checkout, webhook, resolver, schema, frontend checkout-client, i18n, TypeScript, ESLint, full Vitest, build/no-sourcemap, source-hash, secret-pattern, and `git diff --check` validation. The latest recorded full Vitest result was 225 files passed, one skipped file, 1,254 tests passed, and one todo. Required PR Validation, Security validation, and Vercel checks passed. TestSprite `No tests detected` is non-required by current repository evidence.

Live public Pricing browser QA passed in English LTR and Arabic RTL for Sandbox/Test Mode disclosure, no-real-charge copy, and plan cards. Authenticated Subscription CTA, mobile viewport, theme alternates, and provider-authenticated pending/reconciliation remain `UNVERIFIED`.

## 8. Current hard boundaries for Codex

Codex must not:

- Read or call the RevenueCat inventory endpoint that previously exposed Paddle credentials.
- Open provider pages or API responses capable of revealing plaintext API keys.
- Retrieve, print, copy, hash, compare, log, store, configure, test, or use the previously exposed Paddle credential.
- Put any server Paddle credential in frontend code, Vercel `VITE_*`, Git, reports, logs, or chat.
- Revoke, rotate, or request credentials unless a later owner instruction explicitly changes that boundary.
- Create another transaction, repeat the verified Pro purchase, manually grant an entitlement, or fabricate lifecycle events.
- Change Paddle/RevenueCat products, prices, offerings, entitlements, DNS, webhook configuration, or Production settings as part of this handover.
- Enable Production billing or use real money/cards.
- Deploy unrelated Appwrite Functions or use `target=all`.
- Broaden Appwrite collection permissions.
- Grant plan access or credits from browser callback, checkout success, local state, or URL parameters.

## 9. Exact next continuation procedure

Before editing, Codex must read the current Atlas documents and relevant skills, then run:

```bash
git status -sb
git branch --show-current
git fetch origin
git log -1 --oneline
git rev-parse HEAD
git rev-parse origin/main
```

Codex should remain on a scoped branch and preserve the clean `main` baseline. The first runtime decision is whether a **different safe server credential** is already available through an approved masked mechanism without reading its plaintext value. If this cannot be proven, do not attempt provider execution. Keep `BILLING_CHECKOUT_ENABLED=false` and `BILLING_CHECKOUT_PROVIDER_READY=false` and limit work to source tests, UI QA, safe disabled-path smoke tests, and documentation.

If and only if a safe credential path is independently proven, the next technical sequence is:

1. Confirm Sandbox-only environment and matching `BILLING_SANDBOX_*` catalog family without inspecting secret values.
2. Confirm the approved HTTPS origin and server-only credential wiring.
3. Run only sanitized unauthenticated, invalid-request, spoofed-authority, and disabled-path smoke tests first.
4. Enable Sandbox readiness only through the approved server configuration path; never enable Production.
5. Use a fresh disposable QA Appwrite user, not the verified Pro fixture and not a real customer.
6. Create one automatic Pro Sandbox checkout through the deployed server boundary, complete it only with Paddle’s Sandbox test flow, and verify Paddle -> RevenueCat -> Appwrite -> WiseResume.
7. Create a separate automatic Ultimate/Premium Sandbox checkout only if the Pro run passes and the owner-authorized fixture is fresh.
8. Verify provider state, event ledger, effective plan, public label, limits, refresh/reopen persistence, and no `ultimate` persistence.
9. Test cancellation, renewal intent, billing issue, expiration, duplicate replay, and stale ordering only when the provider or a repository-controlled safe mechanism provides genuine evidence. Do not fabricate events.
10. If any code defect is found, create a scoped branch/PR and deploy only `billing-checkout` after review. Never deploy unrelated Functions.
11. Update `Project Atlas/WHERE_WE_STOPPED.md`, `CHANGELOG.md`, relevant architecture/deployment/security/QA docs, and a dated report with sanitized evidence.

If no safe credential is available, stop with:

`SANDBOX_RUNTIME_READY_SAFE_PROVIDER_CREDENTIAL_REQUIRED`

The stop report must explicitly say that real Paddle Sandbox transaction execution is blocked because no safe server credential is authorized for use, while Production billing remains disabled.

## 10. Canonical files to inspect first

| Area | File |
|---|---|
| Checkout runtime | `appwrite-hubs/billing-checkout/src/main.js` |
| Checkout schema | `scripts/setup_billing_checkout_schema.cjs` |
| Targeted deployment | `scripts/deploy_hubs.cjs` and `.github/workflows/deploy-appwrite-hubs.yml` |
| Function policy | `scripts/appwrite-function-policy.cjs` |
| Resolver | `appwrite-hubs/shared-subscription-resolver/index.js` |
| RevenueCat webhook | `appwrite-hubs/revenuecat-webhook/src/main.js` |
| Subscription reader | `appwrite-hubs/coupons/src/main.js` |
| AI enforcement | `appwrite-hubs/ai-gateway/src/main.js` |
| Frontend billing flags | `src/lib/billing.ts` |
| Frontend checkout client | `src/lib/billingCheckout.ts` |
| Subscription UI | `src/pages/SubscriptionPage.tsx` |
| Pricing UI | `src/pages/PricingPage.tsx` |
| Living payment architecture | `Project Atlas/architecture/revenuecat-subscription-sync.md` |
| Active handover | `Project Atlas/WHERE_WE_STOPPED.md` |
| Current state | `Project Atlas/CURRENT_STATE.md` |
| Deployment record | `Project Atlas/deployment/current-deployment.md` |
| Latest closeout | `Project Atlas/reports/2026-08-28-public-sandbox-billing-e2e-closeout.md` |

## 11. Final owner-facing summary

WiseResume has a real server-owned Sandbox checkout integration and a visible authenticated Sandbox test checkout control. The implementation is intentionally unable to charge or create a provider checkout until safe server-side Sandbox readiness is explicitly available. The previously exposed credential must not be reused or inspected. The next meaningful billing milestone is a safe provider-credential path followed by a fresh, disposable, Sandbox-only Pro and Ultimate lifecycle verification. Production billing must remain disabled until a separate Production readiness and activation process is completed.
