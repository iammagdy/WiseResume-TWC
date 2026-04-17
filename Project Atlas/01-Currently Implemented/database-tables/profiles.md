# profiles

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.profiles.Row` (44 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** User profile (PK `id`, FK `user_id` → `auth.users`). `account_type` enum {job_seeker, hr}, immutable post-signup.

**Schema:** 44 columns per `Tables.profiles.Row` in `src/integrations/supabase/types.ts`. Columns: `availability_headline`, `avatar_url`, `career_level`, `contact_email`, `created_at`, `deleted_at`, `digest_enabled`, `full_name`, `github_last_synced`, `github_projects_cache`, `github_url`, `hired_at`, `id`, `industry`, `is_deleted`, `job_title`, `last_active_at`, `last_login_date`, `linkedin_url`, `location`, `login_streak`, `onboarding_completed`, `open_to_work`, `phone_number`, `portfolio_accent_color`, `portfolio_bio`, `portfolio_enabled`, `portfolio_extras`, `portfolio_font`, `portfolio_layout`, `portfolio_meta_description`, `portfolio_meta_title`, `portfolio_resume_id`, `portfolio_sections`, `portfolio_style`, `portfolio_sync_mode`, `portfolio_theme`, `profile_completed`, `twitter_url`, `updated_at`, `user_id`, `username`, `views`, `website_url`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.profiles.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
