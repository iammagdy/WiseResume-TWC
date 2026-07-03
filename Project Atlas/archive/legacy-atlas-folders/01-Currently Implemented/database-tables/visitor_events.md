# `visitor_events`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260607000000_visitor_events.sql`, `supabase/functions/track-visitor-event/`, `supabase/functions/purge-old-visitor-events/`, `supabase/functions/stitch-visitor-identity/`.

**Canonical owner:** Visitor analytics pipeline.

---

Anonymous + authenticated visitor event stream. Stitched to a known `user_id` post-login by `stitch-visitor-identity`. Aggregated by DevKit "Visitor Analytics" tab. Purged on a sweep (see `analytics_sweep_lock`).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `anon_id` | uuid NOT NULL | Browser-stable anon ID. |
| `user_id` | uuid → `auth.users(id)` SET NULL | NULL until stitched. |
| `session_id` | uuid NOT NULL | Per-tab session. |
| `event_type` | text CHECK | `page_view` / `click` / `section_view` / `feature_use`. |
| `page` / `target` / `section` | text | Event context. |
| `country` / `city` | text | GeoIP. |
| `device_type` | text CHECK | `mobile` / `desktop` / `tablet`. |
| `browser` / `os` / `referrer` | text | UA-derived. |
| `created_at` | timestamptz default now() | |

## Hard rules
- Insert is fire-and-forget; never block user navigation on insert failure.
- Bot-guarded at the edge (`_shared/botGuard.ts`).
- Retention sweep guarded by `analytics_sweep_lock` singleton.
