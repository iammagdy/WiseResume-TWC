# Canonical Authentication & Permissions Specification

**Last Verified:** 2026-07-21
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/auth-and-permissions.md`  

---

## Authentication System

WiseResume uses **Appwrite Auth** exclusively for user session management.

* **Session Types:** Email/Password authentication, OAuth SSO providers (Google, GitHub), and secure OTP Password Resets.
* **OTP Password Reset Flow:** Operates via server-side Appwrite function `email-service` and server-only collection `password_reset_otps` with timing-safe HMAC challenge tokens and 5-attempt rate-limiting.

---

## Document-Level Security & Permissions

* **User Data Access:** Documents in `resumes`, `profiles`, `portfolios`, `user_preferences`, `jobs`, and `job_applications` specify permissions granting access only to the owner (`Permission.read(Role.user(userId))`, `Permission.update(Role.user(userId))`, `Permission.delete(Role.user(userId))` where deletion is allowed by the feature).
* **Owner-Scoped Collection Model:** `user_preferences`, `jobs`, and `job_applications` have `documentSecurity: true` and collection permissions restricted to `create("users")`. They must not use `Role.any()`, collection-wide read/update/delete permissions, or cross-user browser queries.
* **Document Security Enabled (`documentSecurity: true`):** Active on `notifications`, `portfolio_visits`, `portfolio_history`, `user_preferences`, `jobs`, and `job_applications` collections to ensure Appwrite strictly enforces individual document permissions.
* **Legacy Tailor History:** `tailor_history` is server-only legacy history. Browser runtime must derive current tailoring history from owner-scoped `resumes` lineage and tailoring metadata instead of querying `tailor_history`.
* **Admin Privileges:** Cross-user data reads and administrative actions require server API keys authenticated through serverless Appwrite Functions (`admin-devkit-data`). Client-side database bypassing is strictly prohibited.
