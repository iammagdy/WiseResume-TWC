-- Performance indexes for high-traffic queries
-- Adds indexes on foreign key columns and WHERE clause columns for user-scoped queries.
-- Note: CONCURRENTLY is NOT used here to ensure this runs cleanly inside Postgres transactions
-- (Supabase migrations run in a transaction by default and CONCURRENTLY is disallowed there).

-- resumes: most queried table — user_id appears in every fetch
CREATE INDEX IF NOT EXISTS idx_resumes_user_id
  ON resumes(user_id);

-- resumes: soft-delete queries filter on deleted_at
CREATE INDEX IF NOT EXISTS idx_resumes_user_id_deleted_at
  ON resumes(user_id, deleted_at);

-- ai_credits: credit check fetches by user_id + usage_date
CREATE INDEX IF NOT EXISTS idx_ai_credits_user_id
  ON ai_credits(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_credits_user_id_usage_date
  ON ai_credits(user_id, usage_date);

-- subscriptions: plan checks filter by user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);

-- job_applications: application board fetches
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id
  ON job_applications(user_id);

-- portfolios: ownership queries
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id
  ON portfolios(user_id);

-- user_preferences: BYOK credit check reads ai_provider by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);

-- user_api_keys: BYOK key lookup by user_id + provider (composite for exactlookup)
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id_provider
  ON user_api_keys(user_id, provider);

-- rpc_rate_limits: rate limit lookups filter by ip_address + endpoint + created_at
-- These are the actual column names used in the rpc_rate_limits table.
CREATE INDEX IF NOT EXISTS idx_rpc_rate_limits_ip_endpoint_created
  ON rpc_rate_limits(ip_address, endpoint, created_at);

-- tailoring_results: lookups by resume_id and user_id
CREATE INDEX IF NOT EXISTS idx_tailoring_results_resume_id
  ON tailoring_results(resume_id);

CREATE INDEX IF NOT EXISTS idx_tailoring_results_user_id
  ON tailoring_results(user_id);

-- notifications: user notifications fetched by user_id + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
  ON notifications(user_id, read);
