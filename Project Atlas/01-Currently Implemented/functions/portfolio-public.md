# portfolio-public

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/portfolio-public/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #49)

---

## What it does

Consolidated router for the 4 anonymous-readable portfolio public functions. Frees 3 deployment slots under the 100-function Supabase limit.

| Action | Was | Method | Purpose |
|---|---|---|---|
| `meta` | `portfolio-meta` | GET | Returns OpenGraph + portfolio data for SSR meta injection |
| `interest` | `portfolio-interest` | POST | Records visitor "I'm interested" lead capture |
| `track-view` | `track-portfolio-view` | POST | Records an anonymous visit (used by `navigator.sendBeacon`) |
| `resolve-short-link` | `resolve-short-link` | GET | Resolves `/l/<slug>` short link to its destination URL |

## Dispatch

Priority order:
1. **`?action=` query parameter** — preferred. The web helper `apiFnUrl()` always rewrites legacy fn names with this query. Used by `sendBeacon` (no custom headers allowed) and crawlers.
2. **`body.action` JSON field** — fallback for future callers that prefer body dispatch.

When (1) succeeds, the router does **not** touch the body — it forwards the original Request unchanged so each sub-handler's `await req.json()` runs on the untouched stream and malformed-JSON 400 envelopes (e.g. `{ error: 'Invalid JSON' }`) are byte-for-byte identical to pre-merge behavior.

## Anti-abuse

- `isMaliciousBot(ua)` blocks scraper UAs (preserves `isKnownCrawler` allowlist for SEO/social previews)
- `checkIpRateLimit(ip, 'portfolio-meta', 120, 60)` — 120 req/min per IP, exempt for known crawlers
- `Retry-After` header on 429 responses

## CORS posture

`resolve-short-link` keeps wildcard `Access-Control-Allow-Origin: *` (clicked from arbitrary external `/l/<slug>` links). Other 3 actions use the standard origin allow-list from `_shared/cors.ts`.

## DB tables / RPCs

- `profiles` (portfolio data + username lookup)
- `portfolio_interactions` (interest leads)
- `short_links` (slug → URL)
- RPC: `record_portfolio_visit` (atomic increment + `portfolio_visits` row)
