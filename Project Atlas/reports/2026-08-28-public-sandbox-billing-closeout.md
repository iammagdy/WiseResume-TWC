# WiseResume Payments Phase 2D — Public Sandbox Billing Implementation Closeout

**Date:** 2026-08-28
**Author:** Manus AI
**Repository:** `iammagdy/WiseResume-TWC`
**Branch:** `feat/public-sandbox-billing`
**Status:** `SANDBOX_IMPLEMENTATION_READY_PROVIDER_CREDENTIAL_BLOCKED`

## Verdict

The non-credential-dependent public Sandbox billing implementation is complete locally and is ready for normal review. The server boundary now supports an explicitly selected `sandbox` or future `production` mode, uses separate environment-scoped catalog variable names, validates automatic Paddle transaction responses, and remains fail-closed by default. The frontend has bilingual Sandbox/Test Mode disclosure and an authenticated server-checkout client that never grants access locally.

Real Paddle Sandbox transaction creation, checkout completion, upgrade, cancellation, and lifecycle verification remain blocked because **no safe server Paddle credential is authorized for use**. No provider-authenticated request was made in this phase. Production billing remains disabled.

## Scope completed

The checkout Function now accepts a trusted `BILLING_CHECKOUT_ENVIRONMENT` value of `sandbox` or `production`, with an empty or malformed mode rejected before checkout. Sandbox and future Production catalogs are read from distinct variable families (`BILLING_SANDBOX_*` and `BILLING_PRODUCTION_*`), and a catalog-mode mismatch fails closed. The existing `BILLING_CHECKOUT_ENABLED` and `BILLING_CHECKOUT_PROVIDER_READY` gates remain required, so the default and current safe posture is disabled.

A server-only `PaddleAutomaticProvider` adapter was added. It selects the API origin from the trusted server mode, sends only the server-selected price/product context and canonical Appwrite user metadata, requires automatic collection, and validates the returned transaction, item, product, custom data, environment when supplied, and checkout URL shape. It returns only a safe opaque checkout reference plus an approved HTTPS checkout URL. It never returns raw provider payloads or credential values.

The shared effective-plan resolver now requires an explicit trusted provider environment and a matching persisted provider-state environment. Unknown mode and Sandbox-to-Production mismatch ignore the provider candidate while preserving manual/admin, coupon, active-trial, and Free precedence. Coupons, AI plan enforcement, admin read-only plan reporting, checkout entitlement checks, and webhook effective-plan reporting use the same resolver contract.

Pricing and Subscription now expose a clear `Sandbox / Test Mode` and `No real charge` disclosure in English and Arabic. Authenticated upgrade actions call only the `billing-checkout` Function with `{ action, plan, idempotency_key }`; they do not send user, price, product, transaction, environment, or provider authority. The UI displays safe preparing, pending, unavailable, and error states, persists only the selected internal plan for reconciliation polling, and never changes plan or credits locally. Public `premium` remains the internal value for the public Ultimate label; `ultimate` is not accepted by the server checkout contract.

## Files changed

The implementation changes are limited to the billing boundary and its shared consumers/tests: the checkout Function, shared resolver, resolver consumers, typed frontend checkout client, billing mode descriptor, Pricing and Subscription UI, English/Arabic catalog copy, Appwrite deploy-helper safety hooks, source-hash manifest, PR validation workflow, and focused tests. The historical Sandbox `_ptxn` helper and its exact QA allowlist were not changed and are not used by the normal public checkout architecture.

## Validation evidence

The focused billing-checkout CommonJS suite passed, including strict authentication/request validation, catalog and environment fail-closed behavior, provider hardening, idempotency, concurrency, rate limits, safe outputs, authoritative-read failures, and non-mutation. The RevenueCat webhook and schema suites passed, including the new Sandbox-to-Production resolver isolation assertions. The frontend checkout-client Vitest suite passed three tests covering request shape, disabled error mapping, and malformed success rejection.

`node --check` passed for all changed JavaScript files. `npx tsc --noEmit`, `npm run lint`, `npm run test:i18n`, full Vitest, `git diff --check`, and the production build/no-sourcemap guard passed locally. The full Vitest result was 225 files passed with one skipped file, 1,254 tests passed, one todo, and no failed tests. Existing advisory Vite large-chunk warnings remain. A prior build attempt was terminated during temporary sandbox memory pressure; the retry passed after the local dev process was stopped.

Local HTTP verification confirmed the isolated Vite server returned HTTP 200 for `/pricing`. Connected-browser verification was not completed because the browser channel returned `Could not establish connection`; no provider checkout or live-domain mutation was attempted.

## Deployment and provider boundary

No Appwrite schema was applied and no Appwrite Function was deployed in this phase because the local deployment environment did not contain an Appwrite deployment credential and the approved provider credential was unavailable. No provider configuration, secret, Paddle product/price, RevenueCat app, webhook, DNS record, Vercel setting, transaction, payment, entitlement, or lifecycle state was changed.

The target-only deployment workflow remains the approved path for a later `billing-checkout` deployment. It must run with `BILLING_CHECKOUT_ENABLED=false`, `BILLING_CHECKOUT_PROVIDER_READY=false`, explicit `BILLING_CHECKOUT_ENVIRONMENT=sandbox`, a matching approved origin, and a separately authorized safe server credential before any provider-authenticated execution. The server adapter is intentionally unusable while the provider credential is absent.

The existing RevenueCat-to-Appwrite webhook remains authoritative for provider state and entitlement activation. Browser success, checkout return, session creation, and frontend polling do not grant plan access, credits, subscription state, or ledger records.

## Security warning and blocker

`SECURITY_INCIDENT_SECRET_EXPOSURE` remains unresolved: a prior RevenueCat inventory response exposed plaintext Paddle Sandbox API-key fields. The values were not copied, stored, printed, hashed, compared, configured, or used in this phase. The owner declined rotation, and this report does not request or recommend credential rotation. The incident remains an unresolved owner-accepted security warning and is not a Production approval.

The exact provider-only blocker is: **real Paddle Sandbox transaction execution is blocked because no safe server credential is authorized for use**. Production billing remains disabled and unverified.

## Required next action

Review and merge the scoped implementation through the normal repository workflow if CI remains green. After merge, a separate owner-authorized operations phase may apply the additive server-only schema and deploy exactly `billing-checkout` with the kill switch off, without configuring or reading any Paddle credential. Real Sandbox checkout and lifecycle execution must remain stopped until a safe server credential is separately authorized without reopening the exposed credential-bearing provider path.
