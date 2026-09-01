# WiseResume Sandbox Paddle Runtime Credential Audit

**Date:** 2026-08-30
**Verdict:** `OWNER_ACTION_REQUIRED_SECRET_SOURCE_MISSING`
**Scope:** Read-only diagnostic verification, safe secret-source audit, and operational handover.
**Production billing:** `DISABLED`
**Checkout gate:** `BILLING_CHECKOUT_ENABLED=false`

---

## 1. Confirmed Diagnostic Root Cause

* **Execution ID:** `6a93dcaa587cdb0efd02`
* **Function:** `billing-checkout`
* **Execution Status:** `failed`
* **Response Status Code:** `502`
* **Deployment ID:** `6a93dc3084352c6502c8`
* **Diagnostic Stage:** `provider.runtime_configuration`
* **Diagnostic Category:** `missing_runtime_credential`
* **Safe Numeric Provider Status:** `null`
* **Classification:** `CONFIRMED`

The sanitized diagnostic from `billing-checkout` proved that execution failed inside internal runtime configuration before any outbound request was sent to the Paddle API. In `appwrite-hubs/billing-checkout/src/main.js` (lines 580–590), this failure is triggered because the server credential variable `BILLING_SANDBOX_PADDLE_API_KEY` was not present in the runtime environment.

---

## 2. Safe Secret-Source Audit

A strict, read-only presence check was performed across authorized secret sources without inspecting, reading, printing, copying, or hashing any secret values:

1. **GitHub Repository Secrets (`gh secret list --repo iammagdy/WiseResume-TWC`):**
   * `BILLING_SANDBOX_PADDLE_API_KEY`: **ABSENT**
   * `PADDLE_API_KEY`: **ABSENT**
2. **Appwrite Function Variables (`billing-checkout`):**
   * `BILLING_SANDBOX_PADDLE_API_KEY`: **ABSENT**
   * `BILLING_PRODUCTION_PADDLE_API_KEY`: **ABSENT**
   * Configured variables present: `BILLING_CHECKOUT_ENVIRONMENT`, `BILLING_SANDBOX_PREMIUM_PRICE_ID`, `BILLING_SANDBOX_PRO_PRICE_ID`, `BILLING_CHECKOUT_ENABLED`, `BILLING_SANDBOX_PRO_PRODUCT_ID`, `BILLING_SANDBOX_PREMIUM_PRODUCT_ID`, `BILLING_CHECKOUT_APPROVED_ORIGIN`, `BILLING_CHECKOUT_PROVIDER_READY`.
3. **Repository Worktree & Environment Files:**
   * No local `.env.deploy` or approved secret configuration file is present.
   * In accordance with security governance, previously exposed credentials were never recovered or reused.

---

## 3. Decision Gate & Stop Condition

* **Decision Outcome:** **CASE B — Approved secret source does not exist in repository configuration.**
* **Action:** Immediate stop. No mutation of code, schema, provider configuration, Function scopes, or checkout gates was performed.

---

## 4. Current Safe Runtime State

* **Active `billing-checkout` Deployment:** `6a93dd370196ff28cf48`
* **Runtime:** Node-22 / Active
* **Function Scopes:**
  * `databases.write`
  * `documents.read`
  * `documents.write`
* **Checkout Gate:** `BILLING_CHECKOUT_ENABLED=false`
* **Production Billing:** `DISABLED`
* **Secret Access Status:** No secret values were accessed, read, displayed, copied, or stored.

---

## 5. Required Owner Action

Before a controlled Pro Sandbox checkout retry can be performed:

1. The project owner must securely add the Paddle Sandbox SERVER API key as a GitHub Repository Secret:
   * **Location:** GitHub Repository Settings -> Secrets and variables -> Actions -> Secrets
   * **Secret Name:** `BILLING_SANDBOX_PADDLE_API_KEY`
   * *(Note: Do NOT paste this secret into chat).*
2. The repository deployment workflow `.github/workflows/deploy-appwrite-hubs.yml` and `scripts/deploy_hubs.cjs` must pass this secret to the `billing-checkout` Function during targeted deployment.
3. Explicit owner authorization is required before syncing the secret, deploying `billing-checkout`, or initiating any controlled retry.
