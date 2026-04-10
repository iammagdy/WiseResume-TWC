-- ============================================================
-- Ultra Admin Control Panel — Migration
-- Adds: trial columns, suspension, admin_user_notes,
--       discount_codes, app_settings, updated RPCs
-- ============================================================

-- ============================================================
-- 1. Add trial columns to subscriptions
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_plan      TEXT,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- ============================================================
-- 2. Add suspension columns to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ============================================================
-- 3. Admin user notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_notes_user_id_idx ON public.admin_user_notes (user_id);
CREATE INDEX IF NOT EXISTS admin_user_notes_created_at_idx ON public.admin_user_notes (created_at DESC);

ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_admin_notes" ON public.admin_user_notes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. Discount codes table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT        NOT NULL UNIQUE,
  discount_type  TEXT        NOT NULL CHECK (discount_type IN ('percent', 'plan_upgrade')),
  discount_value NUMERIC     NOT NULL DEFAULT 0,
  plan_override  TEXT        CHECK (plan_override IN ('pro', 'premium')),
  plan_days      INTEGER,
  expires_at     TIMESTAMPTZ,
  max_uses       INTEGER     NOT NULL DEFAULT 0,
  uses_count     INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discount_codes_code_idx ON public.discount_codes (code);
CREATE INDEX IF NOT EXISTS discount_codes_is_active_idx ON public.discount_codes (is_active);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_discount_codes" ON public.discount_codes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. App settings table (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_app_settings" ON public.app_settings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read certain app settings (feature flags, announcements)
CREATE POLICY "authenticated_read_app_settings" ON public.app_settings
  FOR SELECT
  USING (key IN (
    'maintenance_mode',
    'announcement_banner',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio'
  ));

-- Seed default app settings
INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance_mode',         'false'::jsonb),
  ('announcement_banner',      'null'::jsonb),
  ('announcement_enabled',     'false'::jsonb),
  ('feature_cover_letters',    'true'::jsonb),
  ('feature_applications',     'true'::jsonb),
  ('feature_ai_studio',        'true'::jsonb),
  ('feature_portfolio',        'true'::jsonb),
  ('feature_interview_coach',  'true'::jsonb),
  ('feature_career_advisor',   'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. Coupon redemptions tracking table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id    UUID        NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_coupon_redemptions" ON public.coupon_redemptions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 7. Updated get_all_users_admin_v2 RPC — extended fields
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
    ORDER BY
      CASE WHEN p_sort = 'newest'      THEN COALESCE(p.created_at, au.created_at) END DESC NULLS LAST,
      CASE WHEN p_sort = 'oldest'      THEN COALESCE(p.created_at, au.created_at) END ASC  NULLS LAST,
      CASE WHEN p_sort = 'most_active' THEN au.last_sign_in_at END                    DESC NULLS LAST,
      CASE WHEN p_sort = 'most_resumes' THEN COALESCE(rc.resume_count, 0) END          DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ) u;

  RETURN jsonb_build_object(
    'success', true,
    'users',   COALESCE(v_result, '[]'::jsonb),
    'total',   v_total,
    'limit',   p_limit,
    'offset',  p_offset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin_v2(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- ============================================================
-- 8. admin_grant_trial RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_grant_trial(
  p_target_user_id UUID,
  p_trial_plan     TEXT,
  p_days           INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_trial_plan NOT IN ('pro', 'premium') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trial plan must be pro or premium');
  END IF;

  v_expires_at := now() + (p_days || ' days')::INTERVAL;

  UPDATE public.subscriptions
  SET
    trial_plan       = p_trial_plan,
    trial_expires_at = v_expires_at,
    updated_at       = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User subscription not found');
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    'trial_grant',
    jsonb_build_object(
      'trial_plan', p_trial_plan,
      'days', p_days,
      'expires_at', v_expires_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'trial_plan', p_trial_plan,
    'trial_expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_trial(UUID, TEXT, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_grant_trial(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_grant_trial(UUID, TEXT, INTEGER) FROM authenticated;

-- ============================================================
-- 9. admin_revoke_trial RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_trial(
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET
    trial_plan       = NULL,
    trial_expires_at = NULL,
    updated_at       = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User subscription not found');
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (p_target_user_id, 'admin', 'trial_revoke', '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_trial(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_trial(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_trial(UUID) FROM authenticated;

-- ============================================================
-- 10. admin_suspend_user RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_target_user_id UUID,
  p_suspend        BOOLEAN,
  p_reason         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_suspended      = p_suspend,
    suspension_reason = CASE WHEN p_suspend THEN p_reason ELSE NULL END,
    updated_at        = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    CASE WHEN p_suspend THEN 'suspend' ELSE 'unsuspend' END,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'suspended', p_suspend);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_suspend_user(UUID, BOOLEAN, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(UUID, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(UUID, BOOLEAN, TEXT) FROM authenticated;

-- ============================================================
-- 11. admin_set_credits RPC
-- ============================================================
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
    UPDATE public.ai_credits
    SET daily_limit = p_daily_limit
    WHERE user_id = p_target_user_id;
  END IF;

  IF p_bonus_credits IS NOT NULL AND p_bonus_credits > 0 THEN
    UPDATE public.ai_credits
    SET credits_used = GREATEST(0, credits_used - p_bonus_credits)
    WHERE user_id = p_target_user_id;
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

-- ============================================================
-- 12. redeem_coupon RPC (user-facing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_code    TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon     RECORD;
  v_already    BOOLEAN;
BEGIN
  SELECT * INTO v_coupon
  FROM public.discount_codes
  WHERE code = upper(trim(p_code))
    AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive coupon code');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This coupon has expired');
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This coupon has reached its maximum uses');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this coupon');
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id)
  VALUES (v_coupon.id, p_user_id);

  UPDATE public.discount_codes
  SET uses_count = uses_count + 1
  WHERE id = v_coupon.id;

  IF v_coupon.discount_type = 'plan_upgrade' AND v_coupon.plan_override IS NOT NULL THEN
    IF v_coupon.plan_days IS NOT NULL THEN
      PERFORM public.admin_grant_trial(p_user_id, v_coupon.plan_override, v_coupon.plan_days);
    ELSE
      PERFORM public.admin_set_user_plan(p_user_id, v_coupon.plan_override, 'coupon:' || p_code);
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_user_id,
    'coupon',
    'redeem',
    jsonb_build_object(
      'code', v_coupon.code,
      'type', v_coupon.discount_type,
      'plan_override', v_coupon.plan_override,
      'plan_days', v_coupon.plan_days
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'coupon', jsonb_build_object(
      'code', v_coupon.code,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'plan_override', v_coupon.plan_override,
      'plan_days', v_coupon.plan_days
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO authenticated;

-- ============================================================
-- 13. get_app_settings RPC (public read for non-sensitive keys)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_app_settings()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_object_agg(key, value)
  FROM public.app_settings
  WHERE key IN (
    'maintenance_mode',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_app_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO service_role;
