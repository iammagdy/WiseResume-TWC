# Canonical Appwrite Backend Architecture

**Last Verified:** 2026-07-21
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
* Browser CSP must allow Appwrite API and Realtime only through the narrow Appwrite origins: `https://fra.cloud.appwrite.io` and `wss://fra.cloud.appwrite.io`.
