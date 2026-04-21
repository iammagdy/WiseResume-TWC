-- Add covering btree indexes for the 33 foreign-key columns flagged by the
-- Supabase performance advisor as `unindexed_foreign_keys`. Without a covering
-- index, every DELETE on the parent table triggers a sequential scan of the
-- child to enforce the FK, and every join filtered on the FK is slow.
--
-- The full list was extracted from `.local/db-analysis/performance.json`.
-- 33 FK constraints collapse into 32 unique (table, column) pairs because
-- `public.feature_requests` has two FKs on the same `user_id` column
-- (`feature_requests_user_id_fkey` and `fk_feature_requests_user`); a single
-- index on `user_id` covers both.
--
-- Naming convention: `idx_<table>_<column>` (matches existing performance
-- indexes added in 20260416000000_add_performance_indexes.sql).
--
-- About CONCURRENTLY: the project's existing performance-index migration
-- (20260416000000) deliberately omits CONCURRENTLY because Supabase's
-- migration runner wraps each migration file in a transaction, and
-- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. We follow
-- the same convention here. These tables are small-to-mid-size and the
-- index builds are fast; the brief ACCESS EXCLUSIVE lock on each table is
-- acceptable for a deploy window. If a future table grows large enough that
-- a non-concurrent build is unsafe, that index can be created out-of-band
-- via a one-off CONCURRENTLY statement against the live DB.
--
-- All statements use IF NOT EXISTS so the migration is idempotent and safe
-- to re-run (e.g. on a fresh-DB rebuild where some indexes may have been
-- added manually first).

-- public.ai_usage_logs (fk_ai_usage_logs_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_resume_id
  ON public.ai_usage_logs(resume_id);

-- public.career_assessments (fk_career_assessments_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_career_assessments_resume_id
  ON public.career_assessments(resume_id);

-- public.coupon_redemptions (coupon_redemptions_user_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id
  ON public.coupon_redemptions(user_id);

-- public.credit_transactions (credit_transactions_user_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
  ON public.credit_transactions(user_id);

-- public.feature_requests — covers BOTH FKs on user_id
-- (feature_requests_user_id_fkey and fk_feature_requests_user)
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id
  ON public.feature_requests(user_id);

-- public.interview_sessions (fk_interview_sessions_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_interview_sessions_resume_id
  ON public.interview_sessions(resume_id);

-- public.job_applications (fk_job_applications_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_id
  ON public.job_applications(resume_id);

-- public.job_applications (job_applications_cover_letter_id_fkey → cover_letters.id)
CREATE INDEX IF NOT EXISTS idx_job_applications_cover_letter_id
  ON public.job_applications(cover_letter_id);

-- public.job_applications (job_applications_job_id_fkey)
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id
  ON public.job_applications(job_id);

-- public.messages (messages_user_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages(user_id);

-- public.portfolio_visits (portfolio_visits_short_link_id_fkey → short_links.id)
CREATE INDEX IF NOT EXISTS idx_portfolio_visits_short_link_id
  ON public.portfolio_visits(short_link_id);

-- public.profiles (profiles_portfolio_resume_id_fkey → resumes.id)
CREATE INDEX IF NOT EXISTS idx_profiles_portfolio_resume_id
  ON public.profiles(portfolio_resume_id);

-- public.resume_certifications (resume_certifications_resume_id_fkey → resumes.id)
CREATE INDEX IF NOT EXISTS idx_resume_certifications_resume_id
  ON public.resume_certifications(resume_id);

-- public.resume_educations (resume_educations_resume_id_fkey → resumes.id)
CREATE INDEX IF NOT EXISTS idx_resume_educations_resume_id
  ON public.resume_educations(resume_id);

-- public.resume_experiences (resume_experiences_resume_id_fkey → resumes.id)
CREATE INDEX IF NOT EXISTS idx_resume_experiences_resume_id
  ON public.resume_experiences(resume_id);

-- public.resume_shares (fk_resume_shares_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_resume_shares_resume_id
  ON public.resume_shares(resume_id);

-- public.resume_shares (resume_shares_user_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_resume_shares_user_id
  ON public.resume_shares(user_id);

-- public.resume_versions (fk_resume_versions_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id
  ON public.resume_versions(resume_id);

-- public.share_comments (fk_share_comments_share → resume_shares.id)
CREATE INDEX IF NOT EXISTS idx_share_comments_share_id
  ON public.share_comments(share_id);

-- public.short_links (short_links_owner_user_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_short_links_owner_user_id
  ON public.short_links(owner_user_id);

-- public.tailor_history (fk_tailor_history_resume → resumes.id)
CREATE INDEX IF NOT EXISTS idx_tailor_history_resume_id
  ON public.tailor_history(resume_id);

-- public.wisehire_applications (wisehire_applications_candidate_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_applications_candidate_id
  ON public.wisehire_applications(candidate_id);

-- public.wisehire_bulk_screen_jobs (wisehire_bulk_screen_jobs_owner_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_bulk_screen_jobs_owner_id
  ON public.wisehire_bulk_screen_jobs(owner_id);

-- public.wisehire_bulk_screen_jobs (wisehire_bulk_screen_jobs_role_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_bulk_screen_jobs_role_id
  ON public.wisehire_bulk_screen_jobs(role_id);

-- public.wisehire_candidate_briefs (wisehire_candidate_briefs_role_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_candidate_briefs_role_id
  ON public.wisehire_candidate_briefs(role_id);

-- public.wisehire_invites (wisehire_invites_created_by_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_wisehire_invites_created_by
  ON public.wisehire_invites(created_by);

-- public.wisehire_pipeline_events (wisehire_pipeline_events_moved_by_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_wisehire_pipeline_events_moved_by
  ON public.wisehire_pipeline_events(moved_by);

-- public.wisehire_pipeline_events (wisehire_pipeline_events_owner_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_wisehire_pipeline_events_owner_id
  ON public.wisehire_pipeline_events(owner_id);

-- public.wisehire_roles (wisehire_roles_company_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_roles_company_id
  ON public.wisehire_roles(company_id);

-- public.wisehire_scorecards (wisehire_scorecards_brief_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_scorecards_brief_id
  ON public.wisehire_scorecards(brief_id);

-- public.wisehire_scorecards (wisehire_scorecards_candidate_id_fkey)
CREATE INDEX IF NOT EXISTS idx_wisehire_scorecards_candidate_id
  ON public.wisehire_scorecards(candidate_id);

-- public.wisehire_scorecards (wisehire_scorecards_owner_id_fkey → auth.users.id)
CREATE INDEX IF NOT EXISTS idx_wisehire_scorecards_owner_id
  ON public.wisehire_scorecards(owner_id);
