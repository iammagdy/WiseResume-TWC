# WiseResume Payments Phase 2B — Coupon Schema Index Compatibility Report

**Date:** 2026-08-23
**Status:** `COUPON_SCHEMA_BLOCKER_RESOLVED`
**Repository:** `iammagdy/WiseResume-TWC`
**Branch:** `fix/coupon-schema-index-compat`
**Baseline:** `8e84f84bc6eb5a12719e8cc2385baa7650260224` (`origin/main`)
**Scope:** Minimal repository/schema compatibility correction and live coupon-schema verification only.

## Verdict

The Phase 2B deployment blocker was reproduced, proven, and resolved without deploying any Appwrite Function or configuring RevenueCat. The failed composite unique index attempted to use the live `coupon_redemptions.user_id` string attribute, whose existing size is `65000`, together with `discount_code_id` size `64`. At four bytes per character, the expected indexed width is `(65000 + 64) × 4 = 260256` bytes, which exceeds Appwrite's 767-byte index limit. The setup now creates a non-unique `discount_code_idx` on `discount_code_id`; redemption uniqueness remains enforced by the existing deterministic document ID and transaction flow in the coupons hub.

## 1. Confirmed failing index

The failing definition was:

```text
collection: coupon_redemptions
key: user_coupon_unique
type: unique
attributes: user_id, discount_code_id
order: default ascending
```

The live field contract was `user_id: string size 65000` and `discount_code_id: string size 64`. The 4-byte-per-character index-width calculation is `260256` bytes, above the Appwrite maximum of `767`. The failed workflow log confirms that the error occurred when creating this index, after the attribute steps completed.

## 2. Partial live schema state

The failed run left an additive intermediate state. The workflow log proves that `discount_codes.code`, `active`, `percent_off`, and `expires_at` existed before the run; `coupon_redemptions.user_id` existed before the run. The same log proves that the run created the missing additive attributes `discount_type`, `discount_value`, `plan_override`, `plan_days`, `max_uses`, and `uses_count` on `discount_codes`, plus `coupon_code`, `discount_code_id`, `status`, and `redeemed_at` on `coupon_redemptions`, before stopping at the index.

The sanitized post-fix live inspection confirmed the following current metadata. No coupon values, codes, user PII, or customer documents were read.

| Collection | Current live result |
|---|---|
| `discount_codes` | `permissions=[]`; `documentSecurity=false`; document total `1`; all expected attributes are available; unique indexes `idx_discount_codes_code` and `code_unique` are available. |
| `coupon_redemptions` | `permissions=[]`; `documentSecurity=false`; document total `1`; `user_id` is the existing string size `65000` and optional; `coupon_code` is required string size `64`; `discount_code_id` is required string size `64`; `status` is required string size `32`; `redeemed_at` is required datetime; no composite unique index remained. |
| Corrected index | `discount_code_idx`, type `key`, attribute `discount_code_id`, status `available`. |

The setup script has no document create, update, or delete calls. The current document total is `1` for each collection; exact pre-failure totals are not available, but no document mutation operation was present in either the failed or corrected setup path. Permissions and document-security settings remained server-only.

## 3. Minimal fix

The repository setup definition no longer attempts `user_coupon_unique`. It creates the Appwrite-compatible non-unique `discount_code_idx` only when absent and retains the existing unique `code_unique` index. The fix does not delete or recreate collections, delete attributes, shrink field sizes, drop a working index, broaden permissions, or alter stored data.

Coupon semantics remain unchanged. `appwrite-hubs/coupons/src/main.js` creates redemptions with the deterministic ID `cr_<sha256(user_id:coupon_id)>`, checks that ID first, retains a backward-compatible fallback query on `user_id`, `discount_code_id`, and redeemed status, and performs redemption, subscription update, and usage increment inside the existing transaction flow. The supported redeemable plans remain `pro|premium` and the 365-day maximum remains unchanged.

## 4. Validation

The focused validation passed:

| Check | Result |
|---|---|
| Coupon schema compatibility tests | 3 passed |
| Coupon security tests | Passed |
| Atomic redemption tests | Passed |
| Admin coupon-authoring tests | Passed |
| `node --check scripts/setup_discount_codes_schema.cjs` | Passed |
| `git diff --check` | Passed |
| Corrected live setup rerun | Completed successfully and created `discount_code_idx` |
| Sanitized live verification | Confirmed expected attributes, index, permissions, document security, and counts |

## 5. Git and deployment state

The Phase 2B workflow run `32656801892` deployed zero Functions and remains the historical failed attempt. No Phase 2B deployment was retried. The fix was committed as `ccd1c44`, pushed on `fix/coupon-schema-index-compat`, and merged through PR [#205](https://github.com/iammagdy/WiseResume-TWC/pull/205) at `2026-08-23T18:18:09Z` with merge commit `c7e4dc4e9ea8e7dc15bbf0b6cd8fc5e12d404870`. `origin/main` contains the fix.

No RevenueCat webhook was created. No Appwrite webhook secret was configured. Paddle, Vercel, checkout, payment activation, AI credits, user subscriptions, and Production data were not changed.

## 6. Exact next action

The focused fix PR #205 has merged and `origin/main` contains the correction. Stop this task. A separately authorized Phase 2B deployment may later retry the four proven Function targets. Do not bypass the coupon schema hook, use `target=all`, deploy from the Appwrite Console, create the RevenueCat webhook, or configure secrets in this task.

COUPON_SCHEMA_BLOCKER_RESOLVED
