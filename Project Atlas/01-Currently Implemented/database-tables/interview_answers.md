# `interview_answers`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260419000002_phase2_features.sql`.

**Canonical owner:** Interview Coach answer history surface.

---

Per-question recorded answer + AI grading inside an interview session. Sibling of `interview_sessions` and `interview_attempts` (mobile).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` CASCADE | |
| `session_id` | uuid → `interview_sessions(id)` SET NULL | |
| `question_text` | text NOT NULL | |
| `answer_text` | text NOT NULL | |
| `category` | text default `General` | |
| `role_context` | text | e.g. job title. |
| `score` | int | AI grading 0–100. |
| `notes` | text | AI feedback. |
| `created_at` | timestamptz default now() | |

## Hard rules
- Score is denormalised — re-grading replaces `score`/`notes` in place.
