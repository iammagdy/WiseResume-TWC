# `interview_attempts`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260503100000_mobile_interview_tables.sql`.

**Canonical owner:** Mobile Interview Coach (Expo client).

---

Mobile-side per-attempt record (track + question + transcript + audio + grading). Web stores answers in `interview_answers`; the mobile flow is richer per-attempt because of audio capture.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `profiles(user_id)` CASCADE | |
| `session_id` | uuid | Loose — not FK. |
| `track` | text NOT NULL | e.g. `behavioral`, `technical`, `system-design`. |
| `question_id` | text NOT NULL | From `interview_question_bank`. |
| `prompt` | text NOT NULL | Question text snapshot. |
| `transcript` | text | STT output. |
| `audio_url` | text | Storage URL of raw audio. |
| `score` | int CHECK (0..100) | |
| `feedback` | jsonb | Structured AI feedback. |
| `asked_at` / `graded_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

## Hard rules
- Audio stored in a Supabase Storage bucket — TTL/retention is bucket-level, not table-level.
