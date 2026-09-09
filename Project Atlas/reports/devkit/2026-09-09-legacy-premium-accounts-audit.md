# Read-Only Legacy Premium / Ultimate Accounts Audit Report

**Date:** 2026-09-09  
**Type:** Read-Only Runtime Audit (Zero Mutations Allowed)  
**Corpus:** WiseResume Production Appwrite Datastore  
**Authority:** Phase 4 — DevKit Billing & Entitlements 2026 Refresh  
**Execution Run:** GitHub Actions Run `34379162192` (Ref `feat/devkit-billing-entitlements-refresh`)  

---

## 1. Executive Summary

- **Total Appwrite Auth Users:** 68
- **Effective Plan Breakdown:**
  - Free: 60
  - Pro: 1
  - Ultimate (internal `premium`): 7
- **Provider & Access Distribution:**
  - Manual Admin Grants Only: 8
  - Whop Subscribers: 2
  - PayPal Subscribers: 0
  - RevenueCat Subscribers: 4
  - Active Trials: 0
  - Active Coupons: 0
  - Multi-Source Entitlements: 0
  - Accounts Requiring Review: 0

---

## 2. Category Breakdown (Accounts Touching Premium / Ultimate)

Total accounts touching `premium` / `ultimate` across any datastore: **10**

| Category | Count | Description |
|---|---|---|
| `MANUAL_ULTIMATE_ONLY` | 7 | Manually granted Ultimate in `subscriptions` with no active provider subscription |
| `MANUAL_ULTIMATE_PLUS_PROVIDER` | 0 | Manual Ultimate combined with active provider subscription |
| `PROVIDER_ULTIMATE_ONLY` | 0 | Active Ultimate subscription via Whop, PayPal, or RevenueCat |
| `TRIAL_ULTIMATE` | 0 | Active trial granting Ultimate |
| `COUPON_ULTIMATE` | 0 | Active promotional coupon granting Ultimate |
| `MULTI_SOURCE_ENTITLEMENT` | 0 | Multiple concurrent entitlement sources |
| `LEGACY_PROVIDER_ENTITLEMENT` | 0 | Grandfathered RevenueCat or legacy payment record |
| `STALE_OR_SUSPICIOUS` | 0 | Expired/canceled provider with lingering stale profile data |
| `FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL` | 3 | Legacy row with past premium flag but resolver yields Free |
| `UNKNOWN` | 0 | Unclassified state |

---

## 3. Account Inventory (Masked Identifiers)

| User ID | Email | Category | Effective Plan | Access Source | Stored Plan | Whop State | PayPal State |
|---|---|---|---|---|---|---|---|
| `u_69f***7cd7` | `ma***r@ou***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `premium` | — | — |
| `u_6a0***7f37` | `am***4@gm***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `free` | — | — |
| `u_6a0***b45a` | `ab***5@gm***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `free` | — | — |
| `u_6a1***21d9` | `ma***1@ou***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `free` | — | — |
| `u_6a1***7246` | `ha***2@gm***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `free` | — | — |
| `u_6a3***0165` | `pr***m@te***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `free` | — | — |
| `u_6a7***3f05` | `mo***9@gm***.com` | `MANUAL_ULTIMATE_ONLY` | **premium** | manual/admin | `premium` | — | — |
| `u_6a8***92cb` | `ia***r@ou***.com` | `FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL` | **free** | free | `free` | — | — |
| `u_6a9***b7d0` | `qa***7@di***.wiseresume.internal` | `FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL` | **free** | free | `free` | — | — |
| `u_qa_***725e` | `qa***e@te***.wiseresume.app` | `FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL` | **free** | free | `free` | pro (active) | premium (canceled) |

---

## 4. Anomalies & Provider Inconsistencies (Reclassified)

Detected Datastore Patterns: **6** (0 Requiring Immediate Manual Intervention)

| User ID | Provider | Stored Plan | Effective Plan | Classification | Detailed Root Cause Analysis | Action Required |
|---|---|---|---|---|---|---|
| `u_6a8***93c3` | RevenueCat | `free` | `free` | `LEGACY_MOBILE_STATE` | Grandfathered mobile record from 2025 development. Expiration timestamp is past / unrenewed; shared resolver correctly resolves effective access to Free. | None (Historical read-only record) |
| `u_6a8***92cb` | RevenueCat | `free` | `free` | `LEGACY_MOBILE_STATE` | Grandfathered mobile record from 2025 development. Expiration timestamp is past; shared resolver correctly resolves effective access to Free. | None (Historical read-only record) |
| `u_6a9***e4d6` | RevenueCat | `free` | `free` | `LEGACY_MOBILE_STATE` | Grandfathered mobile record from 2025 development. Expiration timestamp is past; shared resolver correctly resolves effective access to Free. | None (Historical read-only record) |
| `u_6a9***b7d0` | RevenueCat | `free` | `free` | `LEGACY_MOBILE_STATE` | Grandfathered mobile record from 2025 development. Expiration timestamp is past; shared resolver correctly resolves effective access to Free. | None (Historical read-only record) |
| `u_qa_***725e` | Whop | `free` | `free` | `SANDBOX_QA_GATED` | Internal QA test account with Sandbox Whop record. User ID does not match configured `WHOP_SANDBOX_QA_USER_ID`; shared resolver correctly enforces the Sandbox QA security boundary and rejects candidate. | None (Working as intended) |
| `u_6aa***ec13` | Whop | `free` | `free` | `EXPECTED_ENVIRONMENT_ISOLATION` | Designated Whop Sandbox QA user (`debeg50114@fidhost.com`). In default Production environment audit mode, Sandbox provider records are fail-closed ignored (yielding Free). When evaluated in Sandbox QA mode, resolves to Pro. | None (Working as intended) |

### Architecture Context & Reconciliation:
1. **Expected Architecture (`profiles.plan = 'free'`):** In WiseResume's multi-provider architecture, the `profiles` collection stores initial signup profile metadata (`plan: free`). Provider subscription lifecycles are written exclusively to dedicated provider collections (`whop_subscription_state`, `paypal_subscription_state`, `revenuecat_subscription_state`). A user having `profiles.plan: free` while holding provider documents is normal and expected architecture, not a data defect.
2. **Authoritative Resolution:** The DevKit billing intelligence refresh incorporates the shared resolver (`buildPlanCandidates`), correctly evaluating environment matching, expiration timestamps, and Sandbox QA user gating.
3. **Accounts Requiring Immediate Manual Review: 0.** None of these 6 accounts require manual data modification or intervention. All behavior conforms to expected architecture, sandbox gating, and legacy lifecycle boundaries.

- Duplicate Provider Documents: **0**
- Orphaned Provider Documents: **0**

---

## 5. Verification of Zero Data Mutations

- Appwrite mutations performed: **0** (ZERO)
- Operations executed: Read-only queries (`users.list`, `databases.listDocuments`)
- Integrity Verdict: **ENTITLEMENT_DATA_MUTATION = NONE**
