# Canonical Authentication & Permissions Specification

**Last Verified:** 2026-07-21
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/auth-and-permissions.md`  

---

## Authentication System

WiseResume uses **Appwrite Auth** exclusively for user session management.

* **Session Types:** Email/Password authentication, OAuth SSO providers (Google, GitHub), and secure OTP Password Resets.
* **OTP Password Reset Flow:** Operates via server-side Appwrite function `email-service` and server-only collection `password_reset_otps` with timing-safe HMAC challenge tokens and 5-attempt rate-limiting.
* **Email verification delivery:** An authenticated verification request is created once through Appwrite. Browser code must check both `{ data, error }` from the function invocation and must not promise delivery when the function reports an error. Verification secrets and Appwrite API keys never reach the browser; when Appwrite does not expose a secret to the function runtime, Appwrite owns the single mail delivery rather than triggering a duplicate Resend message.
* **Production delivery verification (2026-08-11):** after the owner completed the server-side sender configuration, official workflow run `31481279174` redeployed the exact `email-service` target with source-hash alignment. No values were inspected. Actual inbox delivery remains unverified only because the disposable-inbox provider is unavailable to the current browser; no client-side bypass or manual verification is permitted.
* **OAuth recovery:** Appwrite user ID is the identity source of truth. A missing OAuth session is a session-completion failure; a profile-seed failure after a valid session must remain an authenticated recovery state, not be described as a provider login failure.

---

## Document-Level Security & Permissions

* **User Data Access:** Documents in `resumes`, `profiles`, `portfolios`, `user_preferences`, `jobs`, and `job_applications` specify permissions granting access only to the owner (`Permission.read(Role.user(userId))`, `Permission.update(Role.user(userId))`, `Permission.delete(Role.user(userId))` where deletion is allowed by the feature).
* **Owner-Scoped Collection Model:** `user_preferences`, `jobs`, and `job_applications` have `documentSecurity: true` and collection permissions restricted to `create("users")`. They must not use `Role.any()`, collection-wide read/update/delete permissions, or cross-user browser queries.
* **Document Security Enabled (`documentSecurity: true`):** Active on `notifications`, `portfolio_visits`, `portfolio_history`, `user_preferences`, `jobs`, and `job_applications` collections to ensure Appwrite strictly enforces individual document permissions.
* **Legacy Tailor History:** `tailor_history` is server-only legacy history. Browser runtime must derive current tailoring history from owner-scoped `resumes` lineage and tailoring metadata instead of querying `tailor_history`.
* **Client persistence:** Resume drafts, tailoring history, and generated-cover-letter state are persisted per authenticated user namespace. Browser-global tailoring history must never be used as a Saved Jobs source.
* **Admin Privileges:** Cross-user data reads and administrative actions require server API keys authenticated through serverless Appwrite Functions (`admin-devkit-data`). Client-side database bypassing is strictly prohibited.

## 2026-07-24 Local Hardening Note

Untrusted login return paths are restricted to internal routes. URL import now verifies an Appwrite JWT and uses durable per-user throttling. Portfolio password throttles use only Appwrite's platform client-IP signal (or a shared unknown bucket) and fail closed on storage errors. No production deployment occurred.
