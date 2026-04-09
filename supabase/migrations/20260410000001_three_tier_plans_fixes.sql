-- Phase 1 Fixes: address code-review findings
-- 1. Explicit service_role grant for admin_set_user_plan
-- 2. Fix Premium daily_limit to -1 sentinel (unlimited)
-- 3. Add get_all_users_admin() RPC (service-role only)
-- 4. Backfill: ensure existing Premium users (if any) get -1 sentinel

-- ============================================================
-- 1. Explicit GRANT to service_role for admin_set_user_plan
-- ============================================================
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) TO service_role;

-- ============================================================
-- 2. Fix admin_set_user_plan to use -1 as Premium sentinel
-- ============================================================
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

  -- Update daily credit limit in ai_credits (-1 = unlimited sentinel)
  UPDATE public.ai_credits
  SET daily_limit = v_daily_limit
  WHERE user_id = p_target_user_id;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    'plan_change',
    jsonb_build_object('new_plan', v_clean_plan, 'updated_by', p_updated_by, 'daily_limit', v_daily_limit)
  );

  RETURN jsonb_build_object('success', true, 'plan', v_clean_plan, 'daily_limit', v_daily_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM authenticated;

-- ============================================================
-- 3. Create get_all_users_admin() — service-role only
-- Returns one row per user joining auth.users, profiles,
-- subscriptions, and a resume count.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_users_admin(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(u)) INTO v_result
  FROM (
    SELECT
      au.id                                       AS user_id,
      au.email                                    AS email,
      p.full_name                                 AS full_name,
      COALESCE(s.plan_name, 'free')              AS plan_name,
      COALESCE(s.status, 'active')               AS plan_status,
      s.plan_updated_at                           AS plan_updated_at,
      COALESCE(p.created_at, au.created_at)      AS joined_at,
      au.last_sign_in_at                          AS last_sign_in_at,
      COALESCE(rc.resume_count, 0)               AS resume_count
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.subscriptions s ON s.user_id = au.id
    LEFT JOIN (
      SELECT user_id, count(*)::int AS resume_count
      FROM public.resumes
      GROUP BY user_id
    ) rc ON rc.user_id = au.id
    WHERE au.deleted_at IS NULL
    ORDER BY COALESCE(p.created_at, au.created_at) DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ) u;

  RETURN jsonb_build_object(
    'success', true,
    'users', COALESCE(v_result, '[]'::jsonb),
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Service-role only
GRANT EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) FROM authenticated;

COMMENT ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) IS
  'Admin-only: list all users with plan info. Callable via service-role only.';
