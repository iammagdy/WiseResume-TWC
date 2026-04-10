-- ============================================================
-- Fix get_all_users_admin_v2: use owner_user_id for short_links
-- The short_links table uses owner_user_id (not user_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_all_users_admin_v2(
  p_limit        INTEGER DEFAULT 50,
  p_offset       INTEGER DEFAULT 0,
  p_filter_plan  TEXT    DEFAULT NULL,
  p_filter_status TEXT   DEFAULT NULL,
  p_sort         TEXT    DEFAULT 'newest',
  p_search       TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result     JSONB;
  v_total      INTEGER;
BEGIN
  -- Count matching users first
  SELECT count(*)::int INTO v_total
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.subscriptions s ON s.user_id = au.id
  WHERE au.deleted_at IS NULL
    AND (
      p_search IS NULL OR p_search = '' OR
      au.email ILIKE '%' || p_search || '%' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      au.id::text ILIKE p_search || '%'
    )
    AND (
      p_filter_plan IS NULL OR p_filter_plan = '' OR
      CASE
        WHEN p_filter_plan = 'trial' THEN
          s.trial_plan IS NOT NULL AND s.trial_expires_at > now()
        WHEN p_filter_plan = 'suspended' THEN
          p.is_suspended = TRUE
        ELSE
          COALESCE(s.plan_name, 'free') = p_filter_plan
      END
    )
    AND (
      p_filter_status IS NULL OR p_filter_status = '' OR
      COALESCE(s.status, 'active') = p_filter_status
    );

  -- Fetch paginated results
  SELECT jsonb_agg(row_to_json(u)) INTO v_result
  FROM (
    SELECT
      au.id                                         AS user_id,
      au.email                                      AS email,
      p.full_name                                   AS full_name,
      COALESCE(s.plan_name, 'free')                AS plan_name,
      COALESCE(s.status, 'active')                 AS plan_status,
      s.plan_updated_at                             AS plan_updated_at,
      s.trial_plan                                  AS trial_plan,
      s.trial_expires_at                            AS trial_expires_at,
      COALESCE(p.is_suspended, FALSE)              AS is_suspended,
      p.suspension_reason                           AS suspension_reason,
      COALESCE(p.created_at, au.created_at)        AS created_at,
      au.last_sign_in_at                            AS last_sign_in_at,
      COALESCE(rc.resume_count, 0)                 AS resume_count,
      COALESCE(lc.link_count, 0)                   AS link_count,
      COALESCE(ac.credits_used, 0)                 AS credits_used_today,
      ac.daily_limit                                AS daily_limit
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.subscriptions s ON s.user_id = au.id
    LEFT JOIN (
      SELECT user_id, count(*)::int AS resume_count
      FROM public.resumes
      GROUP BY user_id
    ) rc ON rc.user_id = au.id
    LEFT JOIN (
      SELECT owner_user_id, count(*)::int AS link_count
      FROM public.short_links
      GROUP BY owner_user_id
    ) lc ON lc.owner_user_id = au.id
    LEFT JOIN public.ai_credits ac ON ac.user_id = au.id
    WHERE au.deleted_at IS NULL
      AND (
        p_search IS NULL OR p_search = '' OR
        au.email ILIKE '%' || p_search || '%' OR
        p.full_name ILIKE '%' || p_search || '%' OR
        au.id::text ILIKE p_search || '%'
      )
      AND (
        p_filter_plan IS NULL OR p_filter_plan = '' OR
        CASE
          WHEN p_filter_plan = 'trial' THEN
            s.trial_plan IS NOT NULL AND s.trial_expires_at > now()
          WHEN p_filter_plan = 'suspended' THEN
            COALESCE(p.is_suspended, FALSE) = TRUE
          ELSE
            COALESCE(s.plan_name, 'free') = p_filter_plan
        END
      )
      AND (
        p_filter_status IS NULL OR p_filter_status = '' OR
        COALESCE(s.status, 'active') = p_filter_status
      )
    ORDER BY
      CASE WHEN p_sort = 'newest'      THEN COALESCE(p.created_at, au.created_at) END DESC NULLS LAST,
      CASE WHEN p_sort = 'oldest'      THEN COALESCE(p.created_at, au.created_at) END ASC  NULLS LAST,
      CASE WHEN p_sort = 'most_active' THEN au.last_sign_in_at END                    DESC NULLS LAST,
      CASE WHEN p_sort = 'most_resumes' THEN COALESCE(rc.resume_count, 0) END          DESC NULLS LAST,
      au.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) u;

  RETURN jsonb_build_object(
    'users',  COALESCE(v_result, '[]'::jsonb),
    'total',  v_total,
    'limit',  p_limit,
    'offset', p_offset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
