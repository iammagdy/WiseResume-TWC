# wisehire_mask_sessions

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `supabase/migrations/20260428000000_wisehire_mask_sessions.sql`
- `supabase/functions/wisehire-mask-cvs/index.ts`

**Canonical owner:** `supabase/migrations/20260428000000_wisehire_mask_sessions.sql`

---

**What it is:** Persists CV masking (anonymisation) results for WiseHire HR users so they can revisit redacted CVs across browser sessions and devices without re-running the masking process.

**Schema:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` default |
| `owner_id` | `uuid` NOT NULL | FK → `auth.users(id)` ON DELETE CASCADE. Uses `auth.uid()` directly — no `profiles` sub-lookup needed. |
| `created_at` | `timestamptz` NOT NULL | Defaults to `now()`. |
| `results` | `jsonb` NOT NULL | Array of masked CV objects. Defaults to `'[]'`. |

**Indexes:**
- `wisehire_mask_sessions_owner_created_idx` on `(owner_id, created_at DESC)` — supports "latest sessions for this recruiter" queries.

**RLS:**
- Enabled. Single policy: `"HR user owns their mask sessions"` — `owner_id = auth.uid()` for all operations (SELECT, INSERT, UPDATE, DELETE).

**Usage pattern:** `wisehire-mask-cvs` edge function writes one row per masking run. The frontend reads the most recent session for the logged-in recruiter and restores it on page load, so masking work isn't lost on refresh.

**Related:**
- `Project Atlas/01-Currently Implemented/functions/wisehire-mask-cvs.md` (not yet written — add if the edge function card is missing)
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- `Project Atlas/01-Currently Implemented/pages/wisehire/candidatemasking.md`
