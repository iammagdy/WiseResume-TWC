> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# WiseResume Appwrite Backend Architecture Specification

**Last Verified:** 2026-07-03  
**Status:** Canonical Backend Specification  
**Location:** `Project Atlas/architecture/backend.md`  

---

## 1. Backend Foundation

WiseResume is built natively on **Appwrite Cloud** (`https://fra.cloud.appwrite.io/v1`).

* **Project ID:** `69fd362b001eb325a192`
* **Database ID:** `main`
* **Storage Bucket:** `avatars`
* **Authentication:** Appwrite Auth

---

## 2. Database Schema & Collections

Appwrite Databases manages all user data, resumes, tailoring histories, and portfolios across 96+ live collections.

### Core Collections Overview:
* `profiles` — User profile metadata, avatar URLs, and portfolio settings.
* `resumes` — Saved resume documents and JSON section payloads.
* `tailor_history` — Historical resume tailoring runs, job descriptions, and score deltas.
* `portfolios` — Public portfolio configurations and custom subpaths.
* `portfolio_visits` — Analytics records of visitor views.
* `notifications` — In-app user notifications for contacts, visits, and system updates.
* `password_reset_otps` — Server-only collection for secure OTP password reset tokens.

---

## 3. Serverless Functions Architecture (`appwrite-hubs/`)

Serverless Functions run on Appwrite Cloud to execute sensitive operations, API integrations, and admin tooling:

1. **`ai-gateway`** (`appwrite-hubs/ai-gateway/`):
   * Consolidates all AI API calls (resume tailoring, cover letter generation, interview prep).
   * Enforces Cloudflare Turnstile token validation for anonymous contact forms.

2. **`admin-devkit-data`** (`appwrite-hubs/admin-devkit-data/`):
   * Executes privileged cross-user data operations for the internal `/devkit` dashboard.
   * Authenticates via `X-DevKit-Key`.

3. **`admin-visitor-analytics`** (`appwrite-hubs/admin-visitor-analytics/`):
   * Aggregates visitor stats, country geo-location, and analytics metrics.

4. **`email-service`** (`appwrite-hubs/email-service/`):
   * Handles transactional emails, OTP password reset verification, and email dispatch.

---

## 4. Security & Permissions Model

* **Client Access:** Users access their own documents using document-level permissions (`Permission.read(Role.user(userId))`, `Permission.update(Role.user(userId))`).
* **Server-Side Admin Access:** Operations requiring elevated permissions run via Appwrite Functions using server API keys.
* **Document Security:** Enabled (`documentSecurity: true`) on sensitive collections (`notifications`, `portfolio_visits`, `portfolio_history`) to prevent unauthorized cross-user access.
