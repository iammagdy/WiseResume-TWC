---
title: Bot & scraper protection
---
# Bot & Scraper Protection

## What & Why
Implement three layers of bot protection to prevent scrapers from harvesting users' contact info from public portfolio pages and from abusing open analytics/image endpoints. The `ask-portfolio` AI chat and all AI feature functions already have strong protection (HMAC session tokens + rate limiting). The gaps to close are: robots.txt allows everything, email addresses are plain HTML, and two public endpoints have no rate limiting.

## Done looks like
- Scraper bots visiting the site see a `robots.txt` that blocks them from indexing `/p/` (portfolio pages) while Google, Bing, Twitter, and Facebook crawlers can still access everything for SEO and link previews.
- A visitor viewing any public portfolio page cannot find a user's email address by reading the raw HTML source. Clicking "Get in Touch" still opens the mail client normally — the obfuscation is invisible to real users.
- The `track-portfolio-view` edge function rejects any IP that sends more than 30 requests per minute (a bot scraping analytics), returning HTTP 429.
- The `og-image` edge function similarly rejects IPs exceeding 60 requests per minute (reasonable for link-preview crawlers, blocking flood attacks).

## Out of scope
- Cloudflare setup (requires DNS changes outside the codebase)
- Protecting authenticated routes (already covered by Kinde + Supabase RLS)
- Modifying the portfolio editor UI (covered in the trust-messaging task)
- Adding rate limiting to admin functions (separate concern)

## Tasks
1. **Tighten robots.txt** — Update `public/robots.txt` so that `User-agent: *` has `Disallow: /p/` (blocks generic scrapers from portfolio pages). Keep `Allow: /` for Googlebot, Bingbot, Twitterbot, and facebookexternalhit so SEO and social previews continue to work. Add a `Sitemap:` directive pointing to `https://resume.thewise.cloud/sitemap.xml` for discoverability.

2. **Email obfuscation on public portfolio pages** — In `PublicHero.tsx` and `StickyHeader.tsx`, replace the direct `href="mailto:..."` attribute and any visible email string with a JavaScript-constructed value. The email should be stored split across a `data-` attribute (e.g., user part and domain part separately) and assembled into the `href` via an `onClick` or `onMouseEnter` handler, so static HTML scrapers and bots read the page and find no extractable email address. Real users clicking the button experience no change.

3. **Rate limit track-portfolio-view** — Add IP-based rate limiting to `supabase/functions/track-portfolio-view/index.ts`: extract the client IP from the `x-forwarded-for` or `x-real-ip` request header and use the existing shared `rateLimiter` utility to cap at 30 requests per minute per IP, returning HTTP 429 on breach. This prevents bots from flooding portfolio view counters.

4. **Rate limit og-image** — Apply the same IP-based rate limiting pattern to `supabase/functions/og-image/index.ts`, with a limit of 60 requests per minute per IP (generous enough for legitimate link-preview crawlers, tight enough to stop flooding).

## Relevant files
- `public/robots.txt`
- `src/components/portfolio/public/PublicHero.tsx:203-250`
- `src/components/portfolio/public/StickyHeader.tsx:37-43`
- `supabase/functions/track-portfolio-view/index.ts`
- `supabase/functions/og-image/index.ts`
- `supabase/functions/_shared/rateLimiter.ts`