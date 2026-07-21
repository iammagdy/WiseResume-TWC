# Canonical Appwrite Functions Specification

**Last Verified:** 2026-07-21
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/appwrite-functions.md`  

---

## Overview

WiseResume uses Appwrite Cloud Serverless Functions (`appwrite-hubs/`) to execute secure server-side logic, AI provider gateway calls, admin DevKit operations, and background tasks.

Code-adjacent `README.md` files located within `appwrite-hubs/*/` serve as short developer pointers to this canonical document.

---

## Deployed Appwrite Functions Index

All 26 functions are registered in `scripts/deploy_hubs.cjs` (the single source of truth for deployment). Functions listed below are ordered by functional domain.

### AI & Resume Processing

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`ai-gateway`** | `appwrite-hubs/ai-gateway/` | Single server-side gateway for all AI interactions (resume tailoring, cover letters, chat, interview prep). Credit lock, rate limiting, provider fallback. | Server-only / Auth-gated. Validates Turnstile captcha for anonymous forms. |
| **`resume-section-ai`** | `appwrite-hubs/resume-section-ai/` | AI-powered single-section resume content generation (bullet points, summary). NOT routed through `ai-gateway`. | Auth-gated (user session). No credit lock. |
| **`job-import`** | `appwrite-hubs/job-import/` | Parse and import job descriptions from URLs using AI. | Auth-gated (user session). |
| **`ai-health`** | `appwrite-hubs/ai-health/` | AI provider health checks and availability monitoring. | Server-only invocation. |
| **`inspect-ai-keys`** | `appwrite-hubs/inspect-ai-keys/` | DevKit AI provider key inspection, slot model override management, and real completion test pings. | Admin key / DevKit signed session token required. |

### Portfolio & Public Pages

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`get-public-portfolio`** | `appwrite-hubs/get-public-portfolio/` | Serves the full public portfolio payload (profile + resume). Password gate, session tokens, brute-force lockout. | Public HTTP trigger. Password-gated access. |
| **`portfolio-gate`** | `appwrite-hubs/portfolio-gate/` | Lightweight gate check — returns whether a portfolio exists and is password-protected (no data). | Public HTTP trigger. |
| **`verify-portfolio-password`** | `appwrite-hubs/verify-portfolio-password/` | Standalone password verification for portfolio access. | Public HTTP trigger. Rate-limited. |
| **`portfolio-settings`** | `appwrite-hubs/portfolio-settings/` | Read/write portfolio password and settings for the authenticated owner. | Auth-gated (owner only). |
| **`track-visitor-event`** | `appwrite-hubs/track-visitor-event/` | Records anonymised visitor interactions (page views, clicks) on public portfolios. | Public HTTP trigger. |
| **`public-share`** | `appwrite-hubs/public-share/` | Generates and validates public share links for resumes. | Public & Auth-gated. |

### Email & Notifications

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`email-service`** | `appwrite-hubs/email-service/` | Consolidated transactional email delivery (verification, password reset, welcome, DevKit test). Sends via Resend. | Public (send-password-reset) & session-gated. DevKit test requires admin auth. |
| **`email-templates`** | `appwrite-hubs/email-templates/` | Email template management and sync with Appwrite Messaging. | Server-only invocation. |
| **`admin-email`** | `appwrite-hubs/admin-email/` | Admin-triggered system email delivery. | Admin key required. |
| **`admin-testmail`** | `appwrite-hubs/admin-testmail/` | DevKit email testing utility (send test emails to verify configuration). | Admin key required. |

### Admin & DevKit

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`admin-devkit-data`** | `appwrite-hubs/admin-devkit-data/` | Admin DevKit cross-user data queries, user management, system stats, impersonation, routing config. | Admin key required (`X-DevKit-Key`) or signed DevKit session token. |
| **`admin-deploy-hubs`** | `appwrite-hubs/admin-deploy-hubs/` | Self-hosted hub deployment from the DevKit UI (alternative to GitHub Actions). | Admin key required. |
| **`admin-feature-flags`** | `appwrite-hubs/admin-feature-flags/` | Dynamic feature toggle configuration and deployment flags. | Admin key required. |
| **`admin-moderation`** | `appwrite-hubs/admin-moderation/` | User content moderation and reporting tools. | Admin key required. |
| **`admin-impersonate`** | `appwrite-hubs/admin-impersonate/` | Admin user impersonation for support/debugging. | Admin key required. Signed HMAC payload. |
| **`admin-onboarding-funnel`** | `appwrite-hubs/admin-onboarding-funnel/` | Onboarding metrics tracking and funnel analytics. | Admin key required. |
| **`admin-portfolio-usernames`** | `appwrite-hubs/admin-portfolio-usernames/` | Custom portfolio username availability checks and reservation rules. | Auth-gated & server-side validation. |
| **`admin-visitor-analytics`** | `appwrite-hubs/admin-visitor-analytics/` | Visitor tracking aggregation, geo-IP resolution, and analytics dashboard feed. | Admin key required. |
| **`admin-sentry`** | `appwrite-hubs/admin-sentry/` | Error reporting bridge to Sentry for server-side function errors. | Server-only invocation. |

### Business Logic

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`coupons`** | `appwrite-hubs/coupons/` | Coupon code validation, redemption, and management. | Server-only & Auth-gated. |
| **`wisehire-gateway`** | `appwrite-hubs/wisehire-gateway/` | WiseHire job board gateway — job listing ingestion and matching. | Server-only invocation. |

### Notes
- **`admin-sentry`** has a fixed `functionId` (`6a0760710000ff231048`) because it was created before the deploy script managed IDs.
- All functions use `DB_ID = 'main'` and access the shared Appwrite database.
- Environment variables are set per-function in the Appwrite Console and documented in each hub's `src/main.js` header.
- **`track-visitor-event`** receives visitor events without browser-derived country data. Browser code must not call GeoJS. The current deployed hub can enrich missing country from Appwrite request metadata when available and still contains a server-side GeoJS fallback; changing that fallback requires a separate targeted Appwrite review and owner-approved hub deployment.

---

## Deployment Procedures

Appwrite Functions deploy via targeted GitHub Actions workflows (`.github/workflows/deploy-ai-hubs.yml`) or via the `scripts/deploy_hubs.cjs` CLI helper.

> **Rule:** Avoid target-all deploys (`target=all`). Always specify individual function names (e.g. `--only=ai-gateway`).
