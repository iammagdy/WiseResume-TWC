# WiseResume Payments Phase 2C — Sandbox Lifecycle QA

**Date:** 2026-08-26
**QA fixture:** `6a8d5e4c0029004e93c3`
**Environment:** Paddle Sandbox / RevenueCat Sandbox only
**Final lifecycle classification:** `PASS_WITH_WARNINGS`
**Security classification:** `UNRESOLVED_SECURITY_WARNING`

## Scope and safety boundary

This closeout used the existing non-real QA fixture and performed no payment repetition, entitlement grant, provider configuration mutation, Appwrite mutation, secret change, DNS change, checkout change, billing change, or Production action. The existing completed Paddle Sandbox Pro purchase was reused as evidence.

## Live lifecycle evidence

| Check | Result | Evidence |
|---|---|---|
| Paddle Pro transaction/subscription | **PASS** | Existing Sandbox Pro automatic transaction remains Complete and the monthly subscription remains Active. No new payment was attempted. |
| `app_user_id` association | **PASS** | RevenueCat customer and event history use `6a8d5e4c0029004e93c3` as the customer and app user ID. |
| RevenueCat initial purchase ingestion | **PASS** | One Sandbox `PURCHASES_INITIAL_PURCHASE` event exists for the QA customer, using the approved Pro price and Paddle store. |
| RevenueCat Pro entitlement | **PASS** | Customer has one active Sandbox Pro entitlement through 2026-09-25, with access enabled. |
| Appwrite event ledger | **PASS** | One processed `INITIAL_PURCHASE` row exists for the QA user with outcome `state_updated`. |
| Appwrite provider state | **PASS** | One active Sandbox provider-state row exists with `plan=pro`, `entitlement_id=pro`, the approved Pro price, `will_renew=true`, and the same latest event. |
| Legacy subscription source | **PASS** | The legacy `subscriptions` table displayed eight rows for other users and no row for the canonical QA user. |
| WiseResume effective plan | **PASS** | The active provider-state row is the exact current Pro source; the legacy table is not the source. |
| Pro UI and credits | **PASS** | Arabic RTL dashboard showed Pro and `50 / 50`; Subscription showed Pro, Active, and `0 / 50` daily usage. |
| Persistence | **PASS** | Pro and credit state remained present after navigation from dashboard to Subscription and after waiting for the Subscription page to render. |

The earlier RevenueCat snapshot of zero paid subscribers and no entitlement is now superseded by current read-only data. The reason for the delay is not proven; eventual consistency is only a possible explanation and is not recorded as root cause.

## Repository-controlled protection coverage

The focused repository-controlled tests passed **12/12** after installing the locked dependencies with `npm ci --ignore-scripts`. The tests cover authenticated TEST acknowledgement without mutation, Ultimate normalization without persisting `ultimate`, Pro and premium purchase/renewal, cancellation, billing issue, uncancellation, product change, expiration, duplicate idempotency, stale-event rejection, resolver precedence, and schema contracts.

These lifecycle-transition checks use a deterministic in-process fake store. They are valid implementation/regression evidence but are not live provider-transition evidence.

## Lifecycle checks not safely reproducible live

| Check | Status | Reason |
|---|---|---|
| Duplicate replay against live Appwrite | **UNVERIFIED** | No live event replay was sent; repository test passes. |
| Stale/out-of-order live event | **UNVERIFIED** | No fabricated or manually injected live event was used; repository test passes. |
| Cancellation and `will_renew=false` live transition | **UNVERIFIED** | No provider mutation or cancellation action was performed. Current live state remains active with `will_renew=true`. |
| Access-until-expiration live behavior | **UNVERIFIED** | The active subscription has not expired and no clock/event mutation was introduced. |
| Billing issue live transition | **UNVERIFIED** | No live billing failure was induced; repository test passes. |
| Expiration live transition | **UNVERIFIED** | Expiration is future-dated and no provider event was fabricated; repository test passes. |
| Ultimate -> RevenueCat premium -> internal premium live transition | **UNVERIFIED** | No second purchase or manual entitlement grant was allowed. |
| Ultimate public label / internal persistence | **PASS (repository/catalog contract); live transition UNVERIFIED** | Repository tests normalize `ultimate` defensively to internal `premium` and reject `ultimate` as a persisted entitlement value. RevenueCat catalog contains the active monthly Ultimate/Premium SKU mapping, but no live Ultimate customer state was created. |
| Free-plan browser case | **UNVERIFIED** | No authorized Free fixture was used in this closeout. |

## Current Pro/Ultimate mapping

The active RevenueCat Sandbox catalog contains the approved monthly Pro SKU and the approved monthly Ultimate/Premium SKU. The application contract remains **Pro → internal `pro`** and **Ultimate public label → internal `premium`**. The string `ultimate` must not be persisted. The live QA customer is Pro only; no live Ultimate entitlement exists.

## Security warning — separate from lifecycle status

A prior RevenueCat app-list response exposed plaintext Paddle Sandbox API-key fields. The values were not copied, stored, printed, reread, or included in this report. The owner explicitly declined rotation. This remains an unresolved security warning, and this lifecycle closeout must not be classified as fully secure. No further credential-bearing provider view/API was opened after that warning was recorded.

## Final classification and next work

Lifecycle status is **PASS_WITH_WARNINGS**: the completed Pro path is now verified end-to-end through Paddle Sandbox, RevenueCat, Appwrite ledger/provider state, WiseResume effective plan, UI credits, and persistence. Transition-specific live checks and Ultimate live activation remain unverified because performing them would require prohibited provider mutation or another payment.

The remaining work is to retain the security warning as unresolved, and—if the owner later authorizes safe non-credential provider operations—to verify live transition behavior through an approved test mechanism or wait for naturally occurring Sandbox lifecycle events. No additional payment or entitlement grant should be performed for the current fixture.
