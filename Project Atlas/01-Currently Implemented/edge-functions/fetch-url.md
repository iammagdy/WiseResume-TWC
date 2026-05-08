# fetch-url

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/fetch-url/index.ts`

---

## What it does

Server-side URL fetcher used by the frontend to retrieve external page content for AI parsing (e.g. job listing URL → text). Acts as a CORS-free proxy with strict SSRF protection.

**Method:** POST only
**Auth:** `requireAuth`
**Body:** `{ url: string }` (max 2000 chars)

## SSRF protection

Refuses the request when the target hostname matches any of:

- Loopback: `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
- RFC1918 private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Link-local: `169.254.0.0/16`, IPv6 `fe80::/10`
- Carrier-grade NAT: `100.64.0.0/10`
- IPv6 ULA: `fc00::/7` (`fc*`, `fd*`)
- Loopback IPv4 alt: `127.x.x.x`, `0.x.x.x`

Only `http:` and `https:` protocols are accepted (returns 400 otherwise).

## Limits

- `MAX_BYTES = 2 MiB` — response body is truncated past this size
- `MAX_REDIRECTS = 5` — manual redirect-following with hostname re-check on each hop
- `TIMEOUT_MS = 10_000` — per-request abort timer

## Response

`200 + Content-Type: application/json` with `{ url, contentType, bytes, body }` (or whatever the handler returns past line 80; see source for full envelope).
