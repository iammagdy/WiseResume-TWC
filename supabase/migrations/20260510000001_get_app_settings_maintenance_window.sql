-- Extend get_app_settings() to expose maintenance_window_start/end
-- and apply the maintenance_mode auto-toggle on every call (not just admin calls).
-- This means any authenticated or anon page load within the window will ensure
-- maintenance_mode is accurate without requiring an admin fetch.

CREATE OR REPLACE FUNCTION public.get_app_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings   JSONB;
  v_start      TEXT;
  v_end        TEXT;
  v_now        TIMESTAMPTZ;
  v_in_window  BOOLEAN;
  v_past_end   BOOLEAN;
  v_mode_on    BOOLEAN;
  v_source     TEXT;
BEGIN
  -- Read the current settings row set
  SELECT jsonb_object_agg(key, value)
  INTO v_settings
  FROM public.app_settings
  WHERE key IN (
    'maintenance_mode',
    'maintenance_mode_source',
    'maintenance_window_start',
    'maintenance_window_end',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  );

  v_settings := COALESCE(v_settings, '{}'::JSONB);

  -- Auto-toggle maintenance_mode when a window is configured
  v_start := v_settings->>'maintenance_window_start';
  v_end   := v_settings->>'maintenance_window_end';

  IF v_start IS NOT NULL AND v_end IS NOT NULL THEN
    v_now       := now();
    v_in_window := v_now >= v_start::TIMESTAMPTZ AND v_now <= v_end::TIMESTAMPTZ;
    v_past_end  := v_now > v_end::TIMESTAMPTZ;
    v_mode_on   := COALESCE((v_settings->>'maintenance_mode')::BOOLEAN, false);
    v_source    := COALESCE(v_settings->>'maintenance_mode_source', '');

    IF v_in_window AND NOT v_mode_on THEN
      UPDATE public.app_settings SET value = 'true', updated_at = now()
        WHERE key = 'maintenance_mode';
      INSERT INTO public.app_settings (key, value, updated_at)
        VALUES ('maintenance_mode', 'true', now())
        ON CONFLICT (key) DO NOTHING;
      INSERT INTO public.app_settings (key, value, updated_at)
        VALUES ('maintenance_mode_source', '"window"', now())
        ON CONFLICT (key) DO UPDATE SET value = '"window"', updated_at = now();
      v_settings := jsonb_set(v_settings, '{maintenance_mode}', 'true');
      v_settings := jsonb_set(v_settings, '{maintenance_mode_source}', '"window"');

    ELSIF v_past_end AND v_mode_on AND v_source = 'window' THEN
      UPDATE public.app_settings SET value = 'false', updated_at = now()
        WHERE key = 'maintenance_mode';
      INSERT INTO public.app_settings (key, value, updated_at)
        VALUES ('maintenance_mode', 'false', now())
        ON CONFLICT (key) DO NOTHING;
      v_settings := jsonb_set(v_settings, '{maintenance_mode}', 'false');
    END IF;
  END IF;

  -- Strip internal plumbing key from public result
  v_settings := v_settings - 'maintenance_mode_source';

  RETURN v_settings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO service_role;
