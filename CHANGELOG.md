# Changelog

All notable changes to WiseResume are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## 2026-04-15

### Security — Bot & Scraper Protection

**Goal:** Prevent bots and scrapers from harvesting user data and abusing public endpoints without requiring Cloudflare or any DNS changes.

#### Added
- `supabase/functions/_shared/botGuard.ts` — shared bot-guard utility with:
  - `isMaliciousBot(ua)` — fingerprints 35+ known scraper tools and automation libraries (Python requests/urllib/httpx, Scrapy, curl, wget, Selenium, Playwright, Puppeteer, Go/Java/Ruby HTTP clients, vulnerability scanners like Nuclei and Nikto, etc.)
  - `isKnownCrawler(ua)` — allow-list of legitimate search/social crawlers (Googlebot, Bingbot, Twitterbot, facebookexternalhit, LinkedInBot, SlackBot, DiscordBot, Telegram, Apple, Yandex, DuckDuckGo)
  - `hasForeignReferer(referer, allowedHosts)` — detects requests whose Referer header comes from an external domain
  - `botBlockedResponse(corsHeaders)` — standard 403 JSON response

- **`track-portfolio-view`** now has three layers of protection:
  1. User-Agent fingerprinting → 403 for known scraper tools
  2. Referer validation → 403 if request did not originate from `thewise.cloud` or `localhost`
  3. IP rate limit → 429 after 30 requests/minute per IP (database-backed, persists across instances)

- **`og-image`** now blocks malicious bots while still allowing legitimate crawlers for link previews:
  - User-Agent fingerprinting (skips known crawlers so social previews stay intact)
  - IP rate limit → 429 after 60 requests/minute per IP

- **`portfolio-meta`** bot guard added:
  - Malicious bots blocked before any DB query
  - Replaced local inline `isCrawler()` with the shared `isKnownCrawler()` from botGuard
  - Known crawlers (for SEO/social previews) are still allowed through

- **`checkIpRateLimit(ip, endpoint, maxRequests, windowSeconds)`** added to `_shared/rateLimiter.ts`:
  - Persistent, database-backed IP rate limiting using the existing `rpc_rate_limits` table
  - Fail-open on DB error (logs the error; does not block legitimate users during outages)
  - Skips limiting when the client IP cannot be determined (avoids bucketing all unknown-IP requests together)

#### Changed
- `public/robots.txt` — `User-agent: *` now has `Disallow: /p/` so generic scrapers cannot index portfolio pages. Named crawlers (Googlebot, Bingbot, Twitterbot, facebookexternalhit) keep `Allow: /`. Sitemap directive added.

---

### Security — Email Obfuscation

**Goal:** Prevent bots from harvesting contact email addresses by reading the raw HTML of public portfolio pages.

#### Changed
- `src/components/portfolio/public/PublicHero.tsx` — the "Get in Touch" button no longer contains `href="mailto:..."` in static HTML. The email is split into `data-eu` (user part) and `data-ed` (domain part) attributes and assembled into a `mailto:` link only when a real user clicks the button. Zero change in UX.
- `src/components/portfolio/public/StickyHeader.tsx` — same obfuscation pattern applied to the sticky header "Get in Touch" button.

---

### Feature — Trust & Privacy Messaging

**Goal:** Show users specific, plain-language explanations of how their data is protected — not generic badge-style marketing copy.

#### Added
- `src/components/landing/TrustSection.tsx` — new "Your privacy is protected" section on the landing page with 4 callout cards:
  1. **Your email stays hidden from bots** — explains the email obfuscation
  2. **You control who sees your portfolio** — explains the public/private toggle
  3. **AI can't be spammed on your behalf** — explains HMAC session tokens on the portfolio AI chat
  4. **Your resume data is yours** — stored securely, never shared or used to train models
  - Fully dark/light mode aware using the existing `--lp-*` CSS variable system
  - Uses scroll-animation (`lp-animate`) consistent with all other landing sections
  - Positioned after the feature sections and before the footer

- **Portfolio editor security note** — a small inline note with a green `ShieldCheck` icon appears beneath the contact email input in both editor views (`MoreTab.tsx` and `ProfileSection.tsx`):
  > "Hidden from bots — only real visitors clicking the button can see it."

#### Changed
- `src/pages/Index.tsx` — `<TrustSection />` inserted between the "Everything you need" feature grid and the PWA install strip.

---

### Fix — Portfolio Page Accessibility & Quality (Tasks #5, #6, #7)

**Goal:** Address 18 findings from a megz-design audit covering accessibility, touch targets, contrast, animation, and code quality.

#### Fixed
- **Task #5 — Accessibility & touch targets:**
  - All interactive elements on public portfolio pages meet the 44×44 px minimum touch target
  - Muted colour `#9ca3af` replaced with theme-aware contrast-safe values on light themes
  - Missing `aria-label` attributes added to icon-only buttons (LinkedIn, GitHub, X, Website)
  - Focus ring styles made visible and consistent across themes

- **Task #6 — Interaction & animation quality:**
  - Scroll-triggered entrance animations smoothed (cubic-bezier easing, staggered delays)
  - Active/press states (`active:scale-95`) added to all interactive portfolio elements
  - `prefers-reduced-motion` respected — animations disabled for users who opt out
  - Hover scale transitions unified across social link buttons and CTA

- **Task #7 — Design tokens, fonts & polish:**
  - Portfolio theme CSS variables consolidated (`--pf-heading-font`, `--pf-body-font`, etc.)
  - Font loading strategy improved — display swap, subset loading
  - Light theme text contrast values corrected across all 9 portfolio themes
  - Consistent border radius and spacing tokens applied

---

### Fix — Landing Page Performance & Cleanup

**Goal:** Fix FCP regression and remove dead bundle weight.

#### Fixed
- `src/pages/Index.tsx` — removed orphaned `PageLoadingSpinner` import and Supabase 401 warm-up fetch that were causing a network error on every page load

#### Removed
- **Phase 2 cleanup:** Three.js, GSAP, and all debug `console.log` calls removed from the bundle — significant reduction in initial JS payload

#### Changed
- **Phase 1:** Fixed landing page import errors causing blank screen on first load
- **Phase 3:** UX flow improvements — CTA pulse animation, hero trust badges, feature ticker

---

## Protection Summary (as of 2026-04-15)

| Threat | Layer |
|---|---|
| Bots reading contact emails from HTML | Email split into JS-only data attributes |
| Bots indexing portfolio pages | `robots.txt` `Disallow: /p/` |
| Scraper tools hitting public endpoints | User-Agent fingerprinting → 403 |
| External tools calling analytics API directly | Referer validation → 403 |
| IP-based flooding of public endpoints | DB-backed rate limiting (30–60 req/min) |
| Spam abuse of portfolio AI chat | HMAC session tokens |
| AI feature abuse by authenticated users | Per-user rate limits on every AI function |
| Unauthenticated data access | Supabase RLS on every table |
| Credit double-spending | Atomic DB function for credit deduction |
