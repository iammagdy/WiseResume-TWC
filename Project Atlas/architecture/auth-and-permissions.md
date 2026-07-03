# Canonical Authentication & Permissions Specification

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/auth-and-permissions.md`  

---

## Authentication System

WiseResume uses **Appwrite Auth** exclusively for user session management.

* **Session Types:** Email/Password authentication, OAuth SSO providers (Google, GitHub), and secure OTP Password Resets.
* **OTP Password Reset Flow:** Operates via server-side Appwrite function `email-service` and server-only collection `password_reset_otps` with timing-safe HMAC challenge tokens and 5-attempt rate-limiting.

---

## Document-Level Security & Permissions

* **User Data Access:** Documents in `resumes`, `profiles`, and `portfolios` specify permissions granting access only to the owner (`Permission.read(Role.user(userId))`, `Permission.update(Role.user(userId))`).
* **Document Security Enabled (`documentSecurity: true`):** Active on `notifications`, `portfolio_visits`, and `portfolio_history` collections to ensure Appwrite strictly enforces individual document permissions.
* **Admin Privileges:** Cross-user data reads and administrative actions require server API keys authenticated through serverless Appwrite Functions (`admin-devkit-data`). Client-side database bypassing is strictly prohibited.
