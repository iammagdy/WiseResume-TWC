-- Atomic early-access coupon redemption + account activation for WiseHire.
--
-- wisehire_activate_early_access performs all signup steps in one transaction:
--   1. Validates coupon (active, not expired, not exhausted, wisehire_ prefix)
--   2. Atomically increments uses_count (FOR UPDATE row lock, server-side ++)
--   3. Sets profiles.account_type = 'hr'
--   4. Upserts wisehire_companies row
--   5. Upserts subscriptions row with plan from coupon
--   6. Inserts audit log (non-fatal)
--
-- Because all writes share one transaction, any downstream failure rolls back
-- the coupon increment automatically — no partial state, no stranded redemptions.
--
-- Security: SECURITY DEFINER + SET search_path prevents hijacking.
-- Execution is restricted to service_role only.

CREATE OR REPLACE FUNCTION wisehire_activate_early_access(
  p_user_id     UUID,
  p_code        TEXT,
  p_full_name   TEXT    DEFAULT NULL,
  p_company_name TEXT   DEFAULT NULL,
  p_company_size TEXT   DEFAULT NULL,
  p_now         TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  success       BOOLEAN,
  error_code    TEXT,
  plan_override TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon   discount_codes%ROWTYPE;
  v_plan_days INTEGER;
  v_plan_end  TIMESTAMPTZ;
BEGIN
  -- ── 1. Lock and validate coupon ──────────────────────────────────
  SELECT *
  INTO   v_coupon
  FROM   discount_codes
  WHERE  code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND OR NOT v_coupon.is_active THEN
    RETURN QUERY SELECT FALSE, 'invalid_early_access_code'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < p_now THEN
    RETURN QUERY SELECT FALSE, 'early_access_code_expired'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_coupon.max_uses > 0 AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT FALSE, 'early_access_code_exhausted'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_coupon.plan_override IS NULL OR NOT starts_with(v_coupon.plan_override, 'wisehire_') THEN
    RETURN QUERY SELECT FALSE, 'invalid_early_access_code'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- ── 2. Atomic server-side increment (no stale client value) ──────
  UPDATE discount_codes
  SET    uses_count = uses_count + 1
  WHERE  id = v_coupon.id;

  -- ── 3. Update profile ─────────────────────────────────────────────
  UPDATE profiles
  SET    account_type = 'hr',
         full_name    = COALESCE(NULLIF(trim(p_full_name), ''), full_name)
  WHERE  user_id = p_user_id;

  -- ── 4. Upsert company ─────────────────────────────────────────────
  INSERT INTO wisehire_companies (owner_id, name, size, onboarding_completed)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(trim(p_company_name), ''), 'My Company'),
    COALESCE(NULLIF(trim(p_company_size), ''), '1-10'),
    FALSE
  )
  ON CONFLICT (owner_id) DO NOTHING;

  -- ── 5. Upsert subscription ────────────────────────────────────────
  -- plan_days = NULL means no fixed duration (perpetual / admin-managed).
  -- Leave trial_expires_at and current_period_end as NULL in that case.
  v_plan_days := v_coupon.plan_days;
  v_plan_end  := CASE
                   WHEN v_plan_days IS NOT NULL
                   THEN p_now + (v_plan_days || ' days')::INTERVAL
                   ELSE NULL
                 END;

  INSERT INTO subscriptions (
    user_id, plan_name, trial_plan, trial_expires_at, status,
    current_period_start, current_period_end, coupon_code
  )
  VALUES (
    p_user_id, v_coupon.plan_override, v_coupon.plan_override, v_plan_end, 'active',
    p_now, v_plan_end, upper(trim(p_code))
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan_name            = EXCLUDED.plan_name,
        trial_plan           = EXCLUDED.trial_plan,
        trial_expires_at     = EXCLUDED.trial_expires_at,
        status               = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end   = EXCLUDED.current_period_end,
        coupon_code          = EXCLUDED.coupon_code;

  -- ── 6. Audit log (non-fatal — exception caught so txn doesn't roll back) ──
  BEGIN
    INSERT INTO audit_logs (user_id, category, action, metadata)
    VALUES (
      p_user_id,
      'auth',
      'wisehire_early_access_complete',
      jsonb_build_object(
        'early_access_code', upper(trim(p_code)),
        'plan_override',     v_coupon.plan_override,
        'plan_days',         v_plan_days,
        'company_name',      COALESCE(p_company_name, ''),
        'completed_at',      p_now
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_coupon.plan_override;
END;
$$;

-- Restrict execution to service_role only (called from edge functions, never from client)
REVOKE EXECUTE ON FUNCTION wisehire_activate_early_access FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wisehire_activate_early_access FROM authenticated;
GRANT  EXECUTE ON FUNCTION wisehire_activate_early_access TO service_role;
