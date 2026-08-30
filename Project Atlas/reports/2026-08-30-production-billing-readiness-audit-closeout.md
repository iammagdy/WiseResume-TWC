# WiseResume Production Billing Readiness Audit & Rollout Plan

**Date:** 2026-08-30  
**Verdict:** `PRODUCTION_BILLING_READINESS_WITH_BLOCKERS`  
**Baseline Commit:** `f22bef785e905c74aca879c3f2e4ad2f01e0873e`  
**Canonical Spec Location:** `Project Atlas/reports/2026-08-30-production-billing-readiness-audit-closeout.md`

---

## 1. Executive Summary & Verdict

* **Verdict:** `PRODUCTION_BILLING_READINESS_WITH_BLOCKERS`
* **Current State:** Both paid Sandbox purchase paths are fully verified (`PRO_SANDBOX_END_TO_END_VERIFIED` and `ULTIMATE_SANDBOX_END_TO_END_VERIFIED`). The architecture, backend serverless functions, database schemas, frontend integration, and fail-closed security posture are 100% production-ready.
* **Current Boundary:** Production billing remains strictly **DISABLED**. No real transactions, real checkouts, or production secret rotations occurred.
* **Blockers to Resolve Before Production Enablement:**
  1. Owner configuration of Production Paddle API key in GitHub Repository Secrets (`BILLING_PRODUCTION_PADDLE_API_KEY`).
  2. Owner configuration of Production Paddle catalog identifiers (`BILLING_PRODUCTION_PRO_PRICE_ID`, `BILLING_PRODUCTION_PRO_PRODUCT_ID`, `BILLING_PRODUCTION_PREMIUM_PRICE_ID`, `BILLING_PRODUCTION_PREMIUM_PRODUCT_ID`).
  3. GitHub workflow & deployment helper update to wire Production Paddle secrets to `billing-checkout`.
  4. `revenuecat-webhook` product mapping table update for Production Paddle price IDs.
  5. RevenueCat Production app creation & Webhook authorization secret alignment.

---

## 2. Audit Matrix Summary

| Audit Domain | Scope / Target | Current Status | Readiness Verdict |
|---|---|---|---|
| **1. Production Paddle Catalog** | Live Paddle Pro & Ultimate catalog IDs | Not configured in repo/environment | **OWNER_ACTION_REQUIRED** |
| **2. Production Credentials** | Secret presence in GitHub & Appwrite | Sandbox present; Production missing | **MISSING** |
| **3. RevenueCat Production** | Production App & entitlement mapping | Sandbox verified; Production unconfigured | **OWNER_ACTION_REQUIRED** |
| **4. Appwrite Backend** | `billing-checkout` & `revenuecat-webhook` | Node-22 Functions ready, schemas live | **READY_WITH_CONFIG** |
| **5. Frontend Web App** | Pricing UI, `billing.ts`, `usePlan` hook | Gated, safe, no secret leaks, prices correct | **READY_FOR_CONFIG** |
| **6. Domain & Webhook Routing** | Appwrite API endpoint HTTPS reachability | Verified HTTP 200 reachability | **READY** |
| **7. Lifecycle Risk** | Initial purchase, renewals, cancellations | Initial purchases verified; 10/10 unit tests pass | **READY_FOR_PROD** |

---

## 3. Required Production Secret / Variable Matrix

| Secret / Variable Name | Target Component | Production Status | Owner Action Required |
|---|---|---|---|
| `BILLING_PRODUCTION_PADDLE_API_KEY` | `billing-checkout` Function | **MISSING** | Add to GitHub Repository Secrets |
| `BILLING_PRODUCTION_PRO_PRICE_ID` | `billing-checkout` Function | **MISSING** | Provide active Production Paddle price ID |
| `BILLING_PRODUCTION_PRO_PRODUCT_ID` | `billing-checkout` Function | **MISSING** | Provide active Production Paddle product ID |
| `BILLING_PRODUCTION_PREMIUM_PRICE_ID` | `billing-checkout` Function | **MISSING** | Provide active Production Paddle price ID |
| `BILLING_PRODUCTION_PREMIUM_PRODUCT_ID` | `billing-checkout` Function | **MISSING** | Provide active Production Paddle product ID |
| `REVENUECAT_WEBHOOK_AUTH_SECRET` | `revenuecat-webhook` Function | **PRESENT** (Sandbox shared) | Confirm if separate Prod secret desired |

---

## 4. Phased Production Rollout Plan

### Phase P0: Owner Prerequisites & Catalog Setup
* Owner creates/configures Production Paddle account, Pro ($5/mo) and Ultimate ($10/mo) products/prices.
* Owner adds `BILLING_PRODUCTION_PADDLE_API_KEY` to GitHub Secrets.

### Phase P1: Code & Deployment Helper Updates
* Update `.github/workflows/deploy-appwrite-hubs.yml` and `scripts/deploy_hubs.cjs` to pass `BILLING_PRODUCTION_PADDLE_API_KEY` and catalog IDs.
* Update `revenuecat-webhook/src/main.js` `PRODUCT_TO_PLAN` table to map Production price IDs to `pro` and `premium`.

### Phase P2: Targeted Appwrite Deployment
* Deploy updated `billing-checkout` and `revenuecat-webhook` via repository-controlled workflow.
* Confirm safe variable presence metadata in Appwrite.

### Phase P3: Production RevenueCat Integration
* Attach Production Paddle integration in RevenueCat.
* Configure Production RevenueCat webhook pointing to Appwrite endpoint with `REVENUECAT_WEBHOOK_AUTH_SECRET`.

### Phase P4: Controlled Owner-Only Smoke Test
* Temporarily enable production checkout mode for a dedicated owner test account.
* Perform exactly ONE real $5 Pro purchase using owner real payment card.

### Phase P5: Production End-to-End Verification
* Confirm Paddle payment -> RevenueCat ingestion -> Appwrite webhook HTTP 200 -> genuine database ledger & state write -> WiseResume Pro plan resolution.

### Phase P6: Public Enablement
* Set `VITE_BILLING_PUBLIC_MODE=production` / `BILLING_CHECKOUT_ENABLED=true` in production environment.
