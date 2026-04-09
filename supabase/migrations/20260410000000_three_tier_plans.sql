-- Three-Tier Plan System Foundation
-- Phase 1: Data foundation for free/pro/premium plan enforcement

-- ============================================================
-- 1. Normalise existing plan_name values to lowercase
-- ============================================================
UPDATE public.subscriptions
SET plan_name = lower(plan_name)
WHERE plan_name IS NOT NULL;

-- Set any nulls or unrecognised values to 'free'
UPDATE public.subscriptions
SET plan_name = 'free'
WHERE plan_name IS NULL OR plan_name NOT IN ('free', 'pro', 'premium');

-- ============================================================
-- 2. Add CHECK constraint + audit columns to subscriptions
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_updated_by TEXT;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_name_check
    CHECK (plan_name IN ('free', 'pro', 'premium'));

-- ============================================================
-- 3. Update initialize_subscription trigger to use 'free'
-- ============================================================
CREATE OR REPLACE FUNCTION public.initialize_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_name, status)
  VALUES (NEW.user_id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Fix ai_credits daily_limit default (was 20, now 5 for free)
-- ============================================================
ALTER TABLE public.ai_credits
  ALTER COLUMN daily_limit SET DEFAULT 5;

-- Backfill: users who still have the old 20 default are on the free plan → set to 5
UPDATE public.ai_credits
SET daily_limit = 5
WHERE daily_limit = 20;

-- ============================================================
-- 5. Create get_my_plan() RPC — called by the frontend
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_plan()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.subscriptions
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    -- Auto-initialise if somehow missing
    INSERT INTO public.subscriptions (user_id, plan_name, status)
    VALUES (auth.uid(), 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object(
      'plan_name', 'free',
      'status', 'active',
      'plan_updated_at', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'plan_name', COALESCE(v_row.plan_name, 'free'),
    'status', COALESCE(v_row.status, 'active'),
    'plan_updated_at', v_row.plan_updated_at
  );
END;
$$;

-- Grant execute to authenticated users (bridge token has role=authenticated)
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;

-- ============================================================
-- 6. Create admin_set_user_plan() RPC — called via service role
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
  -- Validate and normalise plan
  v_clean_plan := lower(trim(p_new_plan));

  IF v_clean_plan NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan: must be free, pro, or premium');
  END IF;

  -- Map plan → credit limits
  CASE v_clean_plan
    WHEN 'free' THEN
      v_daily_limit     := 5;
      v_monthly_credits := 150;
    WHEN 'pro' THEN
      v_daily_limit     := 100;
      v_monthly_credits := 3000;
    WHEN 'premium' THEN
      v_daily_limit     := 999999;
      v_monthly_credits := 999999;
  END CASE;

  -- Update subscription row
  UPDATE public.subscriptions
  SET
    plan_name        = v_clean_plan,
    status           = 'active',
    plan_updated_at  = now(),
    plan_updated_by  = p_updated_by,
    ai_credits_monthly = v_monthly_credits,
    updated_at       = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User subscription not found');
  END IF;

  -- Update daily credit limit in ai_credits table
  UPDATE public.ai_credits
  SET daily_limit = v_daily_limit
  WHERE user_id = p_target_user_id;

  -- If no ai_credits row exists yet, it will get the correct default when first created.

  -- Audit log
  INSERT INTO public.audit_logs (user_id, category, action, metadata)
  VALUES (
    p_target_user_id,
    'admin',
    'plan_change',
    jsonb_build_object('new_plan', v_clean_plan, 'updated_by', p_updated_by)
  );

  RETURN jsonb_build_object('success', true, 'plan', v_clean_plan, 'daily_limit', v_daily_limit);
END;
$$;

-- Only service role can call this (no GRANT to authenticated)
REVOKE ALL ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM authenticated;

COMMENT ON FUNCTION public.get_my_plan() IS 'Returns the current authenticated user''s plan info.';
COMMENT ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) IS 'Admin-only: set a user''s plan. Callable via service-role edge functions only.';
