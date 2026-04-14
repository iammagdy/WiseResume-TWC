-- ============================================================
-- Atomic, concurrency-safe portfolio chat quota RPC
-- ============================================================
-- Mirrors the atomic_attempt_and_deduct_credit pattern.
-- Uses pg_try_advisory_xact_lock to serialize concurrent requests
-- for the same portfolio owner, preventing quota overshoot under
-- parallel load.
--
-- Returns:
--   allowed  BOOLEAN   true → request may proceed; false → quota hit / lock held
--   reason   TEXT      null when allowed; human-readable when blocked
-- ============================================================

CREATE OR REPLACE FUNCTION public.atomic_portfolio_chat_quota(
  p_user_id         UUID,
  p_session_id      TEXT,
  p_today           DATE,
  p_session_limit   INT DEFAULT 20,
  p_daily_limit     INT DEFAULT 50
)
RETURNS TABLE(allowed BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key       BIGINT;
  v_session_count  INT;
  v_daily_count    INT;
BEGIN
  -- Derive a stable integer lock key from the user_id UUID so concurrent
  -- requests for the same portfolio owner are serialized within this transaction.
  v_lock_key := hashtext(p_user_id::TEXT)::BIGINT;

  -- Try to acquire a session-level advisory lock (non-blocking).
  -- If another concurrent request is already inside this RPC for the same user,
  -- reject immediately with a retry message to prevent over-counting.
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN QUERY SELECT FALSE, 'Concurrent request detected. Please retry.'::TEXT;
    RETURN;
  END IF;

  -- Count questions in this specific visitor session today
  SELECT COUNT(*)
    INTO v_session_count
    FROM public.ai_usage_logs
   WHERE user_id     = p_user_id
     AND action_type = 'chat'
     AND metadata->>'sessionId' = p_session_id
     AND created_at >= (p_today::TIMESTAMPTZ);

  IF v_session_count >= p_session_limit THEN
    RETURN QUERY SELECT FALSE,
      'Session question limit reached. Please reload the page for a new session.'::TEXT;
    RETURN;
  END IF;

  -- Count all chat questions for this portfolio owner today
  SELECT COUNT(*)
    INTO v_daily_count
    FROM public.ai_usage_logs
   WHERE user_id     = p_user_id
     AND action_type = 'chat'
     AND created_at >= (p_today::TIMESTAMPTZ);

  IF v_daily_count >= p_daily_limit THEN
    RETURN QUERY SELECT FALSE,
      'This portfolio''s daily AI limit has been reached. Please try again tomorrow.'::TEXT;
    RETURN;
  END IF;

  -- Quotas clear — record usage atomically within the same lock scope
  INSERT INTO public.ai_usage_logs (user_id, action_type, metadata)
  VALUES (
    p_user_id,
    'chat',
    jsonb_build_object('sessionId', p_session_id)
  );

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Restrict execution: only service_role (Edge Functions) may call this RPC.
-- Public, authenticated, and anon roles are explicitly denied.
REVOKE ALL ON FUNCTION public.atomic_portfolio_chat_quota(UUID, TEXT, DATE, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_portfolio_chat_quota(UUID, TEXT, DATE, INT, INT) FROM authenticated;
REVOKE ALL ON FUNCTION public.atomic_portfolio_chat_quota(UUID, TEXT, DATE, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.atomic_portfolio_chat_quota(UUID, TEXT, DATE, INT, INT) TO service_role;
