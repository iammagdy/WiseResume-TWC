# `interview_question_bank`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260503100000_mobile_interview_tables.sql`, `supabase/functions/generate-question-bank/`.

**Canonical owner:** `generate-question-bank` edge fn + mobile Interview Coach.

---

Curated + AI-generated interview question bank, segmented by track and difficulty.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `track` | text NOT NULL | `behavioral`, `technical`, … |
| `prompt` | text NOT NULL | Question. |
| `category` | text | Sub-category. |
| `difficulty` | text CHECK | `easy` / `medium` / `hard`. |
| `metadata` | jsonb default `{}` | Tags, expected concepts. |
| `created_at` / `updated_at` | timestamptz | |

## Hard rules
- Newly generated questions append; never replace existing rows blindly (mobile attempts FK on `question_id`).
