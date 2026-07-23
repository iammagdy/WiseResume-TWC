# WiseResume Current Deployment Guide

**Last Verified:** 2026-07-23
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
* **Latest Verified Code-Bearing Deployment:** GitHub deployment `5579487506` for commit `66df7a3978c79a525742a6c07ab2836a4ca0cadf`; environment URL `https://wise-resume-d700lmekx-iam-magdy.vercel.app`; Vercel status `success`.
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

* **Target:** `ai-gateway` only.
* **GitHub Actions Run:** `30042810382` - success in `1m58s`.
* **Appwrite Deployment:** `6a627b81bff27daaf366` - `ready`.
* **Source Hash:** `244f6be15693770dc1c6129a8e258c4fc956a6ddd04793522edc314ab712adc0`.
* **Smoke:** HTTP 200.
* **Schema Scope:** All global schema workflow steps were skipped. Existing `ai_credits` resources were checked idempotently; no schema change was made.

---

## 4. Legacy Deployment Reference

* Historical documentation for legacy Hostinger FTP deployments is preserved for reference in [`Project Atlas/archive/legacy-hostinger-deployment-guide.md`](../archive/legacy-hostinger-deployment-guide.md).
