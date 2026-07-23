# WiseResume Current Deployment Guide

**Last Verified:** 2026-07-24
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
* **Trigger:** Pushes to the `main` branch automatically trigger Vercel production deployment workflows.
* **Build Command:** `npm run build`
* **Output Directory:** `dist/`
* **Active Frontend CSP:** Delivered through the Vite-injected meta tag. Appwrite access requires both `https://fra.cloud.appwrite.io` and `wss://fra.cloud.appwrite.io` in `connect-src`. Browser visitor tracking must not add GeoJS to `connect-src`; direct browser GeoJS requests were removed in favor of Appwrite ingestion metadata where available.
* **Environment Variables:**
  * `VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1`
  * `VITE_APPWRITE_PROJECT_ID=69fd362b001eb325a192`
  * `VITE_TURNSTILE_SITE_KEY` (Cloudflare Turnstile site key for contact form security)

---

## 3. Appwrite Serverless Functions Deployment (`appwrite-hubs/`)

Appwrite Functions are deployed independently from the frontend application using targeted GitHub Action workflows or helper scripts.

* **Workflow File:** `.github/workflows/deploy-appwrite-hubs.yml`
* **Deploy Helper Script:** `node scripts/deploy_hubs.cjs --only=<function-name>`

### Approved Deployment Rule:
> **Never run target-all deploys (`target=all`).** Always deploy targeted function hubs (e.g. `--only=ai-gateway` or `--only=email-service`) to prevent unintended side effects on other running functions.

### Latest Verified Appwrite Deployment

* **Target:** `admin-devkit-data` only.
* **GitHub Actions Run:** `30051406249` - success in `1m15s`.
* **Appwrite Deployment:** `6a629b8351abe36cd0c3` - `ready`.
* **Source Hash:** `21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02`.
* **Smoke:** HTTP 200.
* **Schema Scope:** The new Broadcast schema helper created seven canonical attributes and retained empty collection permissions. General schema steps were skipped. The workflow's existing idempotent `admin-devkit-data` impersonation-session dependency check also ran.
* **Repository Parity:** The active `admin-devkit-data` deployment matches the repository hash. Post-apply Broadcast dry-run reports eight total attributes, zero planned changes, zero documents, and no migration work.

---

## 4. Legacy Deployment Reference

* Historical Hostinger/FTP material is preserved only in the Atlas archive and chronological handover. It is not current WiseResume deployment truth.
