# wisehire-invite-reminder

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `supabase/functions/wisehire-invite-reminder/index.ts`
- `supabase/config.toml` (JWT verification flag)

**Canonical owner:** `supabase/functions/wisehire-invite-reminder/index.ts`

---

**What it does:** Cron-triggered. Finds all WiseHire invites that expire within the next 24 hours, have not yet been used (`used_at IS NULL`), and have not already received a reminder (`reminder_sent_at IS NULL`). For each qualifying invite it sends a branded reminder email via Resend, then stamps `reminder_sent_at = now()` so the same invite never receives more than one reminder.

**Auth:** `CRON_SECRET`-gated (service-to-service only). The caller must supply the secret as `Authorization: Bearer <CRON_SECRET>`. Not intended to be called by users or admins directly.

**Trigger:** Designed to be called hourly by `pg_cron` or an external scheduler. Safe to call more often — idempotency is enforced by the `reminder_sent_at` stamp.

**Key behaviour:**
- Queries `wisehire_invites` for rows where `expires_at BETWEEN now() AND now() + interval '24 hours'` and `used_at IS NULL` and `reminder_sent_at IS NULL`.
- Sends a styled HTML email with the invite URL and expiry date/time.
- Updates `reminder_sent_at` atomically after a successful Resend call. A failed Resend call leaves `reminder_sent_at` null so the next hourly run retries.
- Returns `{ sent: N }` with a count of reminders dispatched in the run.

**Related:**
- `Project Atlas/01-Currently Implemented/functions/admin-wisehire-invite.md`
- `Project Atlas/01-Currently Implemented/functions/admin-wisehire-revoke-invite.md`
- `Project Atlas/01-Currently Implemented/database-tables/wisehire_invites.md`
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
