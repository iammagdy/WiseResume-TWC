# `moderation_queue`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260513000001_moderation_and_integrations.sql`, `supabase/functions/_shared/contentModeration.ts`, `supabase/functions/admin-moderation/`.

**Canonical owner:** `_shared/contentModeration.ts` writer + DevKit Moderation tab reader.

---

Queue of content snippets that matched a `blocklist` pattern, awaiting admin review.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `content_type` | text NOT NULL | e.g. `portfolio_bio`, `cover_letter`, `chat_message`. |
| `content_id` | uuid | Source row ID (loose, not FK — content type may vary). |
| `snippet` | text | First N chars of offending content. |
| `reporter_user_id` | uuid → `auth.users(id)` SET NULL | NULL for auto-flag. |
| `status` | text CHECK default `pending` | `pending` / `approved` / `removed`. |
| `reviewed_by` | text | Admin email. |
| `reviewed_at` | timestamptz | |
| `created_at` | timestamptz default now() | |

## Hard rules
- Insert is fire-and-forget — `screenContent()` never blocks the user action on queue write failure.
- Reviewer actions go through `admin-moderation`.
