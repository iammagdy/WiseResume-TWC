# WiseResume Current Deployment Guide

**Last Verified:** 2026-08-14
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
* **Current Production Deployment:** Vercel deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d`; environment URL `https://wise-resume-6d1oagd4i-iam-magdy.vercel.app`; Vercel status `READY`; aliases include `wiseresume.app`, `www.wiseresume.app`, and `resume.thewise.cloud`.
* **Latest Verified Code-Bearing Deployment:** Vercel deployment `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`; environment URL `https://wise-resume-8rc0tr8nr-iam-magdy.vercel.app`; Vercel status `READY`. The subsequent current deployment changed only Project Atlas documentation.
* **Trigger:** Pushes to the `main` branch automatically trigger Vercel production deployment workflows. PR #183’s merge commit `4bea728dba622ae2124d0192241cc7b26bdf6076` is now on `main`; the normal Vercel integration may deploy it, but no manual Vercel deployment was performed and the resulting production deployment/live login verification is not yet recorded.
* **Build Command:** `npm run build`
* **Output Directory:** `dist/`
* **Active Frontend CSP:** Delivered through the Vite-injected meta tag. Appwrite access requires both `https://fra.cloud.appwrite.io` and `wss://fra.cloud.appwrite.io` in `connect-src`. Browser visitor tracking must not add GeoJS to `connect-src`; direct browser GeoJS requests were removed in favor of Appwrite ingestion metadata where available.
* **Environment Variables:**
  * `VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1`
  * `VITE_APPWRITE_PROJECT_ID=69fd362b001eb325a192`
  * `VITE_TURNSTILE_SITE_KEY` (Cloudflare Turnstile site key for contact form security)

---

## PR #183 Login Fix Deployment Boundary (2026-08-14)

The email/password login error-masking fix is merged into `main` at `4bea728dba622ae2124d0192241cc7b26bdf6076`. It is a frontend-only change; no Appwrite function, schema, permission, secret, environment variable, or production-data change is required or authorized by this closeout. The confirmed root cause was generic masking of every Appwrite login failure as invalid credentials. The historical autofill/password-manager cause remains `UNCONFIRMED`. After the normal Vercel integration completes, perform read-only production login verification and record the deployment identity here; do not manually deploy Vercel or change Appwrite.

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

---

## 4. Legacy Deployment Reference

* Historical Hostinger/FTP material is preserved only in the Atlas archive and chronological handover. It is not current WiseResume deployment truth.

## Public-Repository Hardening Recovery (2026-07-24)

The failed 28-target workflow `30100163770` was not rerun. PR #158 tracked the three missing hub lockfiles and hardened the lockfile guard; targeted recovery used only the three Jobs hubs above. See [`../security/public-repository-hardening.md`](../security/public-repository-hardening.md).
