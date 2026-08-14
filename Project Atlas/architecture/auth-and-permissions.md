# Canonical Authentication & Permissions Specification

**Last Verified:** 2026-08-13
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/auth-and-permissions.md`  

---

## Authentication System

WiseResume uses **Appwrite Auth** exclusively for user session management.

* **Session Types:** Email/Password authentication, OAuth SSO providers (Google, GitHub), and secure OTP Password Resets.
* **Email/password login error contract (merged PR #183, 2026-08-14):** The confirmed root cause was that the production login path converted every Appwrite authentication failure into the generic `Invalid email or password` message. The login flow now preserves that generic message for confirmed invalid credentials while safely distinguishing network/timeout, rate-limit, Appwrite/service-unavailable, and unknown authentication failures without exposing provider internals, credentials, tokens, secrets, or sensitive fingerprints. Safe internal diagnostics retain only bounded error class/code/status, request stage, and an available correlation/request identifier; passwords and credential values are never logged.
* **Submit-time form contract (merged PR #183):** Sign-in reconciles the current DOM email/password values at submit time so stale controlled state from browser autofill or password-manager insertion cannot replace the values submitted to Appwrite. Surrounding whitespace is trimmed from the email only. The password is passed exactly as entered and is not trimmed, lowercased, normalized, or otherwise transformed. Focused regression coverage verifies normal login, classified failures, paste/autofill-style synchronization, submit-time DOM reconciliation, email-only trimming, and exact password preservation.
* **Historical incident boundary:** A specific autofill/password-manager state mismatch remains `UNCONFIRMED` as the cause of the historical production incident. The verified root cause is the error-message masking described above.
* **OTP Password Reset Flow:** Operates via server-side Appwrite function `email-service` and server-only collection `password_reset_otps` with timing-safe HMAC challenge tokens and 5-attempt rate-limiting.
* **Email verification delivery (production verified 2026-08-13):** The authenticated `email-service` action makes exactly one official Appwrite Account verification request. Appwrite is the single source of truth for the token, Custom SMTP/Resend transport, template, and existing completion flow. Browser callers receive factual request acceptance only (`success`, `delivery: 'appwrite'`, `providerAccepted: true`); that does not itself claim inbox delivery. The function does not return a verification secret or Appwrite API key, and no direct Resend verification branch or server-token helper is used.
* **Production evidence:** following correction of the Appwrite Verification template to include a non-empty subject/body and `{{redirect}}`, one controlled resend was accepted by Appwrite through `email-service` with HTTP `200`, recorded by Resend as `delivered`, and confirmed by the owner. The normal verification link and explicit WiseResume action completed the Appwrite lifecycle, marked the user verified, routed to onboarding, and sent a delivered welcome email. No manual Appwrite verification was used.
* **Historical failure (2026-08-11):** earlier accepted sends did not reach the inbox and had no Resend event. That investigation is retained as historical evidence; its root cause was the malformed Appwrite Verification template, and it is no longer an owner-action or delivery blocker.
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
