# Feature Specification: Public & Private Portfolios

**Last Verified:** 2026-07-22
**Status:** Active Production Feature - Performance Phase 3 Pass with Cold-Mobile LCP Warning
**Location:** `Project Atlas/features/portfolio.md`

---

## 1. User Goal

Allows job seekers to publish interactive online portfolios, customize layout and section styling, protect portfolios with password gates, receive visitor messages and in-app notifications, and track visitor analytics.

---

## 2. Routes & Navigation

* `/portfolio/editor` - Authenticated portfolio management and styling editor.
* `/p/:username` - Public portfolio view for visitors.
* `/ar/p/:username` - Arabic localized public portfolio view.

---

## 3. Main Frontend Files

* `src/pages/PortfolioEditorPage.tsx` - Main portfolio customization controller.
* `src/pages/PublicPortfolioPage.tsx` - Public portfolio renderer and optional-content scheduler.
* `src/components/portfolio/public/PublicHero.tsx` - Above-the-fold public profile and optimized avatar renderer.
* `src/components/portfolio/public/PortfolioPasswordGate.tsx` - "Scout" mascot password gate.
* `src/components/portfolio/public/PortfolioContactForm.tsx` - Visitor contact form with Cloudflare Turnstile protection.
* `src/hooks/usePublicPortfolio.ts` - Server-function gate and sanitized public payload queries.
* `src/lib/publicAvatar.ts` - Appwrite Storage preview URL and responsive source policy.

---

## 4. Backend and Data

* **Appwrite Functions:** `portfolio-gate`, `get-public-portfolio`, `portfolio-settings`, `ai-gateway`, and `admin-visitor-analytics`.
* **Vercel APIs:** `/api/portfolio-interest` and `/api/track-portfolio-view`.
* **Collections:** `profiles`, `portfolios`, `portfolio_visits`, `portfolio_interactions`, and `notifications`.
* **Document Security:** `documentSecurity: true` is enabled on `portfolio_visits` and `notifications`; owner notification reads remain owner-scoped.

---

## 5. Current Behavior

* Visitors can view published portfolios, browse resume sections, send direct messages through the Turnstile-protected contact form, and use the AI chat launcher.
* Portfolio owners receive in-app notifications and branded email for supported visitor actions.
* Password-protected portfolios render the Scout password gate and require server-side verification.
* Exact `/p/:username` and `/ar/p/:username` routes bypass authenticated `AppInterior`. Gate and sanitized public-data requests begin in the route shell and share TanStack Query keys with the page.
* The hero avatar uses first-party Appwrite `/preview` WebP transforms with responsive widths, explicit dimensions, eager loading, and high fetch priority. External and legacy avatar URLs keep existing fallback behavior.
* PublicSections, contact setup, and chat load four seconds after portfolio data. Monitoring loads after ten seconds on exact portfolio routes. Analytics semantics are preserved and execute after render.

---

## 6. Important Rules & Constraints

* Owner contact email, owner/internal IDs, `password_hash`, and `portfolio_settings` are excluded from public payloads and DOM contracts.
* Never replace the server-function gate with direct browser collection reads.
* The hero must remain independent of Framer Motion and optional sections. Exact public portfolio routes must remain excluded from global app-route prefetches.
* Turnstile verification uses `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
* Custom domain management remains Coming Soon.

---

## 7. Known Risks & Edge Cases

* Cloudflare Turnstile configuration must be present in Vercel for contact submission.
* Final throttled production cold-mobile LCP is `5.860 s` median, above the `<4.0 s` target. Mobile CLS (`0.064` median) and avatar transfer (`11.25-11.28 KB`) pass. Remaining work requires a separately approved public-entry/provider or pre-React data-start architecture decision.
* The documented `testprotected` production fixture is stale and returns `Portfolio not found`; a current safe protected fixture is required for live wrong/correct-password QA.
* Realtime notification observation requires an authenticated owner session. Anonymous QA verified the interest API transaction and notification-creation path but could not subscribe to owner-scoped notification reads.

---

## 8. Evidence & Reports

* [`Project Atlas/reports/historical-audits/portfolio-feature-issues.md`](../reports/historical-audits/portfolio-feature-issues.md) - Legacy portfolio issue log.
* [`Project Atlas/reports/portfolio-audit-2026-06-22/PORTFOLIO_FULL_DISCOVERY_AUDIT.md`](../reports/portfolio-audit-2026-06-22/PORTFOLIO_FULL_DISCOVERY_AUDIT.md) - Portfolio discovery audit.
* [`Project Atlas/qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md`](../qa/WiseResume_Portfolio_Notifications_System_2026-07-02.md) - Portfolio notifications QA report.
* [`Project Atlas/reports/performance/performance-phase-3-public-portfolio-remediation-2026-07-22.md`](../reports/performance/performance-phase-3-public-portfolio-remediation-2026-07-22.md) - Current mobile performance remediation and production evidence.
