# WiseResume Current Deployment Guide

**Last Verified:** 2026-08-15
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
* **Current Production Deployment:** Vercel deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for the Atlas-recorded documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d`; environment URL `https://wise-resume-6d1oagd4i-iam-magdy.vercel.app`; Vercel status `READY`; aliases include `wiseresume.app`, `www.wiseresume.app`, and `resume.thewise.cloud`. The canonical site returned HTTP 200 and served the merged AuthPage/AuthBold markers. The public response does not expose a commit SHA, so runtime-to-Git mapping is supported by served bundle evidence rather than a public header.
* **Latest Verified Code-Bearing Deployment:** Vercel deployment `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`; environment URL `https://wise-resume-8rc0tr8nr-iam-magdy.vercel.app`; Vercel status `READY`. The subsequent current deployment changed only Project Atlas documentation.
* **Trigger:** Pushes to the `main` branch automatically trigger Vercel production deployment workflows. PR #183’s merge commit `4bea728dba622ae2124d0192241cc7b26bdf6076` is on `main`; no manual Vercel integration was initiated. Read-only production verification passed for successful login, invalid credentials, and safe diagnostics; rate-limit, network/service, and unknown-auth-error paths remain unverified.
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

### Authorized WiseResume DevKit Deployment — 2026-08-15

* **GitHub Actions Run:** `31880840961`, successful.
* **Source Commit:** `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`.
* **Exact Target Input:** `ai-gateway,admin-devkit-data,admin-onboarding-funnel,email-service`.
* **Scope Safety:** No `target=all`, Appwrite Console deployment, direct production setup, manual Vercel deployment, or unrelated function deployment.

| Function ID | Deployment ID | Source/deployed SHA-256 | State |
|---|---|---|---|
| `ai-gateway` | `6a80467d45db108d5cab` | `158da0749573c9c2d7e173c256ee0d77f64c783536fcf920693ed1bb0715fafe` | enabled, ready, In Sync |
| `admin-devkit-data` | `6a804687cfea6415139d` | `6d23504f47c53d72354ca2bb2a46e6bb695b2df0e5442d99d708b7f9075e8804` | enabled, ready, In Sync |
| `admin-onboarding-funnel` | `6a8046923ac36d1cc638` | `efe2a22802e679c8d87e3089c8d284c26563b8c573f9b31b7db8440a0c57553c` | enabled, ready, In Sync |
| `email-service` | `6a80469d1ee51e0246e0` | `744f82a1bd0f4dc9679a9cd30dc56b6195def4f0449f857df6e1bcf510a0548a` | enabled, ready, In Sync |

* **Post-deployment verification:** `/devkit` reached a live terminal state with all 24 panels marked `LIVE`; App Overview and Onboarding reached terminal states; mixed AI slots showed `Degraded / Mixed`; invalid English and Arabic public-share routes reached `Resume Not Found` after `ShareSkeleton`; a read-only 22-route smoke check found no fatal markers.
* **Warnings:** Data Integrity and Users aggregate sources were unavailable during capture; detailed App Analytics content was empty; Email configuration health did not reach a terminal state and no send/reset action was invoked; mobile/full dark-theme and some fixture-dependent paths remain unverified. Final operational verdict: `PASS_WITH_WARNINGS`.

---

## 4. Legacy Deployment Reference

* Historical Hostinger/FTP material is preserved only in the Atlas archive and chronological handover. It is not current WiseResume deployment truth.

## Public-Repository Hardening Recovery (2026-07-24)

The failed 28-target workflow `30100163770` was not rerun. PR #158 tracked the three missing hub lockfiles and hardened the lockfile guard; targeted recovery used only the three Jobs hubs above. See [`../security/public-repository-hardening.md`](../security/public-repository-hardening.md).
