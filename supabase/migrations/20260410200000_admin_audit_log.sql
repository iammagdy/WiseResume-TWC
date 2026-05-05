-- ============================================================
-- Admin Audit Log table
-- Tracks all admin actions for the activity log panel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'admin',
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_user_id_idx   ON public.admin_audit_log (user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx    ON public.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_audit_log" ON public.admin_audit_log;
CREATE POLICY "service_role_audit_log" ON public.admin_audit_log
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Coupon discount tracking on subscriptions
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS coupon_code            TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_percent NUMERIC;

-- ============================================================
-- Add feature flags to app_settings that are missing
-- ============================================================
INSERT INTO public.app_settings (key, value) VALUES
  ('feature_interview_coach',  'true'::jsonb),
  ('feature_career_advisor',   'true'::jsonb),
  ('announcement_enabled',     'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Allow authenticated users to read feature flags
-- (They already have access via service_role in the admin panel)
-- This policy supplements the original one to include the new keys
DROP POLICY IF EXISTS "authenticated_read_app_settings" ON public.app_settings;
CREATE POLICY "authenticated_read_app_settings" ON public.app_settings
  FOR SELECT
  USING (key IN (
    'maintenance_mode',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  ));

-- ============================================================
-- Updated redeem_coupon RPC — persists percent coupon discount
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

  -- Apply plan upgrade
  IF v_coupon.discount_type = 'plan_upgrade' AND v_coupon.plan_override IS NOT NULL THEN
    IF v_coupon.plan_days IS NOT NULL THEN
      PERFORM public.admin_grant_trial(p_user_id, v_coupon.plan_override, v_coupon.plan_days);
    ELSE
      PERFORM public.admin_set_user_plan(p_user_id, v_coupon.plan_override, 'coupon:' || p_code);
    END IF;
  END IF;

  -- Persist percent coupon discount on subscription record
  IF v_coupon.discount_type = 'percent' AND v_coupon.discount_value > 0 THEN
    UPDATE public.subscriptions
    SET coupon_code = v_coupon.code,
        coupon_discount_percent = v_coupon.discount_value
    WHERE user_id = p_user_id;
  END IF;

  -- Write to admin_audit_log if the table exists
  BEGIN
    INSERT INTO public.admin_audit_log (user_id, action, category, metadata)
    VALUES (
      p_user_id,
      'redeem',
      'coupon',
      jsonb_build_object(
        'code', v_coupon.code,
        'type', v_coupon.discount_type,
        'value', v_coupon.discount_value,
        'plan_override', v_coupon.plan_override,
        'plan_days', v_coupon.plan_days
      )
    );
  EXCEPTION WHEN undefined_table THEN
    NULL; -- table not yet created
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_coupon.discount_type = 'plan_upgrade' THEN
        'Your ' || initcap(v_coupon.plan_override) || ' plan has been activated'
      WHEN v_coupon.discount_type = 'percent' THEN
        to_char(v_coupon.discount_value, 'FM990') || '% discount applied to your account'
      ELSE 'Coupon applied successfully'
    END,
    'new_plan', CASE
      WHEN v_coupon.discount_type = 'plan_upgrade' THEN v_coupon.plan_override
      ELSE NULL
    END,
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
