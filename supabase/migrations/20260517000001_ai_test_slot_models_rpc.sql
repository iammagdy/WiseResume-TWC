-- Atomic upsert for one slot's AI-test model selection.
--
-- Stores the per-slot DevKit model selection in a single JSONB row at
-- app_settings.ai_test_slot_models. Concurrent admin updates to *different*
-- slots must not lose each other's writes — a naive read-modify-write from
-- the edge function would race. This RPC performs the merge as a single SQL
-- statement (`||` JSONB concat preserves keys not being written), so two
-- parallel calls for different slot keys both end up reflected in the row.
--
-- Returns the post-merge value so callers can reconcile their local state
-- without a second roundtrip.

CREATE OR REPLACE FUNCTION public.set_ai_test_slot_model(
  p_slot_key TEXT,
  p_model    TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new JSONB;
BEGIN
  IF p_slot_key IS NULL OR length(p_slot_key) = 0 THEN
    RAISE EXCEPTION 'p_slot_key must be a non-empty string';
  END IF;
  IF p_model IS NULL OR length(p_model) = 0 THEN
    RAISE EXCEPTION 'p_model must be a non-empty string';
  END IF;

  INSERT INTO public.app_settings (key, value, updated_at)
  VALUES (
    'ai_test_slot_models',
    jsonb_build_object(p_slot_key, p_model),
    now()
  )
  ON CONFLICT (key) DO UPDATE
    SET value = COALESCE(public.app_settings.value, '{}'::jsonb)
                || jsonb_build_object(p_slot_key, p_model),
        updated_at = now()
  RETURNING value INTO v_new;

  RETURN v_new;
END;
$$;

-- Lock down the function: only service_role (used by edge functions) may call.
REVOKE ALL ON FUNCTION public.set_ai_test_slot_model(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_ai_test_slot_model(TEXT, TEXT) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_ai_test_slot_model(TEXT, TEXT) TO service_role;
