# Feature Specification: Public & Private Portfolios

**Last Verified:** 2026-07-03  
**Status:** Active Production Feature  
**Location:** `Project Atlas/features/portfolio.md`  

---

## 1. User Goal
Allows job seekers to publish interactive online portfolios, customize layout and section styling, protect portfolios with OTP/password gates, receive visitor messages via branded email & in-app notifications, and track visitor analytics.

---

## 2. Routes & Navigation
* `/portfolio/editor` — Authenticated portfolio management & styling editor.
* `/p/:username` — Public portfolio view for visitors.
* `/ar/p/:username` — Arabic localized public portfolio view.

---

## 3. Main Frontend Files
* `src/pages/PortfolioEditorPage.tsx` — Main portfolio customization controller.
* `src/pages/PublicPortfolioPage.tsx` — Public portfolio renderer for visitors.
* `src/components/portfolio/PortfolioPasswordGate.tsx` — "Scout" mascot password gate with lens-cover animations.
* `src/components/portfolio/PortfolioContactForm.tsx` — Visitor contact form with Cloudflare Turnstile bot protection.
* `src/hooks/usePublicPortfolio.ts` — Data fetching hook for public portfolio payloads.

---

## 4. Related Appwrite Functions & Collections
* **Functions:** `ai-gateway` (contact form submission & Turnstile validation), `admin-visitor-analytics`, `portfolio-settings` (password protection helper).
* **Collections:** `profiles`, `portfolios`, `portfolio_visits`, `portfolio_interactions`, `notifications`.
* **Document Security:** `documentSecurity: true` enabled on `portfolio_visits` and `notifications` so document-level read permissions are strictly enforced.

---

## 5. Current Behavior
* Visitors can view published portfolios, browse resume sections, send direct messages via the Turnstile-protected contact form, and interact with the AI assistant chat launcher.
* Portfolio owners receive in-app notifications and branded HTML emails when a visitor submits the contact form.
* Password-protected portfolios render the Scout mascot password gate requiring valid passcode entry.

---

## 6. Important Rules & Constraints
* Owner contact email and internal `user_id` are strictly excluded from public DOM and JSON-LD payloads.
* Turnstile verification endpoint uses `v0/siteverify` (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
* Custom domain management is marked "Coming Soon".

---

## 7. Known Risks & Edge Cases
* Cloudflare Turnstile site key must be present in Vercel environment variables for contact form submission.

---

## 8. Historical Evidence & Reports
* [`Project Atlas/reports/historical-audits/portfolio-feature-issues.md`](../reports/historical-audits/portfolio-feature-issues.md) — Legacy portfolio issue log.
* [`Project Atlas/reports/portfolio-audit-2026-06-22/PORTFOLIO_FULL_DISCOVERY_AUDIT.md`](../reports/portfolio-audit-2026-06-22/PORTFOLIO_FULL_DISCOVERY_AUDIT.md) — Portfolio discovery audit.
* [`Project Atlas/qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md`](../qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md) — Portfolio notifications QA report.
