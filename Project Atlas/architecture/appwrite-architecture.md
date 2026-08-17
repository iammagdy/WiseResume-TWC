# Canonical Appwrite Backend Architecture

**Last Verified:** 2026-08-17
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/appwrite-architecture.md`  

---

## Overview

WiseResume is an Appwrite-native application. All database persistence, user authentication, storage buckets, and serverless functions run on Appwrite Cloud (`https://fra.cloud.appwrite.io/v1`).

---

## Architectural Pillars

1. **Appwrite Auth:** Handles signups, login sessions, OAuth, and OTP password resets.
2. **Appwrite Databases:** Single database instance `main` managing 96+ collections.
3. **Appwrite Storage:** Manages avatar images, file uploads, and exported resume assets.
4. **Appwrite Serverless Functions:** Server-side Node.js hubs handling AI proxying (`ai-gateway`), DevKit administration (`admin-devkit-data`), analytics (`admin-visitor-analytics`), and transactional emails (`email-service`).

---

## Key Rules

* Non-Appwrite backends (Supabase, Kinde, Firebase) are legacy and strictly prohibited.
* Cross-user queries require Appwrite Functions with server keys (`X-DevKit-Key`).
* Document Security (`documentSecurity: true`) is enforced on user-sensitive collections including `notifications`, `portfolio_visits`, `user_preferences`, `jobs`, and `job_applications`.
* Owner-scoped user collections must keep collection permissions narrowed to `create("users")`; owner read/update/delete access belongs on each document.
* `tailor_history` is legacy server-only history. Frontend history surfaces use `resumes` lineage and tailoring metadata.
* `broadcasts` is server-only with empty collection permissions. Authenticated browser delivery must use the JWT-validated, sanitized Vercel endpoint; owner mutations must use signed `admin-devkit-data` actions.
* Public resume links are capabilities brokered by `public-share`; browsers must never query `resume_shares`, `share_comments`, or another user's `resumes` document directly. The share and comment collections are server-only, while `resumes` uses `create("users")` plus exact owner document permissions.
* New resume-share bearer tokens contain 256 random bits and are stored only as digests. Protected reads use salted password hashes and short-lived signed access capabilities that are rechecked against active state, expiry, token digest, and access version. Public feedback inherits the same authorization boundary.
* The resume-share privacy migration and matching frontend are a coupled release: removing legacy collection/document permissions intentionally breaks browser-direct legacy clients, so backend schema/function and frontend publication must occur in one maintenance window and verify every resume has a valid owner.
* Browser CSP must allow Appwrite API and Realtime only through the narrow Appwrite origins: `https://fra.cloud.appwrite.io` and `wss://fra.cloud.appwrite.io`.
* Browser visitor tracking must not call third-party GeoIP endpoints directly. Visitor country enrichment is analytics-only and should stay server-side through Appwrite request metadata or an explicitly approved server-side fallback.
