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
* **Latest Verified Code-Bearing Deployment:** Vercel deployment `dpl_BC5DxdhG1wEJR1m3TBuxhf9ZDfjm` for commit `a14b306da29e4ac7a1db16e85fcc54c790c3727c`; environment URL `https://wise-resume-duk55phaa-iam-magdy.vercel.app`; Vercel status `READY`.
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
* **GitHub Actions Run:** `30048216417` - success in `2m29s`.
* **Appwrite Deployment:** `6a628eafd09be552df71` - `ready`.
* **Source Hash:** `6a61da4d2b3efa73449ca7e3f77ebb6797d35dd005ff8f01f81644439bd72d12`.
* **Runtime Timeout:** `180 s`. Tailoring internally remains bounded to its `68 s` gateway budget.
* **Smoke:** HTTP 200.
* **Schema Scope:** All general schema workflow steps were skipped; no schema change was made.
* **Repository Parity:** The active `ai-gateway` deployment matches the repository hash. Tailoring project metadata preservation was production verified after this targeted deployment.

---

## 4. Legacy Deployment Reference

* Historical Hostinger/FTP material is preserved only in the Atlas archive and chronological handover. It is not current WiseResume deployment truth.
