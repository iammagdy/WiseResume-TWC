-- ============================================================
-- Add validate_coupon RPC (read-only, callable by authenticated users)
-- Powers the two-step "Check Code" → confirmation flow
-- without requiring a new edge function deployment.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_coupon      RECORD;
  v_user_id     UUID;
  v_already     BOOLEAN;
  v_plan_name   TEXT;
  v_trial_plan  TEXT;
  v_trial_exp   TIMESTAMPTZ;
  v_eff_plan    TEXT;
  v_offer_tier  INTEGER;
  v_user_tier   INTEGER;
  v_trial_ends  TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_coupon
  FROM public.discount_codes
  WHERE code = upper(trim(p_code))
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has expired');
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has reached its maximum uses');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND user_id = v_user_id
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
  END IF;

  -- Fetch user subscription for plan checks
  SELECT
    COALESCE(s.plan_name, 'free'),
    s.trial_plan,
    s.trial_expires_at
  INTO v_plan_name, v_trial_plan, v_trial_exp
  FROM public.subscriptions s
  WHERE s.user_id = v_user_id;

  -- target_plan restriction checks against base plan_name (not effective plan)
  IF v_coupon.target_plan IS NOT NULL THEN
    IF v_plan_name != v_coupon.target_plan THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'This coupon is only available for ' || v_coupon.target_plan || ' plan users'
      );
    END IF;
  END IF;

  -- Compute effective plan (active trial takes precedence over base plan)
  IF v_trial_plan IS NOT NULL AND v_trial_exp IS NOT NULL AND v_trial_exp > now() THEN
    v_eff_plan := v_trial_plan;
  ELSE
    v_eff_plan := v_plan_name;
  END IF;

  -- Plan-tier guard: prevent redeeming equal-or-lower-tier coupons
  IF v_coupon.discount_type = 'plan_upgrade' AND v_coupon.plan_override IS NOT NULL THEN
    v_offer_tier := CASE v_coupon.plan_override
      WHEN 'premium' THEN 2
      WHEN 'pro'     THEN 1
      ELSE 0
    END;
    v_user_tier := CASE v_eff_plan
      WHEN 'premium' THEN 2
      WHEN 'pro'     THEN 1
      ELSE 0
    END;
    IF v_user_tier >= v_offer_tier THEN
      RETURN jsonb_build_object(
        'valid', false,
        'already_on_plan', true,
        'error', 'Great news — you already have access to ' || initcap(v_coupon.plan_override) ||
                 ' features! This coupon isn''t needed for your current plan.'
      );
    END IF;
  END IF;

  -- Compute trial end date when plan_days is set
  IF v_coupon.plan_days IS NOT NULL THEN
    v_trial_ends := now() + (v_coupon.plan_days || ' days')::INTERVAL;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon', jsonb_build_object(
      'code',           v_coupon.code,
      'discount_type',  v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'plan_override',  v_coupon.plan_override,
      'plan_days',      v_coupon.plan_days,
      'expires_at',     v_coupon.expires_at,
      'target_plan',    v_coupon.target_plan
    ),
    'trial_ends_at', v_trial_ends
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(TEXT) FROM PUBLIC;
