# WiseResume RevenueCat Webhook Reconciliation Diagnostic Closeout

**Date:** 2026-08-30
**Verdict:** `REVENUECAT_WEBHOOK_REDELIVERY_AUTH_REJECTED`
**Scope:** Targeted deployment of `revenuecat-webhook` and verification of redelivered Pro lifecycle webhook.
**Production billing:** `DISABLED`

---

## 1. Executive Summary

Following owner update of GitHub secret `REVENUECAT_WEBHOOK_AUTH_SECRET` and RevenueCat Sandbox webhook Authorization header, the repository-controlled targeted deployment workflow `33302510002` deployed Appwrite Function `revenuecat-webhook`:
- Active deployment ID: `6a93eea77fa8571b8f5a` on Node-22.
- Live variable presence: `REVENUECAT_WEBHOOK_AUTH_SECRET` verified by metadata (length 64).
- Function scopes preserved: `[]` (server-side webhook boundary).

During the subsequent webhook attempt (execution `6a93eedf05bcd111854a`), the incoming request was rejected with HTTP 401. Sanitized execution logs confirm:
`RevenueCat webhook 6a93eedf05bcd111854a: rejected authentication (header=present scheme=bearer token_length=64 secret_configured=yes secret_length=64 lengths_equal=yes)`

While token and secret lengths now match (64 characters each, resolving the previous 64 vs 69 length discrepancy), `timingSafeEqual` comparison failed, indicating that the token string transmitted in the request does not match the secret string configured in the Function environment.

---

## 2. Evidence Table

| Property | Value / Evidence |
| :--- | :--- |
| **Targeted Deployment Workflow** | `33302510002` (Status: `success`, Duration: 1m15s) |
| **Active Webhook Deployment** | `6a93eea77fa8571b8f5a` |
| **Latest Webhook Execution** | `6a93eedf05bcd111854a` (HTTP 401, Duration: 0.69s) |
| **Sanitized Diagnostic** | `header=present scheme=bearer token_length=64 secret_configured=yes secret_length=64 lengths_equal=yes` |
| **RevenueCat Entitlement** | Ingested in RevenueCat Sandbox |
| **Appwrite Ledger Rows** | `0 rows` (Fail-closed; unauthenticated writes prevented) |
| **Appwrite Provider State** | `0 rows` (QA user remains Free) |
| **WiseResume Effective Plan** | `free` (5 daily credits) |
| **Manual Mutations** | `NONE` (Zero artificial state grants) |
| **Checkout Gate** | `BILLING_CHECKOUT_ENABLED=false` (verified) |
| **Production Billing** | `DISABLED` |

---

## 3. Root Cause Analysis

1. **Secret Length Alignment:** The previous length mismatch (token 64 vs secret 69) was resolved by the owner secret update. Both are now 64 characters.
2. **String Content Divergence:** The 64-character bearer token sent in the webhook payload does not match the 64-character secret configured on the Appwrite Function. This occurs if:
   - The token was generated with leading/trailing whitespace or different character cases.
   - The Authorization header in RevenueCat includes or omits a `Bearer ` prefix differently from expected.
   - The redelivered attempt was dispatched using a cached credential prior to the dashboard update taking effect.

---

## 4. Exact Next Action

1. Verify that the exact same 64-character secret string (without extra spaces or quotes) is pasted in both:
   - GitHub Repository Secret: `REVENUECAT_WEBHOOK_AUTH_SECRET`
   - RevenueCat Sandbox Project Settings -> Integrations -> Webhooks -> Authorization header (as `Bearer <secret>` or `<secret>`).
2. Trigger redelivery of the initial purchase webhook from the RevenueCat Sandbox dashboard.
3. Verify `revenuecat-webhook` returns HTTP 200 and records genuine Pro lifecycle documents to Appwrite.
