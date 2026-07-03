# Feature Specification: User Dashboard

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/dashboard.md`  

---

## 1. User Goal
The User Dashboard provides authenticated job seekers with a central command center to view saved resumes, access AI tailoring tools, manage public portfolio settings, check recent activity, and navigate to core product flows.

---

## 2. Routes & Navigation
* `/dashboard` — Main authenticated dashboard view.
* `/ar/dashboard` — Arabic localized dashboard view.

---

## 3. Main Frontend Files
* `src/pages/DashboardPage.tsx` — Dashboard controller and layout.
* `src/components/dashboard/ResumesGrid.tsx` — Saved resumes grid and creation triggers.
* `src/components/dashboard/ActivityFeed.tsx` — Server-backed activity feed component.
* `src/components/layout/AppWorkspaceTopBar.tsx` — Top bar with notifications Bell and user profile menu.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `admin-visitor-analytics` (for user activity stats).
* **Collections:** `profiles`, `resumes`, `tailor_history`, `notifications`.
* **Storage:** `avatars` bucket for profile picture rendering.

---

## 5. Current Behavior
* Authenticated users see a list of their saved resume drafts with real-time status indicators.
* Displays quick-action triggers to create a new resume, import a CV/PDF, access Tailoring Hub, or open the Portfolio Editor.
* Includes top bar Bell popover showing the 5 latest notifications with unread badges.

---

## 6. Important Rules & Constraints
* Free users see billing status as "Coming Soon" or standard tier; no fabricated tip stats or intrusive upgrade popups.
* Clicking sidebar/header logo inside authenticated sessions redirects to `/dashboard`.

---

## 7. Known Risks & Edge Cases
* If Appwrite Auth session expires, dashboard redirects cleanly to login page (`/auth`).

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/dashboard-ux-audit.md`](../reports/dashboard-ux-audit.md) — Historical dashboard UX audit.
* [`Project Atlas/reports/ui-ux-audit-2026-06-22/00_EXECUTIVE_SUMMARY.md`](../reports/ui-ux-audit-2026-06-22/00_EXECUTIVE_SUMMARY.md) — 2026-06-22 UI/UX audit findings.
