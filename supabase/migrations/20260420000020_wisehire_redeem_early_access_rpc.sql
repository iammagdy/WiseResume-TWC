-- Atomic early-access coupon redemption for WiseHire.
--
-- Validates the code (active, not expired, not exhausted, wisehire_ plan prefix)
-- and increments uses_count in a single transaction with a FOR UPDATE row lock,
-- preventing concurrent over-redemption and lost updates.

CREATE OR REPLACE FUNCTION wisehire_redeem_early_access_code(p_code TEXT)
RETURNS TABLE (
  success     BOOLEAN,
  error_code  TEXT,
  plan_override TEXT,
  plan_days   INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon discount_codes%ROWTYPE;
BEGIN
  -- Lock the row for the duration of this transaction
  SELECT *
  INTO   v_coupon
  FROM   discount_codes
  WHERE  code = upper(trim(p_code))
  FOR UPDATE;

  -- Code not found or inactive
  IF NOT FOUND OR NOT v_coupon.is_active THEN
    RETURN QUERY SELECT FALSE, 'invalid_early_access_code', NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Expired
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'early_access_code_expired', NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Max-uses reached (0 means unlimited)
  IF v_coupon.max_uses > 0 AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT FALSE, 'early_access_code_exhausted', NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Must be a WiseHire coupon
  IF v_coupon.plan_override IS NULL OR NOT starts_with(v_coupon.plan_override, 'wisehire_') THEN
    RETURN QUERY SELECT FALSE, 'invalid_early_access_code', NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- Atomic server-side increment (no stale client value)
  UPDATE discount_codes
  SET    uses_count = uses_count + 1
  WHERE  id = v_coupon.id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_coupon.plan_override, v_coupon.plan_days;
END;
$$;
