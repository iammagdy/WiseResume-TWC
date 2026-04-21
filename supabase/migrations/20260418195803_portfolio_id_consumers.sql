-- =========================================================================
-- Phase 3 of Task #1 (Backend Remediation) — Portfolio FK migration step 2.
--
-- Cuts the analytics RPCs over to the new stable `portfolio_id uuid` FK
-- (added by 20260418195801_portfolio_id_columns.sql) so a username rename
-- via admin-portfolio-usernames no longer orphans the visit / interaction /
-- short-link history.
--
-- NOTE (2026-04-21 sync): On the canonical Supabase project
-- `public.portfolios` does NOT exist — see the header note inside
-- 20260418195801_portfolio_id_columns.sql. Every block below is wrapped in
-- existence guards so it cleanly no-ops where the target object is absent.
-- The portfolio-id consumer cutover this migration was designed for needs
-- a separate plan that first creates `portfolios` (or redefines this work
-- against the existing `profiles`-as-portfolio model).
-- =========================================================================

DO $$
BEGIN
  IF to_regclass('public.portfolios') IS NULL THEN
    RAISE NOTICE 'portfolio_id_consumers: public.portfolios is absent — skipping (FKs, RPCs, indexes left as-is)';
    RETURN;
  END IF;

  -- ── 1. ON UPDATE CASCADE on the legacy username FKs ────────────────────
  IF to_regclass('public.portfolio_visits') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.portfolio_visits DROP CONSTRAINT IF EXISTS portfolio_visits_username_portfolios_username_fk';
    EXECUTE $sql$
      ALTER TABLE public.portfolio_visits
        ADD CONSTRAINT portfolio_visits_username_portfolios_username_fk
        FOREIGN KEY (username) REFERENCES public.portfolios(username)
        ON UPDATE CASCADE ON DELETE CASCADE
    $sql$;
  END IF;

  IF to_regclass('public.portfolio_interactions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.portfolio_interactions DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_f';
    EXECUTE 'ALTER TABLE public.portfolio_interactions DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_fk';
    EXECUTE $sql$
      ALTER TABLE public.portfolio_interactions
        ADD CONSTRAINT portfolio_interactions_portfolio_username_portfolios_username_fk
        FOREIGN KEY (portfolio_username) REFERENCES public.portfolios(username)
        ON UPDATE CASCADE ON DELETE CASCADE
    $sql$;
  END IF;

  IF to_regclass('public.short_links') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_portfolio_username_fkey';
    EXECUTE 'ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_portfolio_username_portfolios_username_fk';
    EXECUTE $sql$
      ALTER TABLE public.short_links
        ADD CONSTRAINT short_links_portfolio_username_fkey
        FOREIGN KEY (portfolio_username) REFERENCES public.portfolios(username)
        ON UPDATE CASCADE ON DELETE CASCADE
    $sql$;
  END IF;

  -- ── 2-5. RPC redefinitions (unchanged from original migration) ─────────
  EXECUTE 'DROP FUNCTION IF EXISTS public.record_portfolio_visit(text, text, text, text, text, jsonb, integer, text, text, text, jsonb)';

  EXECUTE $rpc$
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
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
    DECLARE
      v_portfolio_id uuid;
      v_canonical_username text;
    BEGIN
      IF p_portfolio_id IS NOT NULL THEN
        SELECT id, username INTO v_portfolio_id, v_canonical_username
          FROM public.portfolios WHERE id = p_portfolio_id;
      END IF;
      IF v_portfolio_id IS NULL THEN
        SELECT po.id, po.username INTO v_portfolio_id, v_canonical_username
          FROM public.portfolios po
          JOIN public.profiles pr ON pr.user_id = po.user_id
          WHERE pr.username = lower(p_username) AND pr.portfolio_enabled = true;
      END IF;
      IF v_portfolio_id IS NULL THEN RETURN; END IF;
      INSERT INTO public.portfolio_visits
        (portfolio_id, username, country, city, referrer, short_link_id,
         sections_viewed, time_spent_seconds, device, company_name, ab_variant,
         sections_timing)
      VALUES
        (v_portfolio_id, v_canonical_username, p_country, p_city, p_referrer,
         p_short_link_id, p_sections_viewed, p_time_spent_seconds, p_device,
         p_company_name, p_ab_variant, COALESCE(p_sections_timing, '{}'::jsonb));
    END;
    $body$
  $rpc$;

  EXECUTE $rpc$
    CREATE OR REPLACE FUNCTION public.resolve_short_link(p_link_id text)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $body$
    DECLARE v_link record;
    BEGIN
      SELECT s.id,
             COALESCE(s.portfolio_id, po.id) AS portfolio_id,
             s.portfolio_username, s.label, s.target_url,
             po.username AS canonical_username
        INTO v_link
      FROM public.short_links s
      LEFT JOIN public.portfolios po
        ON po.id = COALESCE(s.portfolio_id,
                            (SELECT id FROM public.portfolios WHERE username = s.portfolio_username))
      WHERE s.id = p_link_id;
      IF NOT FOUND THEN RETURN NULL; END IF;
      UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_link_id;
      RETURN jsonb_build_object(
        'username',     COALESCE(v_link.canonical_username, v_link.portfolio_username),
        'portfolio_id', v_link.portfolio_id,
        'label',        v_link.label,
        'target_url',   v_link.target_url
      );
    END;
    $body$
  $rpc$;

  EXECUTE $rpc$
    CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(p_id text)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $body$ BEGIN
      UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_id;
    END; $body$
  $rpc$;

  EXECUTE $rpc$
    CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(p_username text)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $body$
    DECLARE v_portfolio_id uuid; v_visits jsonb; v_summary jsonb;
    BEGIN
      SELECT po.id INTO v_portfolio_id
      FROM public.profiles pr
      JOIN public.portfolios po ON po.user_id = pr.user_id
      WHERE pr.username = lower(p_username)
        AND pr.user_id = public.get_clerk_user_id();
      IF v_portfolio_id IS NULL THEN RETURN NULL; END IF;
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'id', pv.id, 'country', pv.country, 'city', pv.city,
          'time_spent_seconds', pv.time_spent_seconds,
          'sections_viewed', pv.sections_viewed,
          'sections_timing', COALESCE(pv.sections_timing, '{}'::jsonb),
          'referrer', pv.referrer, 'short_link_id', pv.short_link_id,
          'visited_at', pv.visited_at, 'device', pv.device,
          'company_name', pv.company_name, 'ab_variant', pv.ab_variant
        ) ORDER BY pv.visited_at DESC
      ), '[]'::jsonb) INTO v_visits
      FROM (
        SELECT * FROM public.portfolio_visits
        WHERE portfolio_id = v_portfolio_id
        ORDER BY visited_at DESC LIMIT 100
      ) pv;
      SELECT jsonb_build_object(
        'total_visits',      count(*),
        'unique_countries',  count(DISTINCT country) FILTER (WHERE country IS NOT NULL),
        'avg_time_seconds',  round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL))::int,
        'avg_time_variant_a', round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL AND ab_variant = 'a'))::int,
        'avg_time_variant_b', round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL AND ab_variant = 'b'))::int,
        'visits_variant_a',  count(*) FILTER (WHERE ab_variant = 'a'),
        'visits_variant_b',  count(*) FILTER (WHERE ab_variant = 'b')
      ) INTO v_summary
      FROM public.portfolio_visits WHERE portfolio_id = v_portfolio_id;
      RETURN jsonb_build_object('visits', v_visits, 'summary', v_summary);
    END;
    $body$
  $rpc$;
END $$;
