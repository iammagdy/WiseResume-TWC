-- Performance indexes for high-traffic queries
-- Adds indexes on foreign key columns and WHERE clause columns for user-scoped queries.
-- Note: CONCURRENTLY is NOT used here to ensure this runs cleanly inside Postgres transactions
-- (Supabase migrations run in a transaction by default and CONCURRENTLY is disallowed there).
--
-- Each block is gated on `to_regclass(...) IS NOT NULL` so the migration is idempotent
-- and tolerant of environments where some optional tables (e.g. public.portfolios,
-- public.tailoring_results) were never created. See the operator note in replit.md
-- (Supabase Migration Sync) for the rationale.

DO $$
BEGIN
  -- resumes: most queried table — user_id appears in every fetch
  IF to_regclass('public.resumes') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_resumes_user_id_deleted_at ON public.resumes(user_id, deleted_at)';
  END IF;

  -- ai_credits: credit check fetches by user_id + usage_date
  IF to_regclass('public.ai_credits') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_credits_user_id ON public.ai_credits(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_credits_user_id_usage_date ON public.ai_credits(user_id, usage_date)';
  END IF;

  -- subscriptions: plan checks filter by user_id
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id)';
  END IF;

  -- job_applications: application board fetches
  IF to_regclass('public.job_applications') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id)';
  END IF;

  -- portfolios: ownership queries (table absent on canonical project — see replit.md)
  IF to_regclass('public.portfolios') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id)';
  END IF;

  -- user_preferences: BYOK credit check reads ai_provider by user_id
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id)';
  END IF;

  -- user_api_keys: BYOK key lookup by user_id + provider
  IF to_regclass('public.user_api_keys') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id_provider ON public.user_api_keys(user_id, provider)';
  END IF;

  -- rpc_rate_limits: rate limit lookups filter by ip_address + endpoint + created_at
  IF to_regclass('public.rpc_rate_limits') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rpc_rate_limits_ip_endpoint_created ON public.rpc_rate_limits(ip_address, endpoint, created_at)';
  END IF;

  -- tailoring_results: lookups by resume_id and user_id (table absent on canonical project)
  IF to_regclass('public.tailoring_results') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tailoring_results_resume_id ON public.tailoring_results(resume_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tailoring_results_user_id ON public.tailoring_results(user_id)';
  END IF;

  -- notifications: user notifications fetched by user_id + read status
  -- (column is `is_read` on the canonical project, not `read` — gated for safety)
  IF to_regclass('public.notifications') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='notifications' AND column_name='is_read')
  THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read)';
  END IF;
END $$;
