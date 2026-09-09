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

## 4. Anomalies & Provider Inconsistencies

Detected Anomalies: **6**

- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_6a8***93c3","storedPlan":"free","effectivePlan":"free","provider":"revenuecat"}`
- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_6a8***92cb","storedPlan":"free","effectivePlan":"free","provider":"revenuecat"}`
- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_6a9***e4d6","storedPlan":"free","effectivePlan":"free","provider":"revenuecat"}`
- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_6a9***b7d0","storedPlan":"free","effectivePlan":"free","provider":"revenuecat"}`
- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_qa_***725e","storedPlan":"free","effectivePlan":"free","provider":"whop"}`
- **[ACTIVE_PROVIDER_BUT_STORED_FREE]**: `{"userId":"u_6aa***ec13","storedPlan":"free","effectivePlan":"free","provider":"whop"}`

*Note: The `ACTIVE_PROVIDER_BUT_STORED_FREE` pattern occurs because the `profiles` collection only records the initial profile `plan: free`, while payment webhook state is stored in provider collections (`whop_subscription_state`, `revenuecat_subscription_state`). Prior to this DevKit refresh, the Admin Users panel read only `profiles` and `subscriptions`, showing these active paying users as Free. The 2026 DevKit billing intelligence refresh solves this by incorporating the authoritative multi-provider resolver.*

- Duplicate Provider Documents: **0**
- Orphaned Provider Documents: **0**

---

## 5. Verification of Zero Data Mutations

- Appwrite mutations performed: **0** (ZERO)
- Operations executed: Read-only queries (`users.list`, `databases.listDocuments`)
- Integrity Verdict: **ENTITLEMENT_DATA_MUTATION = NONE**
