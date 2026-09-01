# WiseResume Payments Phase 2C ΓÇö RevenueCat Authorization Mismatch

**Date:** 2026-08-25
**Verdict:** `REVENUECAT_APPWRITE_AUTH_MISMATCH_BLOCKED`
**Scope:** Safe diagnosis and repair of RevenueCat-to-Appwrite webhook authentication. No purchases or lifecycle events were started.

## Confirmed evidence

The latest RevenueCat Dashboard `TEST` reached `revenuecat-webhook`, and the latest Appwrite execution completed with HTTP `401` at `/`. This confirms DNS, TLS, URL routing, and Function reachability. The request is rejected before the TEST acknowledgement branch.

The current webhook source authenticates the `Authorization` bearer value before JSON parsing and before TEST handling. The TEST branch therefore cannot be the cause of this 401. It remains implemented to return HTTP 200 with `test_acknowledged` and `mutated=false` only after authentication succeeds.

Appwrite Function Settings lists `REVENUECAT_WEBHOOK_AUTH_SECRET` as a Function-scoped Secret. The Appwrite Console warned that configuration changes were not live. After owner confirmation, Redeploy was executed for `revenuecat-webhook` only, and deployment `6a8d6bc2c409e5a7aab4` became Active with Node-22, 3.1 MB, and the custom domain attached. No secret value was read or changed.

The existing RevenueCat webhook `WiseResume Appwrite Sandbox` shows a populated but masked Authorization header field, HMAC signing disabled, and `Sandbox only`. No Authorization value was read, copied, logged, or recorded.

| Check | Result |
|---|---|
| Live Function authenticates before TEST | Confirmed |
| Appwrite secret name exists at Function scope | Confirmed |
| Appwrite latest Function settings are live | Confirmed after owner-approved Redeploy |
| Active Appwrite deployment | `6a8d6bc2c409e5a7aab4` |
| RevenueCat Authorization field configured | Confirmed populated and masked |
| Values safely comparable by agent | No; fail-closed boundary |
| Latest live TEST | Reached Appwrite, HTTP 401 Completed |
| Provider-state/ledger mutation | No purchase or lifecycle event started; no mutation performed by this diagnosis |

## Root cause classification

The evidence supports an Authorization mismatch or a provider-side missing/incorrect Authorization header. It does not safely identify which side contains the wrong value because both systems intentionally mask their secret values. The Appwrite-side deployment lag was independently found and repaired, but the post-redeploy 401 means synchronization is still not proven.

## Minimum owner action

Using the protected secret-entry surfaces, synchronize the RevenueCat Authorization header exactly with the Appwrite Function secret, or replace both with the same newly generated Sandbox-only random secret. Do not send either value to the agent. Do not change the webhook URL, DNS, HMAC setting, Paddle, products, offerings, entitlements, checkout, or Production.

After synchronization, send exactly one RevenueCat Dashboard `TEST`. Require Appwrite HTTP 200 and confirm `revenuecat_subscription_state` and `revenuecat_event_ledger` remain unchanged. Only after that gate passes may the fresh QA fixture `6a8d5e4c0029004e93c3` be used for Sandbox lifecycle testing.
