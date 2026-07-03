# Feature Specification: DevKit Admin Hub

**Last Verified:** 2026-07-03  
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
* **Functions:** `admin-devkit-data` (executes cross-user DB queries), `admin-visitor-analytics`, `admin-feature-flags`.
* **Collections:** `profiles`, `resumes`, `portfolio_visits`.

---

## 5. Current Behavior
* Requires DevKit password entry authenticated via server-side Appwrite function `admin-devkit-data` using header key `X-DevKit-Key`.
* Provides real-time user lookup, visitor geo-location maps, and active feature toggle controls.

---

## 6. Important Rules & Constraints
* Browser-side client SDK calls are strictly forbidden from reading cross-user data; all DevKit data operations MUST route through `admin-devkit-data`.
* Password gate must lock out invalid attempts.

---

## 7. Known Risks & Edge Cases
* `X-DevKit-Key` is stored securely in Appwrite Function environment variables.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/audits/2026-05-02-devkit-health.md`](../reports/audits/2026-05-02-devkit-health.md) — DevKit health audit.
* [`Project Atlas/reports/audits/2026-06-20-devkit-live-audit.md`](../reports/audits/2026-06-20-devkit-live-audit.md) — DevKit live audit.
* [`Project Atlas/reports/WISERESUME_DEVKIT_VISITORS_AUDIT.md`](../reports/WISERESUME_DEVKIT_VISITORS_AUDIT.md) — DevKit visitor analytics audit.
