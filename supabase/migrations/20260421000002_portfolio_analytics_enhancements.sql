-- Task #20: Portfolio analytics & insights enhancements
--
-- 1. Add company_name (reverse-DNS / ISP detection), ab_variant (A/B theme test),
--    and sections_timing (per-section dwell time in seconds) to portfolio_visits.
-- 2. Update record_portfolio_visit to accept the new params.
-- 3. Update get_portfolio_analytics to include the new fields in the returned JSON.

ALTER TABLE public.portfolio_visits
  ADD COLUMN IF NOT EXISTS company_name    text,
  ADD COLUMN IF NOT EXISTS ab_variant      text CHECK (ab_variant IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS sections_timing jsonb DEFAULT '{}'::jsonb;

-- ── Updated record_portfolio_visit ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_portfolio_visit(
  p_username            text,
  p_country             text    DEFAULT NULL,
  p_city                text    DEFAULT NULL,
  p_referrer            text    DEFAULT NULL,
  p_short_link_id       text    DEFAULT NULL,
  p_sections_viewed     jsonb   DEFAULT '[]'::jsonb,
  p_time_spent_seconds  integer DEFAULT NULL,
  p_device              text    DEFAULT NULL,
  p_company_name        text    DEFAULT NULL,
  p_ab_variant          text    DEFAULT NULL,
  p_sections_timing     jsonb   DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username) AND portfolio_enabled = true
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.portfolio_visits
    (username, country, city, referrer, short_link_id,
     sections_viewed, time_spent_seconds, device, company_name, ab_variant,
     sections_timing)
  VALUES
    (lower(p_username), p_country, p_city, p_referrer, p_short_link_id,
     p_sections_viewed, p_time_spent_seconds, p_device,
     p_company_name, p_ab_variant,
     COALESCE(p_sections_timing, '{}'::jsonb));
END;
$$;

-- ── Updated get_portfolio_analytics ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile record;
  v_visits  jsonb;
  v_summary jsonb;
BEGIN
  SELECT user_id INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username) AND user_id = public.get_clerk_user_id();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Limit rows BEFORE aggregation to prevent unbounded jsonb_agg on large tables
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 pv.id,
      'country',            pv.country,
      'city',               pv.city,
      'time_spent_seconds', pv.time_spent_seconds,
      'sections_viewed',    pv.sections_viewed,
      'sections_timing',    COALESCE(pv.sections_timing, '{}'::jsonb),
      'referrer',           pv.referrer,
      'short_link_id',      pv.short_link_id,
      'visited_at',         pv.visited_at,
      'device',             pv.device,
      'company_name',       pv.company_name,
      'ab_variant',         pv.ab_variant
    ) ORDER BY pv.visited_at DESC
  ), '[]'::jsonb)
  INTO v_visits
  FROM (
    SELECT * FROM public.portfolio_visits
    WHERE username = lower(p_username)
    ORDER BY visited_at DESC
    LIMIT 100
  ) pv;

  SELECT jsonb_build_object(
    'total_visits',      count(*),
    'unique_countries',  count(DISTINCT country) FILTER (WHERE country IS NOT NULL),
    'avg_time_seconds',  round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL))::int,
    'avg_time_variant_a', round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL AND ab_variant = 'a'))::int,
    'avg_time_variant_b', round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL AND ab_variant = 'b'))::int,
    'visits_variant_a',  count(*) FILTER (WHERE ab_variant = 'a'),
    'visits_variant_b',  count(*) FILTER (WHERE ab_variant = 'b')
  )
  INTO v_summary
  FROM public.portfolio_visits
  WHERE username = lower(p_username);

  RETURN jsonb_build_object(
    'visits',  v_visits,
    'summary', v_summary
  );
END;
$$;
