# `resume_snapshots`

**Last verified:** 2026-05-08
**Type:** reference card
**Appwrite status:** ⚠️ NOT created in Appwrite `main` database (verified 2026-05-08 via live API). This collection existed in Supabase only. Must be created in Appwrite Console before any Phase 5 migration code targets it. See `Project Atlas/05-Migration to Appwrite/07-Collection-Verification-2026-05-08.md`.
**Sources:** `supabase/migrations/20260419000002_phase2_features.sql`.

**Canonical owner:** Resume snapshot / saved-version surface (distinct from `resume_versions` which tracks live edit history).

---

Frozen named snapshots of a resume + ATS score at the moment of save. Used for "save as template", "rollback later", and tailor-history comparison anchors.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` CASCADE | |
| `resume_id` | uuid → `resumes(id)` SET NULL | NULL if source resume deleted. |
| `name` | text NOT NULL | User-given label. |
| `resume_json` | jsonb NOT NULL | Full denormalised resume payload (`src/types/resume.ts` shape). |
| `ats_score` | int | Score at snapshot time. |
| `created_at` | timestamptz default now() | |

## Hard rules
- Snapshots are immutable — re-saving creates a new row.
- `resume_json` is the authoritative content; do not re-derive from `resumes` at read time.
