-- =========================================================================
-- Drop legacy portfolio_username / username text columns from the three
-- analytics tables now that ALL application code has been cut over to
-- the stable `portfolio_id uuid` FK.
--
-- This migration MUST be applied after:
--   1. The consumer code (useShortLinks, useCreateShortLink, portfolio-interest
--      edge function) has been deployed writing only portfolio_id.
--   2. The verification queries below return 0 rows.
--
-- VERIFICATION QUERIES (run in Supabase SQL editor before applying):
--
--   SELECT COUNT(*) FROM public.portfolio_visits      WHERE portfolio_id IS NULL;
--   SELECT COUNT(*) FROM public.portfolio_interactions WHERE portfolio_id IS NULL;
--   SELECT COUNT(*) FROM public.short_links
--     WHERE portfolio_id IS NULL
--       AND (portfolio_username IS NOT NULL OR owner_user_id IS NOT NULL);
--
-- All three should return 0 before you proceed.
-- =========================================================================

-- ── 0. Update RPCs to stop writing legacy columns BEFORE dropping them ──────

-- record_portfolio_visit: remove the `username` column write so the INSERT
-- succeeds after the column is dropped in step 1 below.
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
  p_sections_timing     jsonb   DEFAULT '{}'::jsonb,
  p_portfolio_id        uuid    DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_portfolio_id uuid;
BEGIN
  -- Resolve portfolio_id. Prefer caller-supplied stable id; fall back to username lookup.
  IF p_portfolio_id IS NOT NULL THEN
    SELECT id INTO v_portfolio_id FROM public.portfolios WHERE id = p_portfolio_id;
  END IF;

  IF v_portfolio_id IS NULL THEN
    SELECT po.id INTO v_portfolio_id
    FROM public.portfolios po
    JOIN public.profiles pr ON pr.user_id = po.user_id
    WHERE pr.username = lower(p_username)
      AND pr.portfolio_enabled = true;
  END IF;

  -- Unknown / disabled portfolio → silently drop, matching prior behaviour.
  IF v_portfolio_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.portfolio_visits
    (portfolio_id, country, city, referrer, short_link_id,
     sections_viewed, time_spent_seconds, device, company_name, ab_variant,
     sections_timing)
  VALUES
    (v_portfolio_id, p_country, p_city, p_referrer,
     p_short_link_id, p_sections_viewed, p_time_spent_seconds, p_device,
     p_company_name, p_ab_variant,
     COALESCE(p_sections_timing, '{}'::jsonb));
END;
$$;

-- resolve_short_link: remove portfolio_username from the SELECT and returned
-- object so the query succeeds after the column is dropped in step 3 below.
CREATE OR REPLACE FUNCTION public.resolve_short_link(p_link_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
BEGIN
  SELECT s.id,
         COALESCE(s.portfolio_id, po.id) AS portfolio_id,
         s.label,
         s.target_url,
         po.username AS canonical_username
    INTO v_link
  FROM public.short_links s
  LEFT JOIN public.portfolios po ON po.id = s.portfolio_id
  WHERE s.id = p_link_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'username',     v_link.canonical_username,
    'portfolio_id', v_link.portfolio_id,
    'label',        v_link.label,
    'target_url',   v_link.target_url
  );
END;
$function$;

-- ── 1. portfolio_visits: make portfolio_id NOT NULL, drop legacy username ────

ALTER TABLE public.portfolio_visits
  ALTER COLUMN portfolio_id SET NOT NULL;

ALTER TABLE public.portfolio_visits
  DROP CONSTRAINT IF EXISTS portfolio_visits_username_portfolios_username_fk;

ALTER TABLE public.portfolio_visits
  DROP COLUMN IF EXISTS username;

-- ── 2. portfolio_interactions: make portfolio_id NOT NULL, drop legacy ───────

ALTER TABLE public.portfolio_interactions
  ALTER COLUMN portfolio_id SET NOT NULL;

ALTER TABLE public.portfolio_interactions
  DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_fk;

ALTER TABLE public.portfolio_interactions
  DROP COLUMN IF EXISTS portfolio_username;

-- ── 3. short_links: drop legacy portfolio_username column ───────────────────
-- Note: portfolio_id may remain nullable on short_links because not every
-- short link is tied to a portfolio (some are universal redirect links).

ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_fkey;

ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_portfolios_username_fk;

ALTER TABLE public.short_links
  DROP COLUMN IF EXISTS portfolio_username;

-- =========================================================================
-- Post-drop: indexes added by 20260418195801 (idx_portfolio_visits_portfolio_visited,
-- idx_portfolio_interactions_portfolio_id, idx_short_links_portfolio_id) remain
-- valid and cover the access patterns — no further index changes needed.
-- =========================================================================
