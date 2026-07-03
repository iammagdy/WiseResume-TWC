# 06 - Database Schema Map (Finalized)

**Last verified against live API:** 2026-05-23

**Architecture:** SQL (Supabase) has been fully ported to Documents (Appwrite).

## Ported Collections (96 confirmed in live Appwrite; 3 not yet created)

Live API returns **96 collections** in the `main` database (verified 2026-05-08 via `databases.listCollections` with `APPWRITE_API_KEY`). The previous "99 total" figure was an estimate based on Supabase migration files — the following 3 tables exist in the old Supabase schema and reference card docs but were **never created** in Appwrite:

| Missing collection | Source | Status |
|---|---|---|
| `resume_skills` | `supabase/migrations/` + `types.ts` | NOT in Appwrite — create when migrating resume section hooks |
| `resume_snapshots` | `supabase/migrations/20260419000002_phase2_features.sql` | NOT in Appwrite — create when implementing snapshot/rollback feature |
| `resume_versions` | `supabase/migrations/` + `types.ts` | NOT in Appwrite — create when implementing version history |

These must be created in Appwrite Console before any code targeting them is written in Phase 5.

### Core Schema Detail
1. **profiles**
   - `user_id`: String (UUID) - Primary Link
   - `email`: String - Contact/Login
   - `full_name`: String
   - `username`: String
   - `onboarding_completed`: Boolean
   - `avatar_url`: String (500 chars)
   - `portfolio_extras`: String (stringified JSON) — includes nested **`portfolioDraft`** + **`portfolioDraftSavedAt`** for portfolio editor working copy (2026-05-23; live Appwrite has **no** `portfolio_draft` / `portfolio_draft_saved_at` attributes — see session log `27-Session-Log-2026-05-23-Portfolio-Editor-Tailor-Workspace.md`)

   - **Correction (2026-05-23):** Live API verification showed `portfolio_extras`, `portfolio_draft`, and `portfolio_draft_saved_at` are not present in the current Appwrite `profiles` collection. Treat the previous line as stale until a schema migration is applied.

2. **resumes**
   - `user_id`: String
   - `title`: String
   - `template`: String
   - `content`: String (Large JSON storage)

3. **ai_credits**
   - `user_id`: String
   - `daily_usage`: Integer
   - `daily_limit`: Integer

4. **subscriptions**
   - `user_id`: String
   - `plan`: String (free, pro, premium)
   - `trial_expires_at`: DateTime

## Porting Logic
- All JSONB columns from Supabase are stored as **Stringified JSON** in Appwrite attributes.
- Relationships are maintained via manual `user_id` queries in Frontend Hooks.
