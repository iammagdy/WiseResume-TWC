-- Task #20: Portfolio analytics & insights enhancements
--
-- 1. Add company_name (reverse-DNS / ISP detection) and ab_variant (A/B theme test)
--    columns to portfolio_visits.
-- 2. Update record_portfolio_visit to accept the new params.
-- 3. Update get_portfolio_analytics to include the new fields in the returned JSON.

ALTER TABLE public.portfolio_visits
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS ab_variant   text CHECK (ab_variant IN ('a', 'b'));

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
  p_ab_variant          text    DEFAULT NULL
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
     sections_viewed, time_spent_seconds, device, company_name, ab_variant)
  VALUES
    (lower(p_username), p_country, p_city, p_referrer, p_short_link_id,
     p_sections_viewed, p_time_spent_seconds, p_device,
     p_company_name, p_ab_variant);
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

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 pv.id,
      'country',            pv.country,
      'city',               pv.city,
      'time_spent_seconds', pv.time_spent_seconds,
      'sections_viewed',    pv.sections_viewed,
      'referrer',           pv.referrer,
      'short_link_id',      pv.short_link_id,
      'visited_at',         pv.visited_at,
      'device',             pv.device,
      'company_name',       pv.company_name,
      'ab_variant',         pv.ab_variant
    ) ORDER BY pv.visited_at DESC
  ), '[]'::jsonb)
  INTO v_visits
  FROM public.portfolio_visits pv
  WHERE pv.username = lower(p_username)
  LIMIT 100;

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
