-- Atomic premium handle assignment RPC — Task #14.
-- Validates the handle state, sets the user's username, and marks the premium
-- record as assigned in a single transaction.  Any failure rolls everything back.

CREATE OR REPLACE FUNCTION public.assign_premium_handle(
  p_username          TEXT,
  p_target_user_id    UUID,
  p_admin_note        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing          public.portfolio_premium_usernames%ROWTYPE;
  v_result_note       TEXT;
BEGIN
  -- Lock the premium row to prevent concurrent assignment races
  SELECT * INTO v_existing
  FROM public.portfolio_premium_usernames
  WHERE username = p_username
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Premium handle not found');
  END IF;

  IF v_existing.status = 'assigned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Handle is already assigned');
  END IF;

  -- Determine note: caller-supplied > existing note > empty string
  v_result_note := COALESCE(NULLIF(p_admin_note, ''), v_existing.note, '');

  -- 1. Set the username on the user's profile
  UPDATE public.profiles
  SET    username = p_username
  WHERE  user_id  = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user not found in profiles');
  END IF;

  -- 2. Mark the premium record as assigned
  UPDATE public.portfolio_premium_usernames
  SET
    status              = 'assigned',
    assigned_to_user_id = p_target_user_id,
    assigned_at         = now(),
    note                = v_result_note,
    updated_at          = now()
  WHERE username = p_username;

  RETURN jsonb_build_object(
    'success',        true,
    'price_cents',    v_existing.price_cents,
    'currency',       v_existing.currency,
    'old_note',       v_existing.note
  );
END;
$$;

-- Only service-role (admin edge functions) should call this.
REVOKE ALL ON FUNCTION public.assign_premium_handle(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_premium_handle(TEXT, UUID, TEXT) TO service_role;
