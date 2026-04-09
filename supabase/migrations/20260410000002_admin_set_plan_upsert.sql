-- Fix admin_set_user_plan to UPSERT ai_credits instead of just UPDATE
-- (ensures plan change works even for users without an existing ai_credits row)

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  p_target_user_id UUID,
  p_new_plan TEXT,
  p_updated_by TEXT DEFAULT 'admin-dev-kit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_plan TEXT;
  v_daily_limit INTEGER;
  v_monthly_credits INTEGER;
BEGIN
  v_clean_plan := lower(trim(p_new_plan));

  IF v_clean_plan NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan: must be free, pro, or premium');
  END IF;

  -- Map plan → credit limits (-1 = unlimited sentinel for premium)
  CASE v_clean_plan
    WHEN 'free' THEN
      v_daily_limit     := 5;
      v_monthly_credits := 150;
    WHEN 'pro' THEN
      v_daily_limit     := 100;
      v_monthly_credits := 3000;
    WHEN 'premium' THEN
      v_daily_limit     := -1;   -- Sentinel: unlimited
      v_monthly_credits := -1;   -- Sentinel: unlimited
  END CASE;

  -- Update subscription row (must exist — created by trigger on signup)
  UPDATE public.subscriptions
  SET
    plan_name          = v_clean_plan,
    status             = 'active',
    plan_updated_at    = now(),
    plan_updated_by    = p_updated_by,
    ai_credits_monthly = v_monthly_credits,
    updated_at         = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User subscription not found');
  END IF;

  -- UPSERT ai_credits so plan change works for users who have never used AI yet.
  -- daily_usage is intentionally preserved on UPDATE to avoid resetting mid-day usage;
  -- daily_limit is always overwritten to reflect the new plan.
  INSERT INTO public.ai_credits (user_id, daily_limit, daily_usage, usage_date, total_usage)
  VALUES (p_target_user_id, v_daily_limit, 0, CURRENT_DATE, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET daily_limit = EXCLUDED.daily_limit,
        updated_at  = now();

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    'plan_change',
    jsonb_build_object(
      'new_plan',    v_clean_plan,
      'updated_by',  p_updated_by,
      'daily_limit', v_daily_limit
    )
  );

  RETURN jsonb_build_object('success', true, 'plan', v_clean_plan, 'daily_limit', v_daily_limit);
END;
$$;

-- Re-apply grants after OR REPLACE
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM authenticated;
