# Feature Specification: DevKit Admin Hub

**Last Verified:** 2026-07-04
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/devkit-admin.md`  

---

## 1. User Goal
Provides administrators and operators with an internal Operations Hub (`/devkit`) for system diagnostics, user management, visitor analytics, feature flag toggles, and AI health monitoring.

---

## 2. Routes & Navigation
* `/devkit` — Internal Operations Hub route.
* Tabs: Overview, Users, Visitors, Traffic, Feature Flags, System Health, Support.

---

## 3. Main Frontend Files
* `src/pages/DevKitPage.tsx` — DevKit layout and password gate controller.
* `src/components/devkit/DevKitGate.tsx` — DevKit authentication modal.
* `src/components/devkit/tabs/*` — Tab views for Users, Visitors, Feature Flags, and System Health.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `admin-devkit-data` (cross-user operations and Act As issuance), `admin-impersonate` (Act As verification/revocation), `email-service` (admin-triggered verification and password-reset-code delivery), `admin-visitor-analytics`, `admin-feature-flags`.
* **Collections:** `profiles`, `resumes`, `portfolio_visits`, `admin_impersonation_sessions`, `admin_audit_logs`.
* **Required Function Environment Variables:**
  - `EMAIL_SERVICE_INTERNAL_HMAC_SECRET`: Required dedicated internal HMAC signing secret for cross-function authentication between `admin-devkit-data` and `email-service` (must be configured on both functions before deployment).

---

## 5. Current Behavior
* Requires DevKit password entry authenticated via server-side Appwrite function `admin-devkit-data` using header key `X-DevKit-Key`.
* Provides real-time user lookup, visitor geo-location maps, and active feature toggle controls.
* Function deployment drift accepts both complete SHA-256 hashes and the legacy stored 16-character prefixes.
* User controls are grouped into Access, Account, Moderation, and Advanced areas. Identity-collision actions are drawer-only, require a confirmed collision, and suspend the duplicate profile without transferring data.
* Admins can send the existing password-reset OTP flow to the selected Appwrite Auth user. Requests route through `admin-devkit-data` (which resolves the user's email) and pass an internal HMAC-signed payload (`EMAIL_SERVICE_INTERNAL_HMAC_SECRET`) to `email-service`. The code is never returned to DevKit, and a success audit is written only after delivery succeeds.
* Act As sessions are fail-closed and stored in the server-only `admin_impersonation_sessions` collection provisioned by the targeted Appwrite Hubs workflow.

---

## 6. Important Rules & Constraints
* Browser-side client SDK calls are strictly forbidden from reading cross-user data; all DevKit data operations MUST route through `admin-devkit-data`.
* Password gate must lock out invalid attempts.
* Password-reset actions are send-code-only. DevKit must never display or log OTPs, challenge tokens, email bodies, or provider payloads.
* Implementation completed locally. Deployment NOT performed.
* Required env var before deploy: `EMAIL_SERVICE_INTERNAL_HMAC_SECRET` must be set on both `admin-devkit-data` and `email-service`.
* Recommended manual Appwrite deploy target after owner approval: `admin-devkit-data,email-service` (`admin-impersonate` was not changed in this pass and should not be deployed).

---

## 7. Known Risks & Edge Cases
* `X-DevKit-Key` is stored securely in Appwrite Function environment variables.
* Live verification on 2026-07-04 confirmed schema provisioning, hash synchronization, and Act As lifecycle behavior. Admin password-reset architecture has been updated to route via `admin-devkit-data` → `email-service` internal HMAC signing (`EMAIL_SERVICE_INTERNAL_HMAC_SECRET`), eliminating browser-held backend credentials and resolving the HTTP 401 boundary error. Pending owner-approved deployment of `admin-devkit-data,email-service`.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/audits/2026-05-02-devkit-health.md`](../reports/audits/2026-05-02-devkit-health.md) — DevKit health audit.
* [`Project Atlas/reports/audits/2026-06-20-devkit-live-audit.md`](../reports/audits/2026-06-20-devkit-live-audit.md) — DevKit live audit.
* [`Project Atlas/reports/WISERESUME_DEVKIT_VISITORS_AUDIT.md`](../reports/WISERESUME_DEVKIT_VISITORS_AUDIT.md) — DevKit visitor analytics audit.
