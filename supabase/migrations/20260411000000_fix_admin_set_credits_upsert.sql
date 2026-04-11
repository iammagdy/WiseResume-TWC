-- Fix admin_set_credits to upsert instead of update
-- Previously, the UPDATE silently did nothing if the user had no row in ai_credits
-- (i.e., users who have never used AI). Now we INSERT ... ON CONFLICT to ensure
-- first-time credit overrides are always written.

CREATE OR REPLACE FUNCTION public.admin_set_credits(
  p_target_user_id UUID,
  p_daily_limit    INTEGER DEFAULT NULL,
  p_bonus_credits  INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_daily_limit IS NOT NULL THEN
    INSERT INTO public.ai_credits (user_id, daily_limit)
    VALUES (p_target_user_id, p_daily_limit)
    ON CONFLICT (user_id) DO UPDATE
      SET daily_limit = EXCLUDED.daily_limit;
  END IF;

  IF p_bonus_credits IS NOT NULL AND p_bonus_credits > 0 THEN
    INSERT INTO public.ai_credits (user_id, credits_used)
    VALUES (p_target_user_id, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET credits_used = GREATEST(0, public.ai_credits.credits_used - p_bonus_credits);
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    'credits_override',
    jsonb_build_object(
      'daily_limit', p_daily_limit,
      'bonus_credits', p_bonus_credits
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_credits(UUID, INTEGER, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_set_credits(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_credits(UUID, INTEGER, INTEGER) FROM authenticated;
