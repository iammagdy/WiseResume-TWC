# Feature Specification: In-App Notifications & Bell Dropdown

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/notifications.md`  

---

## 1. User Goal
Informs portfolio owners and active job seekers about visitor messages, portfolio views, AI tailoring completions, and system updates.

---

## 2. Routes & Navigation
* `/notifications` — Full notifications management page.
* Top Bar Bell Popover — Interactive dropdown on desktop view.

---

## 3. Main Frontend Files
* `src/pages/NotificationsPage.tsx` — Full notification management page.
* `src/components/layout/AppWorkspaceTopBar.tsx` — Top bar containing Bell icon and YouTube-style Popover dropdown.
* `src/hooks/useNotifications.ts` — Custom hook for fetching and marking notifications as read.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (creates notifications when contact form is submitted), `email-service`.
* **Collections:** `notifications`.
* **Collection Security:** Enabled (`documentSecurity: true`) on `notifications` with `read("user:<userId>")` permissions.

---

## 5. Current Behavior
* Top-bar Bell displays an unread count badge (e.g. `3`).
* Clicking the Bell on desktop opens a Popover listing the 5 latest notifications with specialized icons, timestamps, and "Mark all as read" button.
* Mobile view redirects directly to `/notifications`.

---

## 6. Important Rules & Constraints
* Document Security MUST remain enabled on `notifications` collection so users only receive their own notifications.
* Branded HTML emails (`#9E1B22` crimson header) accompany portfolio contact notifications.

---

## 7. Known Risks & Edge Cases
* `setup_portfolio_security.cjs` script configures database collection security.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md`](../qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md) — Notifications implementation & verification report.
