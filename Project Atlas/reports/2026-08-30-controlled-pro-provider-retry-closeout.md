# Controlled Pro Sandbox Provider Retry Closeout

**Date:** 2026-08-30
**Verdict:** `CONTROLLED_PRO_PROVIDER_RETRY_FAILED_DIAGNOSTIC_CAPTURED`
**Scope:** Documentation and operational handover only after one owner-authorized Sandbox Pro checkout attempt.
**Production billing:** `DISABLED`

## Authoritative architecture

WiseResume access remains server-owned:

`Paddle Sandbox -> RevenueCat Sandbox v2 -> Appwrite lifecycle/provider state -> WiseResume effective access`

The browser is never authority for paid access. Public **Ultimate** maps only to internal `premium`; `ultimate` must never be persisted.

## Confirmed runtime and attempt outcome

* The controlled Pro attempt used the normal server-owned checkout path and returned public HTTP 502 / `provider_unavailable` from billing-checkout execution `6a93dcaa587cdb0efd02`.
* The checkout session and plan lock both ended `failed`.
* No provider transaction identifier or checkout reference was persisted.
* A read-only Paddle Sandbox history reconciliation found **no matching transaction**. The provider was not proven to have created a transaction.
* RevenueCat Sandbox v2 lifecycle ingestion was not reached by proven evidence.
* No Appwrite RevenueCat ledger/provider-state mutation, entitlement mutation, or credit mutation was observed.
* The fresh disposable QA account remained Free and did not receive Pro or 50 daily AI credits.

This attempt is **not** checkout, payment, provider, entitlement, or lifecycle success.

## Current safe rollback state

* Checkout was disabled before inspection of the failure.
* Targeted GitHub workflow: `33299540541`.
* Target: exactly `billing-checkout`.
* Active Appwrite deployment: `6a93dd370196ff28cf48`.
* Runtime: Node-22 / Active.
* Current gate: `BILLING_CHECKOUT_ENABLED=false`.
* Production billing remains disabled.
* No secret was read, displayed, copied, logged, hashed, compared, or changed.
* No Paddle or RevenueCat configuration, catalog, entitlement, or provider state was manually changed.
* No Appwrite schema, collection/document permission, or Function scope changed in this closeout.

## Previously confirmed remediation retained

* `billing-checkout` has exactly these dynamic API-key scopes: `databases.write`, `documents.read`, `documents.write`.
* The Appwrite transaction TTL defect is fixed with `CHECKOUT_TRANSACTION_TTL_SECONDS = 60` (product PR #233 merge `9a8b4e96de41eaeaed85667591734573ad54205a`).
* Sanitized provider-boundary diagnostics are merged in PR #236 at `7c0f8f550e8201d7c1827361f76dbcf7d25a2983`.
* The diagnostic schema permits only these stages: `provider.runtime_configuration`, `provider.transport`, `provider.http_response`, `provider.response_json`, `provider.transaction_validation`, `provider.safe_result_validation`, and `provider.persist_complete`.
* `appwrite.json` does not declare the live billing-checkout scopes; the current deployment helper preserves live scopes. Repository-controlled declaration is a separately reviewed drift-prevention follow-up, not part of this closeout.

## Current blocker and exact next task

**Blocker:** `UNPROVEN` provider-boundary root cause.

The diagnostic runtime is deployed, but the fixed, allowlisted diagnostic line for execution `6a93dcaa587cdb0efd02` was not safely retrievable through the current Console view. HTTP 502 alone cannot identify the cause.

The next agent must perform a **strictly read-only** retrieval for the existing execution from `billing-checkout` and report only:

* diagnostic stage;
* diagnostic category;
* optional safe numeric provider status;
* execution status;
* response status code; and
* deployment ID, if available.

Do not retrieve raw errors/logs, request/response payloads, headers, cookies, user identifiers, provider data, credentials, API keys, JWTs, or secrets. Do not enable checkout and do not retry before this diagnostic is interpreted.

## Git handover boundary

The closeout documentation is maintained on `codex/billing-diagnostic-closeout`. It is a documentation/continuation branch and is behind current `origin/main`; it must remain available remotely but must not be used as the base for new product code. A future runtime agent should start from a clean isolated worktree at `origin/main`, then read this report from the preserved documentation branch before work.

Open documentation PRs must remain untouched during the next diagnostic task, including PR #235.
