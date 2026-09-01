# WiseResume Payments Phase 2C ΓÇö Paddle Sandbox Lifecycle Blocked

**Date:** 2026-08-25
**Author:** Manus AI
**Verdict:** `PADDLE_SANDBOX_LIFECYCLE_BLOCKED_DEFAULT_PAYMENT_LINK`

## Executive result

The RevenueCat-to-Appwrite TEST transport gate and live zero-mutation gate passed. The continuation then used the existing isolated WiseResume QA fixture `6a8d5e4c0029004e93c3` and a non-real Paddle Sandbox customer. A Pro subscription form was prepared with the canonical `app_user_id` mapping, reviewed, and submitted once after owner confirmation. Paddle rejected creation because the Sandbox account has no default payment link. No transaction, payment, subscription, or invoice was created, so the requested downstream lifecycle checks remain `UNVERIFIED`.

> PaddleΓÇÖs live response was: ΓÇ£Cannot create a transaction or open a checkout as no default payment link has been set for this account. Set in the Paddle dashboard, then try again.ΓÇ¥

## Scope and safety boundary

This session was restricted to Paddle Sandbox and the existing isolated QA fixture. No Production payment, real customer, real billing data, frontend checkout activation, DNS change, secret change, RevenueCat product/offering/entitlement change, webhook duplication, Appwrite document mutation, or unrelated deployment was performed. The only provider-side mutations in this continuation were creation of the non-real Paddle QA customer and its synthetic address. No payment instrument or real address was used.

The final `Send invoice` action was executed exactly once after explicit owner confirmation. Paddle rejected the action before creating provider billing state. The error was not retried, and no default payment link was created because that would be a checkout/provider configuration change outside the authorized boundaries.

## Verified pre-submit form

The Paddle review screen showed the approved Pro catalog item and no Ultimate item. Custom Data was populated with key `app_user_id` and the canonical Appwrite fixture ID. The reviewed invoice was configured as a monthly invoice subscription for quantity one.

| Field | Observed value |
|---|---|
| Provider environment | Paddle Sandbox |
| Customer | `WiseResume Sandbox Lifecycle QA` non-real QA customer |
| Product | `WiseResume Pro` |
| Price | `$5.00/Monthly` |
| Trial | `No trial` |
| Quantity | `1` |
| First payment | `$5.44` including `$0.44` tax |
| Recurring amount | `$5.44/Monthly` including tax |
| Payment method | `Invoice` |
| Payment due | Within `14 days` |
| Custom Data key | `app_user_id` |
| Custom Data value | Canonical fixture ID `6a8d5e4c0029004e93c3` |

The form initially required invoice address region/state. That validation was resolved with synthetic address data: country selector `United States`, region/state `New York`, postal code `10001`, and the pre-existing synthetic street/city values. Paddle confirmed the address update. This was not real customer or billing data.

## Final provider result

The owner-confirmed `Send invoice` action did not create a transaction. The review drawer displayed the error `There was an error creating the transaction`, together with the explicit reason that no default payment link had been set for the account. This is a provider-path configuration blocker, not a verified RevenueCat webhook, Appwrite state, resolver, or UI mismatch.

The RevenueCat custom App User ID mapping was verified as representable in the direct Paddle form through its Custom Data key/value fields, but no provider event was emitted because Paddle rejected creation. Mapping downstream behavior is therefore not claimed.

## Lifecycle verification matrix

| Requested check | Result | Evidence boundary |
|---|---|---|
| Paddle Sandbox Pro transaction/subscription creation | `BLOCKED` | Paddle rejected final creation because no default payment link exists. |
| RevenueCat canonical App User ID mapping | `UNVERIFIED_DOWNSTREAM` | The direct form accepted the mapping fields, but no transaction/event was created. |
| RevenueCat entitlement `pro` | `UNVERIFIED` | No purchase reached RevenueCat. |
| Appwrite provider state `pro` | `UNVERIFIED` | No lifecycle event reached the webhook. |
| Appwrite ledger INITIAL_PURCHASE | `UNVERIFIED` | No lifecycle event or ledger document was created. |
| Effective WiseResume plan and 50-credit UI | `UNVERIFIED` | No Pro entitlement was activated. |
| Refresh/reopen persistence | `UNVERIFIED` | No subscription state existed to persist. |
| Native retry/idempotency | `NOT ATTEMPTED` | No provider transaction existed to retry. |
| Stale-event protection | `NOT ATTEMPTED` | No safely reproducible provider ordering condition existed. |
| Cancellation, billing issue, expiration | `NOT ATTEMPTED` | No subscription existed. |
| Ultimate ΓåÆ internal `premium` / public Ultimate | `NOT ATTEMPTED` | No approved second purchase path exists in this session. |

No state was fabricated by manually writing Appwrite documents or by sending synthetic signed lifecycle events.

## Transport and zero-mutation evidence carried forward

The existing main deployment and TEST gate remain verified:

| Check | Evidence |
|---|---|
| Main merge | PR #213 merged normally as `0cc8be6b5259affaf727caca5ef41e855e51bb03`. |
| Targeted deployment | Workflow `32839372922`, target `revenuecat-webhook` only. |
| Active Appwrite deployment | `6a8d740594c7a05b505f`, Node-22, 3.1 MB, custom domain attached. |
| RevenueCat TEST execution | `6a8d74943ccbc8e0b20a`, POST `/`, HTTP `200`, `Completed`, sanitized log `TEST -> acknowledged`. |
| Regression coverage | Focused webhook suite passed `14/14`. |
| Live collection checks | Read-only Appwrite UI showed `You have no rows yet` for both `main.revenuecat_event_ledger` and `main.revenuecat_subscription_state`. No document was opened, created, edited, or deleted. |

## Follow-up retry after reported default-link configuration

The owner subsequently reported that the Paddle Sandbox default payment link had been configured. A fresh Pro-only transaction form was opened for the same existing QA customer. The form again used `WiseResume Pro`, the approved `$5.00/Monthly` price, quantity `1`, invoice payment, the existing synthetic address, and Custom Data key `app_user_id` mapped to fixture `6a8d5e4c0029004e93c3`. The review showed `$5.44` first payment including `$0.44` tax and `$5.44/Monthly` including tax.

After the ownerΓÇÖs instruction to retry the Pro Sandbox lifecycle, the final `Send invoice` action was attempted exactly once on this fresh mapped form. Paddle still returned the same explicit error: `Cannot create a transaction or open a checkout as no default payment link has been set for this account. Set in the paddle dashboard, then try again.` The UI also showed `There was an error creating the transaction`. No transaction, payment, subscription, or invoice was created. No further retry was made, and no provider configuration was changed by this session.

This updates the blocker from an initial missing-link stop to a **persistent provider mismatch**: the dashboard configuration reported by the owner is not recognized by the Sandbox transaction path used in the authenticated session. This is not evidence of a RevenueCat or Appwrite lifecycle mismatch because no provider event was created.

## Exact next action

`OWNER_ACTION_REQUIRED` to independently verify that the default payment link is configured on the same Paddle Sandbox account/environment used by the transaction form, or to provide an existing approved purchase path that preserves the canonical `app_user_id` mapping. Under the current task boundaries, do not change RevenueCat configuration, secrets, DNS, Production, frontend checkout, or retry the transaction again until the Paddle mismatch is resolved.

## Repository and documentation state

This report is additive documentation only. No application code, Appwrite function, schema, permission, secret, provider configuration, frontend checkout, DNS record, or deployment was changed. The handover, current-state snapshot, and changelog were updated to reflect the verified zero-row TEST result and the final Paddle blocker. Scratch evidence outside the repository was not copied into Atlas and contains no intended secret values.

## References

[1]: https://sandbox-vendors.paddle.com/transactions-v2 Paddle Sandbox Transactions ΓÇö live QA transaction form and review result.
[2]: https://wiseresume.app WiseResume ΓÇö production application; checkout remains disabled/Coming Soon.
