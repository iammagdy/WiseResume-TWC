-- Backfill existing premium users to daily_limit = -1 sentinel
-- and update get_all_users_admin to use created_at (standard field name)

-- 1. Backfill: any existing ai_credits rows for premium users get -1 daily limit
UPDATE public.ai_credits ac
SET daily_limit = -1,
    updated_at  = now()
FROM public.subscriptions s
WHERE s.user_id = ac.user_id
  AND s.plan_name = 'premium'
  AND ac.daily_limit != -1;

-- 2. Update get_all_users_admin to use created_at (consistent field name)
--    and return a flat row array (still wrapped in success/users/limit/offset envelope)
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
      au.id                                        AS user_id,
      au.email                                     AS email,
      p.full_name                                  AS full_name,
      COALESCE(s.plan_name, 'free')               AS plan_name,
      COALESCE(s.status, 'active')                AS plan_status,
      s.plan_updated_at                            AS plan_updated_at,
      COALESCE(p.created_at, au.created_at)       AS created_at,
      au.last_sign_in_at                           AS last_sign_in_at,
      COALESCE(rc.resume_count, 0)                AS resume_count
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
    'users',  COALESCE(v_result, '[]'::jsonb),
    'limit',  p_limit,
    'offset', p_offset
  );
END;
$$;

-- Re-apply service_role grants after OR REPLACE
GRANT EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(INTEGER, INTEGER) FROM authenticated;
