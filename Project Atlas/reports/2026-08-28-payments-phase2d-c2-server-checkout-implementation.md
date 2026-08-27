# WiseResume Payments Phase 2D-C.2 — Server-Owned Checkout Boundary

**Date:** 2026-08-28
**Repository:** `iammagdy/WiseResume-TWC`
**Branch:** `feat/phase2dc2-server-checkout`
**Base:** `4d1e906f039ee49fb3a05ee8ecba447214f0766b`
**Mode:** Local implementation and validation only
**Verdict:** `IMPLEMENTED_VALIDATED_NOT_DEPLOYED_WITH_BUILD_ENVIRONMENT_WARNING`

## Objective and root cause

Phase 2D-C.2 implements the approved server-owned checkout/session boundary without activating billing. The prior Phase 2D-C.1 contract identified that the browser must not select a user, price, transaction, provider environment, or return URL, and that a future checkout must be durable, idempotent, rate-limited, and fail closed when Production catalog/configuration is unavailable. Before this change there was no repository-owned checkout-session Function or storage contract.

The implementation deliberately does not connect to Paddle, RevenueCat, Appwrite configuration, or any payment provider. `paymentsEnabled=false` and the existing Sandbox-only `_ptxn` helper remain unchanged.

## Files changed

| Area | Files | Purpose |
|---|---|---|
| Appwrite Function | `appwrite-hubs/billing-checkout/src/main.js`, `appwrite-hubs/billing-checkout/package.json`, `appwrite-hubs/billing-checkout/package-lock.json` | Authenticated server boundary, canonical-user resolution, fail-closed gates, session coordination, safe response/error contract, and injectable provider seam. |
| Repository registration | `appwrite.json`, `scripts/appwrite-function-policy.cjs`, `scripts/deploy_hubs.cjs` | Adds an explicit authenticated-user `billing-checkout` target and a future targeted schema hook. No remote Function or schema was created. |
| Additive schema definition | `scripts/setup_billing_checkout_schema.cjs` | Idempotent definitions for server-only `billing_checkout_sessions` and `billing_checkout_locks`. The script was not executed. |
| Tests | `tests/hubs/billing-checkout.test.cjs`, `tests/hubs/appwrite-function-policy.test.cjs` | Focused contract/security coverage and updated manifest count for the intentional new target. |
| Existing QA helper | `src/lib/sandboxPaddleCheckout.ts` | **Unchanged.** |
| Frontend billing gate | `src/lib/billing.ts` | **Unchanged; `paymentsEnabled=false`.** |

The previously untracked Phase 2D-C.1 contract report was preserved and remains uncommitted.

## Function/API contract

The future Function accepts only an authenticated request with `action=create-session`, an exact internal `plan` of `pro` or `premium`, and an optional bounded opaque `idempotency_key`. The canonical Appwrite user is resolved from the Appwrite JWT server context. Browser-supplied `user_id`, `price_id`, `transaction_id`, environment, provider, return URL, and callback/status fields are rejected and are never used for authority.

The server maps the internal plan to server-owned catalog configuration and requires Production environment, an explicit server-backed `BILLING_CHECKOUT_ENABLED=true` kill switch, provider readiness, and a complete allowlisted catalog entry. Missing configuration, Sandbox environment, or missing Production price/product mapping fails closed before provider creation. No Production IDs were invented.

The provider seam is automatic-only and receives `collectionMode=automatic`, the server-selected price/product/entitlement mapping, canonical `app_user_id`, an opaque checkout-session reference, `source=wiseresume-web`, and a fixed return path. The default provider is intentionally unconfigured and cannot call Paddle. Tests inject a mock adapter only.

Successful responses contain only `session_reference`, internal `plan`, `state=created_or_reused`, `expires_at`, and an approved HTTPS checkout URL only when an explicitly approved origin matches. Provider transaction identifiers, raw provider responses, credentials, JWTs, and secrets are not returned. Expected failures use stable safe codes including `unauthorized`, `invalid_plan`, `payments_disabled`, `environment_mismatch`, `catalog_mismatch`, `already_entitled`, `checkout_in_progress`, `idempotency_conflict`, `rate_limited`, and `provider_unavailable`.

Checkout creation never writes `subscriptions`, RevenueCat provider state, the lifecycle ledger, entitlements, credits, or plan access. RevenueCat-to-Appwrite lifecycle ingestion remains the sole authority for paid access.

## Storage, idempotency, concurrency, and rate limits

The additive schema defines two server-only collections with `permissions=[]` and `documentSecurity=false`:

| Collection | Role | Important protections |
|---|---|---|
| `billing_checkout_sessions` | Durable server-owned session and replay record | Unique session key and public reference, user/request-key lookup, environment/price/plan binding, state, expiry, safe error code, and provider references kept server-side. |
| `billing_checkout_locks` | Atomic user-window and user/plan coordination | Unique lock key, one active user/plan session, attempt window, bounded count, expiry, and state. |

The default policy is one active session per user and plan for 15 minutes, a 24-hour same-key replay window, and at most three creation attempts per user in ten minutes. Deterministic request fingerprints never store the raw idempotency key as authority. Same-key different-input requests return `idempotency_conflict`; same-input active requests reuse the server record; terminal/expired replay is not silently reopened. Appwrite transaction-backed unique lock/session creation is used for concurrent requests, with conflict retries rather than an assumption of client-side serialization.

## Kill switch and activation state

`BILLING_CHECKOUT_ENABLED` defaults to false. The Function also requires a server-selected Production environment, valid internal catalog mapping, and provider readiness. No environment variable, Appwrite Function, Appwrite schema, Paddle setting, RevenueCat setting, secret, DNS record, Vercel setting, or deployment was changed. The frontend `paymentsEnabled=false` gate, disabled upgrade cards, and Sandbox `_ptxn` single-transaction allowlist remain intact.

## Security review

Focused tests cover unauthenticated access, exact plan rejection including `free` and public `ultimate`, spoofed user/price/transaction/environment/provider/return inputs, canonical `app_user_id`, Pro/Premium mapping, automatic collection, duplicate and concurrent requests, same-key conflict, active entitlement blocking, rate-limit exhaustion, wrong environment, missing catalog fail-closed behavior, kill switch off, provider output mismatch, approved-origin URL validation, sanitized provider failure, safe response shape, and zero mutation of provider state, legacy subscriptions, entitlements, or credits.

The implementation contains no credential values and does not read or log provider credentials. The prior Paddle Sandbox API-key exposure remains `OWNER_ACCEPTED_UNRESOLVED_RISK` because the owner declined rotation. That warning blocks Production security clearance but does not block this local, non-activating implementation phase.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Focused checkout contract tests | PASS | `node --test tests/hubs/billing-checkout.test.cjs` |
| Existing policy/schema/webhook regression tests | PASS | 18 tests passed, including RevenueCat TEST no-mutation, lifecycle, duplicate/stale protection, resolver, and schema contracts. |
| Full Vitest suite | PASS | 224 files passed, 1 skipped; 1,251 tests passed, 1 todo. |
| JavaScript syntax | PASS | `node --check` passed for Function, schema, deploy helper, and policy files. |
| TypeScript | PASS | `npx tsc --noEmit` passed. |
| ESLint | PASS | `npm run lint` passed. |
| Diff whitespace | PASS | `git diff --check` passed. |
| Secret-pattern/source review | PASS_WITH_WARNINGS | No credential values found in changed files or generated output; only non-secret environment variable names are present. |
| Canonical `npm run build` | BLOCKED_ENVIRONMENT | Vite transformed 5,892 modules, then the sandbox terminated the process at gzip computation on the first attempt; a bounded-heap retry reached a Node heap OOM; a lower-memory Vite retry stalled after transformation and was terminated. Generated `dist` was removed after each attempt. |
| Browser/runtime QA | NOT_RUN | No frontend behavior was changed, no local or deployed checkout was opened, and no provider call was made. |

## Git, deployment, and PR state

Work is uncommitted on local branch `feat/phase2dc2-server-checkout`. No commit, push, PR, merge, Appwrite deployment, schema application, provider mutation, secret change, DNS change, Vercel configuration change, or payment occurred. Production remains disabled and unverified. Because the canonical build is blocked by the sandbox environment, this is not yet a clean `VERIFIED_READY` or PR-open recommendation.

## Remaining Sandbox-to-Production migration work

A future separately authorized phase must validate the Production Paddle catalog and client/server environment separation without inventing identifiers, configure the Production RevenueCat product/offering/entitlement mapping and authenticated webhook, establish monitoring/reconciliation/rollback and support tooling, resolve lifecycle policy for cancellation/expiration/billing issue/refund/chargeback/manual/coupon/trial precedence, and decide the fate of the provisional `_ptxn` helper before activation. It must also complete the English/Arabic, desktop/mobile, light/dark, pending/success/cancel/error/delayed-webhook matrix and re-run the full release gate. The unresolved Sandbox credential warning remains a security blocker.

## Exact next action

Keep this implementation local and unactivated. Resolve the sandbox resource limitation or run the canonical build in a clean CI environment, then repeat the build/no-sourcemap and final diff checks. After that, obtain separate owner authorization for review/commit/PR; do not activate `paymentsEnabled`, apply the schema, deploy the Function, or configure Production as part of this phase.
