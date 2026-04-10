-- ============================================================
-- Add target_plan restriction to discount_codes
-- Restricts coupon redemption to users on specific plans
-- Also restores percent-coupon subscription persistence
-- ============================================================

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS target_plan TEXT
  CHECK (target_plan IN ('free', 'pro', 'premium'));

COMMENT ON COLUMN public.discount_codes.target_plan IS
  'If set, only users on this plan can redeem the coupon. NULL = any plan.';

-- Update redeem_coupon RPC to enforce target_plan restriction
-- and restore percent-coupon persistence on subscriptions
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
  v_coupon   RECORD;
  v_already  BOOLEAN;
  v_plan     TEXT;
BEGIN
  SELECT * INTO v_coupon
  FROM public.discount_codes
  WHERE code = upper(trim(p_code))
    AND is_active = TRUE;

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

  -- Check target_plan restriction
  IF v_coupon.target_plan IS NOT NULL THEN
    SELECT COALESCE(s.plan_name, 'free') INTO v_plan
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;

    IF COALESCE(v_plan, 'free') != v_coupon.target_plan THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This coupon is only available for ' || v_coupon.target_plan || ' plan users'
      );
    END IF;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id)
  VALUES (v_coupon.id, p_user_id);

  UPDATE public.discount_codes
  SET uses_count = uses_count + 1
  WHERE id = v_coupon.id;

  -- Apply plan upgrade benefit
  IF v_coupon.discount_type = 'plan_upgrade' AND v_coupon.plan_override IS NOT NULL THEN
    IF v_coupon.plan_days IS NOT NULL THEN
      PERFORM public.admin_grant_trial(p_user_id, v_coupon.plan_override, v_coupon.plan_days);
    ELSE
      PERFORM public.admin_set_user_plan(p_user_id, v_coupon.plan_override, 'coupon:' || p_code);
    END IF;
  END IF;

  -- Persist percent coupon discount marker on subscription record
  IF v_coupon.discount_type = 'percent' AND v_coupon.discount_value > 0 THEN
    UPDATE public.subscriptions
    SET coupon_code = v_coupon.code,
        coupon_discount_percent = v_coupon.discount_value
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_user_id,
    'coupon',
    'redeem',
    jsonb_build_object(
      'code', v_coupon.code,
      'type', v_coupon.discount_type,
      'value', v_coupon.discount_value,
      'plan_override', v_coupon.plan_override,
      'plan_days', v_coupon.plan_days,
      'target_plan', v_coupon.target_plan
    )
  );

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
      'plan_days', v_coupon.plan_days,
      'target_plan', v_coupon.target_plan
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) FROM authenticated;
