-- =========================================================================
-- Phase 3 of Task #1 (Backend Remediation) — Portfolio FK migration step 2.
--
-- Cuts the analytics RPCs over to the new stable `portfolio_id uuid` FK
-- (added by 20260418195801_portfolio_id_columns.sql) so a username rename
-- via admin-portfolio-usernames no longer orphans the visit / interaction /
-- short-link history.
--
-- Strategy for this step:
--   1. Add ON UPDATE CASCADE to the legacy username FKs so updating
--      `portfolios.username` propagates to the three analytics tables for
--      the duration of the soak. This keeps the legacy column populated and
--      consistent without forcing a coordinated multi-table update.
--   2. Update record_portfolio_visit to take an optional p_portfolio_id and
--      to write BOTH columns (portfolio_id + the canonical username pulled
--      from `portfolios` so the legacy FK is always satisfied even if the
--      caller passes a stale `p_username`).
--   3. Update resolve_short_link to return portfolio_id alongside username
--      so the caller (and downstream visit insert) can use the stable id.
--   4. Update get_portfolio_analytics to read by portfolio_id (resolved from
--      the caller-supplied username) so renames don't blank the dashboard.
--
-- The legacy `username` / `portfolio_username` columns and FKs are RETAINED
-- for one release, after which a follow-up migration will:
--   • ALTER COLUMN portfolio_id SET NOT NULL on each of the three tables
--   • DROP the legacy columns + their FKs and redundant indexes
-- =========================================================================

-- ── 1. ON UPDATE CASCADE on the legacy username FKs ──────────────────────
-- These constraints were created without ON UPDATE CASCADE, which means
-- updating `portfolios.username` would fail with a FK violation. Recreate
-- them with cascade so the rename flow can keep `portfolios.username` and
-- the legacy columns in sync until the legacy columns are dropped.

ALTER TABLE public.portfolio_visits
  DROP CONSTRAINT IF EXISTS portfolio_visits_username_portfolios_username_fk;
ALTER TABLE public.portfolio_visits
  ADD CONSTRAINT portfolio_visits_username_portfolios_username_fk
  FOREIGN KEY (username) REFERENCES public.portfolios(username)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.portfolio_interactions
  DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_f;
ALTER TABLE public.portfolio_interactions
  DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_fk;
ALTER TABLE public.portfolio_interactions
  ADD CONSTRAINT portfolio_interactions_portfolio_username_portfolios_username_fk
  FOREIGN KEY (portfolio_username) REFERENCES public.portfolios(username)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- NOTE: the production short-link table is `public.short_links` (not
-- `portfolio_short_links` — see Step 1 migration header). The original
-- migration (20260219095357) never added an explicit FK from
-- short_links.portfolio_username → portfolios.username, so we add one here
-- with ON UPDATE CASCADE to keep the legacy column in sync during admin
-- renames. Pre-existing FKs (if any) are dropped first to keep this
-- idempotent across environments.
ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_fkey;
ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_portfolios_username_fk;
ALTER TABLE public.short_links
  ADD CONSTRAINT short_links_portfolio_username_fkey
  FOREIGN KEY (portfolio_username) REFERENCES public.portfolios(username)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- ── 2. record_portfolio_visit: prefer portfolio_id, write both columns ───
-- Drops the previous overload signature first because adding p_portfolio_id
-- in the middle (between p_short_link_id and p_sections_viewed) is a
-- breaking change for positional callers; we route everyone through named
-- args from the edge function. Drop the old signature explicitly to avoid
-- ambiguous-overload errors when both exist.
DROP FUNCTION IF EXISTS public.record_portfolio_visit(
  text, text, text, text, text, jsonb, integer, text, text, text, jsonb
);

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
  v_canonical_username text;
BEGIN
  -- Resolve portfolio_id + canonical username. Prefer the caller's
  -- portfolio_id (stable across rename); fall back to lookup-by-username.
  IF p_portfolio_id IS NOT NULL THEN
    SELECT id, username
      INTO v_portfolio_id, v_canonical_username
      FROM public.portfolios
      WHERE id = p_portfolio_id;
  END IF;

  IF v_portfolio_id IS NULL THEN
    SELECT po.id, po.username
      INTO v_portfolio_id, v_canonical_username
      FROM public.portfolios po
      JOIN public.profiles pr ON pr.user_id = po.user_id
      WHERE pr.username = lower(p_username)
        AND pr.portfolio_enabled = true;
  END IF;

  -- Unknown / disabled portfolio → silently drop the visit, matching the
  -- previous behaviour. We deliberately do not raise so the public tracker
  -- pixel never leaks the existence of (or lack of) a username.
  IF v_portfolio_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.portfolio_visits
    (portfolio_id, username, country, city, referrer, short_link_id,
     sections_viewed, time_spent_seconds, device, company_name, ab_variant,
     sections_timing)
  VALUES
    (v_portfolio_id, v_canonical_username, p_country, p_city, p_referrer,
     p_short_link_id, p_sections_viewed, p_time_spent_seconds, p_device,
     p_company_name, p_ab_variant,
     COALESCE(p_sections_timing, '{}'::jsonb));
END;
$$;

-- ── 3. resolve_short_link: return portfolio_id ───────────────────────────
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
         -- Prefer the row's own portfolio_id; fall back to the joined
         -- portfolio's id (looked up via legacy portfolio_username) so the
         -- caller always receives a stable id during the soak even for rows
         -- that pre-date the portfolio_id back-fill.
         COALESCE(s.portfolio_id, po.id) AS portfolio_id,
         s.portfolio_username,
         s.label,
         s.target_url,
         po.username AS canonical_username
    INTO v_link
  FROM public.short_links s
  LEFT JOIN public.portfolios po
    ON po.id = COALESCE(s.portfolio_id,
                        (SELECT id FROM public.portfolios WHERE username = s.portfolio_username))
  WHERE s.id = p_link_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Increment click count
  UPDATE public.short_links
    SET click_count = click_count + 1
    WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'username',     COALESCE(v_link.canonical_username, v_link.portfolio_username),
    'portfolio_id', v_link.portfolio_id,
    'label',        v_link.label,
    'target_url',   v_link.target_url
  );
END;
$function$;

-- ── 4. increment_short_link_clicks: point at the renamed table ───────────
CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.short_links
  SET click_count = click_count + 1
  WHERE id = p_id;
END;
$$;

-- ── 5. get_portfolio_analytics: query by portfolio_id ────────────────────
CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_portfolio_id uuid;
  v_visits  jsonb;
  v_summary jsonb;
BEGIN
  -- Resolve portfolio_id from the requesting user's profile. Renames update
  -- profiles.username but portfolio_id (= portfolios.id) is stable, so the
  -- analytics history follows the user even after a rename.
  SELECT po.id INTO v_portfolio_id
  FROM public.profiles pr
  JOIN public.portfolios po ON po.user_id = pr.user_id
  WHERE pr.username = lower(p_username)
    AND pr.user_id = public.get_clerk_user_id();

  IF v_portfolio_id IS NULL THEN
    RETURN NULL;
  END IF;

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
    WHERE portfolio_id = v_portfolio_id
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
  WHERE portfolio_id = v_portfolio_id;

  RETURN jsonb_build_object(
    'visits',  v_visits,
    'summary', v_summary
  );
END;
$$;

-- =========================================================================
-- DEFERRED to a follow-up migration after the application has been deployed
-- on this RPC contract for at least one release:
--   • ALTER COLUMN portfolio_id SET NOT NULL on each of the three tables
--   • DROP the legacy username / portfolio_username columns + FKs
--   • Drop redundant per-username indexes (the per-portfolio_id indexes
--     created by 20260418195801 already cover the access patterns)
--   • Drop the p_username arg from get_portfolio_analytics in favour of a
--     portfolio_id-only signature
-- Do NOT do this in the same release — at least one production deploy of
-- the consumer code on the new RPC contract is required first.
-- =========================================================================
