# WiseResume Current Deployment Guide

**Last Verified:** 2026-08-28
**Status:** Canonical Deployment Specification  
**Location:** `Project Atlas/deployment/current-deployment.md`  

---

## 1. Production Hosting Overview

WiseResume uses a hybrid deployment architecture:

* **Frontend Web Application:** Deployed to **Vercel** (`wiseresume.app`).
* **Backend Infrastructure & Functions:** Deployed to **Appwrite Cloud** (`fra.cloud.appwrite.io`).

---

## 2. Frontend Deployment (Vercel)

* **Production URL:** `https://wiseresume.app`
* **Current Production Deployment:** GitHub deployment record `6134499586` for Vercel environment `Production`, associated with merged product commit `1abe49349d0998f13709c7af9d80164435b5069e`, completed with status `success`; target URL was `https://wise-resume-n0pbocame-iam-magdy.vercel.app`. The normal main-branch deployment path was used; no manual Vercel deployment was initiated.
* **Merge boundary:** PR [#216](https://github.com/iammagdy/WiseResume-TWC/pull/216) merged normally into `main` at `82d3640c743442db304c50cb57a229648685b59a` after the authorized head `f18017f2af81ca939c047082f6215baf545bfc1b` and two-file scope were re-confirmed. The deployment status for that merge commit was `success`.
* **Trigger / QA:** The merge to `main` triggered the normal Vercel Production deployment path. Authenticated Arabic RTL desktop QA at approximately 1526×811 showed the corrected sidebar footer/account reachability, Pro card, Manage billing, and `50 / 50` credits in both dark and light modes. Plan & billing reached `/subscription` with Pro, Active, and `0 / 50` daily usage. English LTR and reduced mobile viewport remain `UNVERIFIED` because the live locale control was feature-flagged off and the available browser controls did not resize the viewport. No Appwrite deployment occurred or was required.
* **Build Command:** `npm run build`
* **Output Directory:** `dist/`
* **Active Frontend CSP:** Delivered through the Vite-injected meta tag. Appwrite access requires both `https://fra.cloud.appwrite.io` and `wss://fra.cloud.appwrite.io` in `connect-src`. Browser visitor tracking must not add GeoJS to `connect-src`; direct browser GeoJS requests were removed in favor of Appwrite ingestion metadata where available.
* **Environment Variables:**
  * `VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1`
  * `VITE_APPWRITE_PROJECT_ID=69fd362b001eb325a192`
  * `VITE_TURNSTILE_SITE_KEY` (Cloudflare Turnstile site key for contact form security)

---

## PR #183 Login Fix Production Verification (2026-08-14)

The email/password login error-masking fix is merged into `main` at `4bea728dba622ae2124d0192241cc7b26bdf6076`. The frontend-only behavior is served on `https://wiseresume.app`: authorized credentials redirected to `/dashboard`, and a deliberately invalid non-user pair received only the generic invalid-credential message. The deployed AuthPage/AuthBold chunks contain the safe classifier, email-only trim, exact password handoff, and submit-time DOM/input markers. No Appwrite function, schema, permission, secret, environment variable, account, production-data, or manual deployment change occurred. The confirmed root cause remains generic masking of every Appwrite login failure as invalid credentials. The historical autofill/password-manager cause remains `UNCONFIRMED`. Rate-limit, network/service, and unknown-auth-error UI paths were not intentionally triggered in production and remain `UNVERIFIED`.

## 3. Appwrite Serverless Functions Deployment (`appwrite-hubs/`)

Appwrite Functions are deployed independently from the frontend application using targeted GitHub Action workflows or helper scripts.

* **Workflow File:** `.github/workflows/deploy-appwrite-hubs.yml`
* **Deploy Helper Script:** `node scripts/deploy_hubs.cjs --only=<function-name>`

### Approved Deployment Rule:
> **Never run target-all deploys (`target=all`).** Always deploy targeted function hubs (e.g. `--only=ai-gateway` or `--only=email-service`) to prevent unintended side effects on other running functions.

### Latest Verified Appwrite Deployment

* **Target:** `job-feed-sync,get-remote-jobs,track-job-action` only.
* **GitHub Actions Run:** `30101982337` - success in `5m15s` after corrective PR #158.
* **Appwrite Deployments:** `job-feed-sync` `6a637988c75fbc22829a`, `get-remote-jobs` `6a63799d79e6a27a64f3`, and `track-job-action` `6a6379ae192857be7a6e`; all `ready`.
* **Verification:** 28/28 live policy matches; anonymous probes to internal-only and authenticated-user targets were denied; one authorized sync completed. Browser-only authenticated flows remain pending.

### WiseResume P1 Pre-Load-Test Targeted Deployment & Production Verification — 2026-09-01

* **PR #263 Merged & Deployed:** PR #263 merged to `main` at `176df210c6c1ed5a7e05a2cdeea94e792522c819`. Atlas closeout at `fdd5e15e47fa74e9859d1ee564c5b718d08cc98b`.
* **Frontend Vercel Production:** Deployed automatically from `main` (`4u755CpdjZ8dY3Qjamk6ksyDLs7t`, status `success`).
* **Targeted Appwrite Deployment:**
  - **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml` on `main` with `target: email-service` (broad `target=all` strictly avoided).
  - **Run ID:** `33508861238` ([Run 33508861238](https://github.com/iammagdy/WiseResume-TWC/actions/runs/33508861238)) — conclusion: `success` (1m45s).
  - **Deployed Hub:** `email-service` (`execute: ["any"]`).
  - **Deployment ID:** `6a96c79aa3c6c53e6cdf`, status `ready`.
  - **Preflight Gates:** Schema setup idempotent (`email_rate_limits` verified; `password_reset_otps` verified); source-hash gate passed (`0a3bdc2e05d7edd51ab26e5077dbf72a19a243eded08bd2165092c9c086e5baf`).
  - **Variables Configured:** `TURNSTILE_SECRET_KEY` created server-side from `ai-gateway` secret source; `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PASSWORD_RESET_OTP_SECRET` synchronized without secret logging.
* **Production Runtime QA Evidence:**
  - **Standard Public Portfolio:** Loaded logged out at `https://wiseresume.app/p/magdy` with HTTP 200 OK. Public sections rendered, no auth redirect, contact form present in DOM with honeypot trap and Turnstile widget container.
  - **Custom Domain Fail-Close:** `GET /api/public-portfolio?mode=domain&domain=example.com` verified in live production returning HTTP `501 Not Implemented` with `{"error":"custom_domains_not_supported"}` instantaneously (zero unindexed 5,000-document scanning loops). Normal `/p/magdy` verified 100% operational immediately afterward.
  - **Narrow Public Route Security:** Tested live against deployed `email-service`. Generic `action: 'send-contact-email'` and non-portfolio types (`type: 'bug'`) strictly rejected with HTTP 400 without touching database or Resend.
  - **Negative Turnstile Enforcement:** Missing Turnstile rejected with HTTP 403 `{"error":"Security check required."}`; invalid Turnstile token verified outbound via Cloudflare Turnstile API and rejected with HTTP 403 `{"error":"Security check failed. Please try again."}`.
  - **Honeypot Trap:** Live execution with `website` populated returned silent HTTP 200 `{ status: 'success', data: { id: null, success: true } }` without dispatching email or notifications.
  - **Trusted Client IP:** Verified runtime reads `x-appwrite-client-ip` header injected at Appwrite gateway.
* **Verification Classification:**
  - Appwrite Deployed: `VERIFIED` (`6a96c79aa3c6c53e6cdf`, ready).
  - Browser Page Tested: `VERIFIED` (logged out, no auth redirect).
  - Custom-Domain Fail-Close: `VERIFIED` (HTTP 501).
  - Security Negative Paths: `VERIFIED` (400 on wrong action, 403 on missing/invalid Turnstile, 200 on honeypot).
  - Inbox Delivery: `OWNER_ACTION_REQUIRED_EMAIL_DELIVERY_CONFIRMATION` (Mailbox access unavailable to agent; live email delivery requires owner inbox confirmation).
  - Owner In-App Notification: `PENDING` (Owner session inspection required).

### Phase P1/P2/P3 Production Billing Deployment & Webhook Routing Status — 2026-08-30

* **PR #247 & #248 Merged:** PR #247 merged (`78c0afc9`) with Production Paddle catalog & fail-closed deploy guards. PR #248 merged (`ba5a785e`) updating source-hash manifest for `revenuecat-webhook` (`704b896e0460187b21d84e1f42f208088baf4c3d128971f0c114137435e27cdd`).
* **Phase P2 Deployment History:**
  - Initial P2 workflow run `33309686634` failed pre-deploy at source-hash manifest guard; zero Appwrite Functions were deployed by that failed run.
  - Successful P2 workflow run `33310801069` targeted `billing-checkout,revenuecat-webhook` on `main` (`ba5a785e`).
  - Active deployments: `billing-checkout` (`6a941dfe80f78ba25dbf`, Node-22, status `ready`) and `revenuecat-webhook` (`6a941e0dbd0c2cf9ce40`, Node-22, status `ready`).
  - Schema reconciliation status: `SCHEMA_RECONCILIATION_SUCCEEDED` — RevenueCat provider-state and billing checkout schemas reported ready; no schema mutation was observed or reported.
* **Phase P3 Webhook Routing Verified:** Owner updated RevenueCat outbound webhook environment scope to `Both Production and Sandbox` targeting `https://revenuecat-webhook.wiseresume.app` with `Authorization: Bearer <secret>` (`AUTH_HEADER_PRESENT`).
* **TEST Transport:** Handled clean `TEST` event with HTTP 200 (`acknowledged`, `mutated=false`). DB ledger (2) and subscription state (2) unchanged.
* **Important Delivery Boundary:** `PRODUCTION_DELIVERY_NOT_YET_PROVEN` — Outbound webhook configuration and official authenticated TEST transport are verified. No genuine Production lifecycle event has been executed yet.
* **Boundary:** `BILLING_CHECKOUT_ENABLED=false` preserved. `paymentsEnabled: false` preserved. Production billing remains strictly disabled.

### Current WiseResume Payments Sandbox runtime readiness — 2026-08-28

* **Diagnostic deployment:** PR #229 merged at `88b411af877d9cd33a098508f27e0ef9f080e849`; targeted workflow `33206687391` deployed only `billing-checkout`. The active deployment is `6a91ea0e63105206adf6`, Node-22, Manual source. It adds only sanitized allowlisted diagnostics for unexpected `AppwriteCheckoutStore.reserve()` failures; public error behavior is unchanged.
* **Operational boundary:** `BILLING_CHECKOUT_ENABLED=false` remains preserved and provider readiness is unchanged. The deployment did not synchronize billing Function variables, alter provider credentials/configuration, invoke Paddle/RevenueCat, mutate billing state, or affect Production billing.
* **Next diagnostic evidence:** Root cause remains `UNPROVEN`; a separately authorized controlled retry is required to obtain the safe stage identifier. No checkout or payment may occur before that explicit approval.

* **Runtime:** Public Sandbox/Test Mode UI and explicit server Sandbox/Production isolation are merged in PR #225. The server-owned `billing-checkout` boundary accepts only authenticated canonical users and internal `pro|premium`, with server-selected catalog, automatic collection, canonical custom data, safe opaque session output, and no local entitlement authority.
* **Appwrite:** The additive `billing_checkout_sessions` and `billing_checkout_locks` collections were applied by targeted workflow `33135870481`. Exactly `billing-checkout` was deployed and reached ready deployment `6a90f1babbd3925c3583`.
* **Provider boundary:** No safe server Paddle credential was proven available through an approved masked path. No provider-authenticated request, transaction, or lifecycle mutation was performed. The runtime remains fail-closed with billing and provider readiness disabled; Production remains disabled.
* **Frontend QA:** Live public Pricing QA passed in English and Arabic RTL with Sandbox/Test Mode and no-real-charge disclosure. Authenticated checkout, mobile, theme alternates, and provider reconciliation remain `UNVERIFIED`.
* **Security:** The prior exposed Paddle Sandbox API-key warning remains `SECURITY_INCIDENT_SECRET_EXPOSURE` / `OWNER_ACCEPTED_UNRESOLVED_RISK`; no value was retrieved or used. This is not a Production approval.

### Current WiseResume Payments Phase 2C Sandbox readiness — 2026-08-26

* **Current state:** The existing non-real Paddle Sandbox automatic Pro payment completed and is represented in RevenueCat Sandbox by one `PURCHASES_INITIAL_PURCHASE`, an active Pro entitlement, and an active Paddle subscription. Appwrite contains the matching processed `INITIAL_PURCHASE` ledger row and active `revenuecat_subscription_state` provider row; WiseResume resolves Pro from provider state. No Production payment is authorized or verified.
* **Webhook transport:** The existing Sandbox RevenueCat integration targets `https://revenuecat-webhook.wiseresume.app`. A safe unauthenticated probe returns HTTP 401, and the current certificate matches the webhook hostname. No lifecycle event was sent during the Phase 2D-A audit.
* **Catalog:** Safe read-only RevenueCat checks show active `pro` and `premium` entitlements, active monthly Pro and Ultimate/Premium products, and both products attached to the current Sandbox offering. No credential-bearing app configuration was opened.
* **Boundaries:** Frontend checkout remains disabled (`paymentsEnabled=false`); Production Paddle/RevenueCat configuration, Production webhook, Production secret parity, and Production TEST remain `UNVERIFIED`. Live cancellation, expiration, billing issue, duplicate replay, stale replay, and Ultimate activation remain `UNVERIFIED`.
* **Security warning:** A prior RevenueCat app-list response exposed plaintext Paddle Sandbox API-key fields. The owner declined rotation. The exposure remains `OWNER_ACCEPTED_UNRESOLVED_RISK`; the value is not recorded, and this warning is not a Production approval.

### Authorized WiseResume Payments Phase 2B Deployment — 2026-08-23

* **GitHub Actions Run:** `32659598098`, successful.
* **Source Commit:** `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3`.
* **Exact Target Input:** `revenuecat-webhook,coupons,ai-gateway,admin-devkit-data`.
* **Packaging corrections:** PR #207 added the webhook package lockfile; PR #208 added local resolver materialization; PR #209 staged local dependencies inside each archive with internal lockfile paths. All three merged normally into `main`.
* **Scope Safety:** No `target=all`, Appwrite Console source deployment, unrelated Function deployment, Paddle/RevenueCat webhook creation, checkout activation, or Production payment activation occurred.

| Function ID | Deployment ID | Repository source SHA-256 | Runtime / entrypoint | Execute | API state |
|---|---|---|---|---|---|
| `revenuecat-webhook` | `6a8b428bcc672552c93c` | `84b912c8fb19847b8c9f3e5fb244e6a6f0d47ea75a3479be2e83f8416ed2d3ca` | `node-22` / `src/main.js` | `["any"]` | enabled, ready, `live=false` |
| `coupons` | `6a8b4298cc91fa11cc23` | `7f446ce4beaeebff1b0d1b9fd5759525c5c5641d42f133b9a487552cfabf9125` | `node-22` / `src/main.js` | `["any"]` | enabled, ready, `live=false` |
| `ai-gateway` | `6a8b42a5e0965bff82f1` | `90dc27f2352511f8fc26a085ef85cb703ed085dd7af853aaf536ca90c836f867` | `node-22` / `src/main.js` | `["users"]` | enabled, ready, `live=false` |
| `admin-devkit-data` | `6a8b42b268421195ca8f` | `7683b44a7dc033aecc739541cc0ec91f0d7fcd31fabf7a2a8718d498b22431e0` | `node-22` / `src/main.js` | `["users"]` | enabled, ready, `live=false` |

The webhook Function exposes the variable name `REVENUECAT_WEBHOOK_AUTH_SECRET` with Appwrite’s secret flag. The secret value is not recorded; Appwrite redacts it, so value parity is not independently provable. The custom domain `revenuecat-webhook.wiseresume.app` has the required CNAME to `fra.cloud.appwrite.io`, but its certificate remains pending/invalid under strict TLS and its diagnostic route returns HTTP `421`. The next runtime gate is `APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`.

### Authorized WiseResume DevKit Deployment — 2026-08-15

* **GitHub Actions Run:** `31880840961`, successful.
* **Source Commit:** `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`.
* **Exact Target Input:** `ai-gateway,admin-devkit-data,admin-onboarding-funnel,email-service`.
* **Scope Safety:** No `target=all`, Appwrite Console deployment, manual Vercel deployment, or unrelated function deployment occurred. The approved workflow did perform repository-controlled, idempotent production setup/configuration mutations recorded below.

| Function ID | Deployment ID | Source/deployed SHA-256 | State |
|---|---|---|---|
| `ai-gateway` | `6a80467d45db108d5cab` | `158da0749573c9c2d7e173c256ee0d77f64c783536fcf920693ed1bb0715fafe` | enabled, ready, In Sync |
| `admin-devkit-data` | `6a804687cfea6415139d` | `6d23504f47c53d72354ca2bb2a46e6bb695b2df0e5442d99d708b7f9075e8804` | enabled, ready, In Sync |
| `admin-onboarding-funnel` | `6a8046923ac36d1cc638` | `efe2a22802e679c8d87e3089c8d284c26563b8c573f9b31b7db8440a0c57553c` | enabled, ready, In Sync |
| `email-service` | `6a80469d1ee51e0246e0` | `744f82a1bd0f4dc9679a9cd30dc56b6195def4f0449f857df6e1bcf510a0548a` | enabled, ready, In Sync |

* **Post-deployment verification:** `/devkit` reached a live terminal state with all 24 panels marked `LIVE`; App Overview and Onboarding reached terminal states; mixed AI slots showed `Degraded / Mixed`; invalid English and Arabic public-share routes reached `Resume Not Found` after `ShareSkeleton`; a read-only 22-route smoke check found no fatal markers.
* **Warnings:** Data Integrity and Users aggregate sources were unavailable during capture; detailed App Analytics content was empty; Email configuration health did not reach a terminal state and no send/reset action was invoked; mobile/full dark-theme and some fixture-dependent paths remain unverified. Final operational verdict for the four-function deployment: `PASS_WITH_WARNINGS`.

### Authorized repository-controlled production mutations

The successful run `31880840961` is classified as `AUTHORIZED_REPOSITORY_CONTROLLED_PRODUCTION_MUTATION`, not as an absence of production mutation. Its log records creation of `admin_reset_request_nonces`, `pdf_export_rate_limits`, and `pdf_export_active_leases`; synchronization of selected function variables; synchronization of the password-recovery template; Appwrite auth-template configuration; and update of `fn_deployed_hashes` for the four exact targets. The workflow log distinguishes these from pre-existing resources that were reported as already existing, including the idempotent `password_reset_otps` setup. No manual Console mutation, `target=all`, unrelated function deployment, permission broadening, unauthorized data mutation, or secret-value disclosure occurred.

### Narrow email-verification template correction

PR #194 merged the repository fix for the proven blank Verification-template regression. The fix uses repository-managed functional Verification and recovery templates, validates the Appwrite `{{redirect}}` contract before PATCH, and prevents either deployment helper from blanking the Verification template. Authorized run `31882493172` targeted `email-service` only, created deployment `6a804f862b4138bc1b06`, reached ready status, synchronized the managed Verification and recovery templates, synchronized non-secret email-service variables, and updated `fn_deployed_hashes` for `email-service`. Appwrite Console post-deployment visual confirmation remained blocked by the Console loading spinner; the workflow log is the available evidence of successful PATCH completion. End-to-end inbox verification is `FIXTURE_BLOCKED` because no approved safe QA identity/inbox was available.

---

## 4. Legacy Deployment Reference

* Historical Hostinger/FTP material is preserved only in the Atlas archive and chronological handover. It is not current WiseResume deployment truth.

## Public-Repository Hardening Recovery (2026-07-24)

The failed 28-target workflow `30100163770` was not rerun. PR #158 tracked the three missing hub lockfiles and hardened the lockfile guard; targeted recovery used only the three Jobs hubs above. See [`../security/public-repository-hardening.md`](../security/public-repository-hardening.md).
