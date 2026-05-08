# `blocklist`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260513000001_moderation_and_integrations.sql`, `supabase/functions/_shared/contentModeration.ts`.

**Canonical owner:** Content-moderation helper (`screenContent`).

---

Moderation deny-list. Three entry types: literal `email`, literal `user_id`, or regex/substring `pattern`. Patterns are scanned by `_shared/contentModeration.ts` — every match enqueues a row in `moderation_queue`.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | text CHECK | `email` / `user_id` / `pattern`. |
| `value` | text NOT NULL | The literal/pattern. |
| `reason` | text | Admin-entered context. |
| `added_by` | text | Admin email. |
| `added_at` | timestamptz default now() | |

## Hard rules
- Pattern matching is fire-and-forget — a blocklist failure must never block the user's primary action (`_shared/contentModeration.ts`).
- Edits only via DevKit moderation tools (`admin-moderation` edge fn).
