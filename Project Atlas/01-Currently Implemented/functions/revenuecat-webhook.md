# revenuecat-webhook

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/revenuecat-webhook/index.ts`

---

## What it does

RevenueCat → WiseResume entitlement reconciliation webhook. RevenueCat is the source of truth for in-app purchases on the Expo mobile app; this endpoint is registered as a RevenueCat webhook target.

**Method:** POST only (405 otherwise)
**Auth:** Shared secret `REVENUECAT_WEBHOOK_AUTH_TOKEN` sent by RevenueCat verbatim in the `Authorization` header. Returns 403 if missing/mismatched.

## User matching

By `event.app_user_id`, which the mobile client sets to the WiseResume bridge `user_id` at purchase time.

## Event handling

| RevenueCat event | Effect |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `TRANSFER` | Set `subscriptions.plan_name` from product id (`/premium/i` → premium, `/pro/i` → pro, else free), `status = 'active'` |
| `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE` | Downgrade to `plan_name = 'free'`, `status = 'cancelled'` |
| `PRODUCT_CHANGE` | Re-derive plan from new `product_id` |
| `SUBSCRIBER_ALIAS` | Treated as downgrade in current implementation (see source) |

## DB tables

- `subscriptions` — upsert by `user_id`; columns set: `plan_name, status, provider='revenuecat', provider_subscription_id, current_period_end, plan_updated_at`
- (`billing_events` may be appended past line 100 — see source)

## Plan mapping

`mapProductToPlan(productId)`: regex match `/premium/i` → `premium`, `/pro/i` → `pro`, default → `free`.
