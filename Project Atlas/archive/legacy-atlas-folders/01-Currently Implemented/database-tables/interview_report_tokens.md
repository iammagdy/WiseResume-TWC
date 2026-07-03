# `interview_report_tokens`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260419000002_phase2_features.sql`.

**Canonical owner:** Interview Report shareable URL (page: `interviewreport.md`).

---

One-shot signed tokens for sharing an interview-session report via public URL. Embeds the report payload inline so the reader doesn't need to authenticate or query session tables.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` CASCADE | |
| `session_id` | uuid → `interview_sessions(id)` CASCADE | |
| `token` | text NOT NULL UNIQUE | URL slug. |
| `report_data` | jsonb NOT NULL | Frozen report snapshot. |
| `expires_at` | timestamptz NOT NULL | |
| `created_at` | timestamptz default now() | |

## Hard rules
- Snapshot is frozen at issue time — re-grading after issue does not update the shared report.
- Public reader endpoints must enforce `expires_at > now()`.
