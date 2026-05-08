# wisehire-access

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/wisehire-access/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #50)

---

## What it does

Consolidated router for the 5 anonymous / user-gated WiseHire onboarding & access functions. Replaces (5 → 1):

| `body.action` | Was | Auth | Purpose |
|---|---|---|---|
| `waitlist-check-email` | `wisehire-waitlist-check-email` | Anonymous | Returns whether an email is already on the WiseHire waitlist; consumer-domain detection (`gmail`, `yahoo`, etc.) |
| `waitlist-join` | `wisehire-waitlist-join` | Anonymous | Adds an email to `wisehire_waitlist`; sends branded confirmation email; subscribes to Resend audience |
| `validate-early-access` | `wisehire-validate-early-access` | Anonymous | Validates a one-time early-access code |
| `validate-invite` | `wisehire-validate-invite` | Anonymous | Validates an HMAC-signed invite token (paired with `admin-wisehire/invite`) |
| `complete-signup` | `wisehire-complete-signup` | Bearer required | Finalizes signup: provisions `wisehire_companies` row, sets `profiles.account_type = 'wisehire'` |

Each sub-handler is a byte-for-byte port of its pre-merge function — same auth posture, validation, response shapes, error codes, status codes, shared helpers.

## Anti-abuse

- `isMaliciousBot(ua)` blocks scraper UAs (returns `botBlockedResponse`)
- `checkIpRateLimit(ip, '<action>', 30, 60)` — 30 req/min per IP per action
- `Retry-After` header on 429

## Consumer-domain blocklist

`CONSUMER_DOMAINS` set rejects work-email-only signups from `gmail.com`, `yahoo.*`, `hotmail.*`, `outlook.*`, `icloud.com`, `aol.com`, `protonmail.com`, `gmx.*`, `qq.com`, `163.com`, `naver.com`, etc.

## DB tables / external services

- `wisehire_waitlist`, `wisehire_invites`, `profiles`, `wisehire_companies`
- Resend audiences (`addContact` with `AUDIENCE_KEYS.WISEHIRE_*`)
- Branded WiseHire email (Inter font, `WISEHIRE_BLUE = '#1D4ED8'`, logo from `emails` storage bucket)

## Method posture

`waitlist-check-email`: 405 on non-POST. `validate-*`: standard POST. Malformed body returns the original 500 envelope per pre-merge parity.
