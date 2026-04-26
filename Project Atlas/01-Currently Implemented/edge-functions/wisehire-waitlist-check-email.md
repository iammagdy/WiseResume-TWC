# wisehire-waitlist-check-email

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/wisehire-waitlist-check-email/index.ts`
- `supabase/functions/_shared/botGuard.ts`
- `supabase/functions/_shared/rateLimiter.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Public endpoint that checks whether a given email address belongs to a corporate domain (i.e. not a free consumer email provider like Gmail, Yahoo, Outlook, iCloud, etc.). Used by the WiseHire waitlist form to gate sign-ups to business email addresses only. Includes bot-guard and IP rate limiting; returns `{ isCorporate: boolean }`.

**Auth:** None (public). Protected by `isMaliciousBot` bot guard and `checkIpRateLimit`.

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/wisehire-waitlist-join.md`
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
