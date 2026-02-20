CREATE INDEX idx_ai_usage_logs_rate_limit
ON public.ai_usage_logs (user_id, action_type, created_at DESC);