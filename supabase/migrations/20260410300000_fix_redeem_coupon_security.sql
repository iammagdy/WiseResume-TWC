-- ============================================================
-- Security fix: redeem_coupon IDOR / broken access control
-- Strategy: Keep p_user_id parameter but:
--   1. Revoke EXECUTE from authenticated role entirely
--   2. Grant ONLY to service_role (the redeem-coupon edge function)
--   3. Edge function already enforces JWT auth via requireAuth()
-- This means arbitrary authenticated users cannot call the RPC directly.
-- ============================================================

-- Drop the old signature first
DROP FUNCTION IF EXISTS public.redeem_coupon(TEXT, UUID);
DROP FUNCTION IF EXISTS public.redeem_coupon(TEXT);

-- Re-create: service_role only (called exclusively via edge function which enforces JWT auth)
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_coupon     RECORD;
  v_already    BOOLEAN;
BEGIN
  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

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
    WHERE coupon_id = v_coupon.id AND user_id = v_user_id
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this coupon');
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id)
  VALUES (v_coupon.id, v_user_id);

  UPDATE public.discount_codes
  SET uses_count = uses_count + 1
  WHERE id = v_coupon.id;

  -- Apply plan upgrade
  IF v_coupon.discount_type = 'plan_upgrade' AND v_coupon.plan_override IS NOT NULL THEN
    IF v_coupon.plan_days IS NOT NULL THEN
      PERFORM public.admin_grant_trial(v_user_id, v_coupon.plan_override, v_coupon.plan_days);
    ELSE
      PERFORM public.admin_set_user_plan(v_user_id, v_coupon.plan_override, 'coupon:' || p_code);
    END IF;
  END IF;

  -- Persist percent coupon discount on subscription record
  IF v_coupon.discount_type = 'percent' AND v_coupon.discount_value > 0 THEN
    UPDATE public.subscriptions
    SET coupon_code = v_coupon.code,
        coupon_discount_percent = v_coupon.discount_value
    WHERE user_id = v_user_id;
  END IF;

  -- Write to audit_logs (consistent with all admin RPCs)
  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    v_user_id,
    'coupon',
    'redeem',
    jsonb_build_object(
      'code', v_coupon.code,
      'type', v_coupon.discount_type,
      'value', v_coupon.discount_value,
      'plan_override', v_coupon.plan_override,
      'plan_days', v_coupon.plan_days
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
      'plan_days', v_coupon.plan_days
    )
  );
END;
$$;

-- Restricted to service_role only — the redeem-coupon edge function is the only caller
-- and it enforces JWT authentication via requireAuth() before calling this RPC.
-- Authenticated users cannot call this directly from the client.
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID) FROM authenticated;
