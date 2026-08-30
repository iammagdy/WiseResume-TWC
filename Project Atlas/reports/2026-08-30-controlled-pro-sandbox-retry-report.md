# WiseResume Controlled Pro Sandbox Retry Report

**Date:** 2026-08-30
**Verdict:** `PRO_SANDBOX_TRANSACTION_CREATED_READY_FOR_COMPLETION`
**Scope:** One owner-authorized controlled Pro Sandbox checkout attempt.
**Production billing:** `DISABLED`

---

## 1. Executive Summary

Under explicit owner authorization (`APPROVED_FOR_EXACTLY_ONE_CONTROLLED_PRO_SANDBOX_RETRY`), the checkout gate was temporarily enabled (`BILLING_CHECKOUT_ENABLED=true`), and exactly one controlled Pro Sandbox checkout attempt was executed for a disposable Free QA user (`6a93e7800015d158e4d6`).

The execution succeeded end-to-end at the checkout server boundary:
- Function `billing-checkout` execution `6a93e7c28b46344ccbdd` returned HTTP 200 with `status: "success"`.
- Outbound Paddle Sandbox API request succeeded and created Paddle transaction `txn_01m18w2n8ge1a09wk0fm4c434s`.
- All transaction parameters matched the approved Pro catalog:
  - Product: `pro_01m0fn08h7tmzm5cphvcvd30g6`
  - Price: `pri_01m0fnjspex6yqqf6w9v9apaxg`
  - Quantity: `1`
  - Collection mode: `automatic`
  - Environment: `sandbox`
  - Canonical user mapping: `6a93e7800015d158e4d6`
- Session `session_bb21a6b59caad4283bd8bd537cbf` was persisted to Appwrite `billing_checkout_sessions` with state `created`.
- The checkout gate was immediately restored to `BILLING_CHECKOUT_ENABLED=false` and verified.

---

## 2. Controlled Retry Evidence

| Property | Value / Evidence |
| :--- | :--- |
| **Execution ID** | `6a93e7c28b46344ccbdd` |
| **Execution Status** | `completed` |
| **Response Status Code** | `200` |
| **Duration** | 2.14s |
| **Paddle Transaction ID** | `txn_01m18w2n8ge1a09wk0fm4c434s` |
| **Public Session Reference** | `sess_8f4f86cf782720059a4b98edbe291a4008a7` |
| **Checkout Reference** | `paddle_03d4e3cfd53b371d6c17f12a234228680ab5` |
| **Checkout URL** | `https://wiseresume.app/?_ptxn=txn_01m18w2n8ge1a09wk0fm4c434s` |
| **Appwrite Session Doc** | `session_bb21a6b59caad4283bd8bd537cbf` (`state: created`) |
| **Catalog Match** | Pro Product `pro_01m0fn08h7tmzm5cphvcvd30g6`, Price `pri_01m0fnjspex6yqqf6w9v9apaxg` |
| **QA User ID** | `6a93e7800015d158e4d6` |
| **QA User Plan** | `free` (5 daily credits, no manual grant) |
| **Duplicate Attempts** | 0 (strictly 1 attempt performed) |
| **Manual Mutations** | NONE (zero database overrides or artificial state) |
| **Final Checkout Gate** | `BILLING_CHECKOUT_ENABLED=false` (verified) |
| **Production Billing** | `DISABLED` |

---

## 3. Operational & Security Boundary Maintained

- **Fail-Closed Gate:** `BILLING_CHECKOUT_ENABLED=false` restored immediately after execution.
- **Zero Exposure:** No secret values or credentials were read, printed, logged, copied, or stored.
- **No Manual Grants:** Database records reflect purely genuine automated runtime state.
- **Single Attempt:** Exactly one checkout session was initiated and verified.

---

## 4. Next Actions

1. Authorize payment completion on the created Sandbox transaction `txn_01m18w2n8ge1a09wk0fm4c434s`.
2. Verify downstream RevenueCat Sandbox v2 ingestion and Appwrite `revenuecat_event_ledger` / `revenuecat_subscription_state` lifecycle mutations upon payment event delivery.
