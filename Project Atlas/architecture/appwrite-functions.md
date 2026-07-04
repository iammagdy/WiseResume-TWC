# Canonical Appwrite Functions Specification

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/appwrite-functions.md`  

---

## Overview

WiseResume uses Appwrite Cloud Serverless Functions (`appwrite-hubs/`) to execute secure server-side logic, AI provider gateway calls, admin DevKit operations, and background tasks.

Code-adjacent `README.md` files located within `appwrite-hubs/*/` serve as short developer pointers to this canonical document.

---

## Deployed Appwrite Functions Index

| Function Name | Location in Repo | Core Purpose | Security & Permissions |
|---|---|---|---|
| **`ai-gateway`** | `appwrite-hubs/ai-gateway/` | Single server-side gateway for all AI interactions (resume tailoring, cover letters, chat, interview prep). | Server-only / Auth-gated. Validates Turnstile captcha for anonymous forms. |
| **`admin-devkit-data`** | `appwrite-hubs/admin-devkit-data/` | Admin DevKit cross-user data queries, user management, and system stats. | Admin key required (`X-DevKit-Key`). Browser DB calls prohibited for cross-user data. |
| **`admin-email`** | `appwrite-hubs/admin-email/` | System email delivery & transactional email templates. | Server-only invocation. |
| **`admin-feature-flags`** | `appwrite-hubs/admin-feature-flags/` | Dynamic feature toggle configuration and deployment flags. | Admin key required. |
| **`admin-moderation`** | `appwrite-hubs/admin-moderation/` | User content moderation and reporting tools. | Admin key required. |
| **`admin-onboarding-funnel`** | `appwrite-hubs/admin-onboarding-funnel/` | Onboarding metrics tracking and funnel analytics. | Admin key required. |
| **`admin-portfolio-usernames`** | `appwrite-hubs/admin-portfolio-usernames/` | Custom portfolio username availability checks and reservation rules. | Auth-gated & server-side validation. |
| **`admin-visitor-analytics`** | `appwrite-hubs/admin-visitor-analytics/` | Visitor tracking aggregation, geo-IP resolution, and analytics dashboard feed. | Admin key required. |
| **`inspect-ai-keys`** | `appwrite-hubs/inspect-ai-keys/` | DevKit AI provider key inspection, slot model override management, and real completion test pings (`test-ai-key-slot`, `test-ai-provider`, `test-all-ai-keys`). | Admin key / DevKit signed session token required. |

---

## Deployment Procedures

Appwrite Functions deploy via targeted GitHub Actions workflows (`.github/workflows/deploy-ai-hubs.yml`) or via the `scripts/deploy_hubs.cjs` CLI helper.

> **Rule:** Avoid target-all deploys (`target=all`). Always specify individual function names (e.g. `--only=ai-gateway`).
