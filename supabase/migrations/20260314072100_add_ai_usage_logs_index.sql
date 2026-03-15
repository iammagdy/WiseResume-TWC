-- Add a composite index on ai_usage_logs to optimize rate limiting checks
-- The rate limiter queries by user_id, action_type, and created_at.
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_rate_limit ON public.ai_usage_logs (user_id, action_type, created_at DESC);
