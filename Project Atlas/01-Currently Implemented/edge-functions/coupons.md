# coupons

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/coupons/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md`

---

## What it does

Consolidated router for the 3 coupon edge functions. Replaces (3 → 1):

| `x-coupons-action` header | Was | Auth | Purpose |
|---|---|---|---|
| `admin-manage` | `admin-manage-coupons` | `requireAdminAuth` | List, create, update, delete entries in `discount_codes` |
| `redeem` | `redeem-coupon` | `requireAuth` | Apply a coupon to the current user → updates `subscriptions.plan_name`, records in `coupon_redemptions` |
| `validate` | `validate-coupon` | `requireAuth` | Check whether a code is currently redeemable for the caller (returns `valid:true/false` envelope) |

## Dispatch

**Header-only:** `x-coupons-action` is required. The router never reads the body itself — each handler keeps its original parse-vs-auth ordering and error envelope (`success:false` vs `valid:false`) verbatim.

## DB tables

- `discount_codes` — source of truth for coupon configuration
- `coupon_redemptions` — per-user redemption history
- `subscriptions` — plan upgrade target

## Plan tier helper

Inline `effectivePlan(planName, trialPlan, trialExpiresAt)` resolves the user's active plan considering an unexpired trial. PLAN_TIER ordering: `free=0, pro=1, premium=2`.
