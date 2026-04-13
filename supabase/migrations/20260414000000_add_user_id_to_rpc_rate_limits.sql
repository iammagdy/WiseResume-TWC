-- Add user_id column to rpc_rate_limits to support per-user, per-feature AI rate limiting.
-- The existing ip_address + endpoint usage for get_public_portfolio is unchanged.
ALTER TABLE public.rpc_rate_limits
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for efficient per-user, per-feature sliding-window queries
CREATE INDEX IF NOT EXISTS idx_rpc_rate_limits_user_endpoint
  ON public.rpc_rate_limits(user_id, endpoint, created_at)
  WHERE user_id IS NOT NULL;

-- Automated cleanup: delete rows older than 24 hours to keep the table small.
-- This runs as a no-op on platforms that don't support pg_cron; data naturally
-- expires out of every rate-limit window anyway.
