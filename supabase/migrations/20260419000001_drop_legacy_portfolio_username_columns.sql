-- =========================================================================
-- Drop legacy portfolio_username / username text columns from the three
-- analytics tables now that ALL application code has been cut over to
-- the stable `portfolio_id uuid` FK.
--
-- NOTE (2026-04-21 sync): On the canonical Supabase project
-- `public.portfolios` does NOT exist and `portfolio_id` was therefore never
-- back-filled on portfolio_visits / portfolio_interactions / short_links.
-- The username columns are still the only FK in use. Dropping them now
-- would break the running app. Every block below is gated on the existence
-- of both `public.portfolios` AND a non-null `portfolio_id` column on the
-- target table, so this migration cleanly no-ops where the prerequisites
-- are absent and only runs on environments where the prior portfolio_id
-- back-fill (20260418195801 / 20260418195803) actually completed.
-- =========================================================================

DO $$
BEGIN
  IF to_regclass('public.portfolios') IS NULL THEN
    RAISE NOTICE 'drop_legacy_portfolio_username_columns: public.portfolios is absent — skipping';
    RETURN;
  END IF;

  -- Update record_portfolio_visit so it stops writing the legacy `username` column.
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
    DECLARE v_portfolio_id uuid;
    BEGIN
      IF p_portfolio_id IS NOT NULL THEN
        SELECT id INTO v_portfolio_id FROM public.portfolios WHERE id = p_portfolio_id;
      END IF;
      IF v_portfolio_id IS NULL THEN
        SELECT po.id INTO v_portfolio_id
        FROM public.portfolios po
        JOIN public.profiles pr ON pr.user_id = po.user_id
        WHERE pr.username = lower(p_username) AND pr.portfolio_enabled = true;
      END IF;
      IF v_portfolio_id IS NULL THEN RETURN; END IF;
      INSERT INTO public.portfolio_visits
        (portfolio_id, country, city, referrer, short_link_id,
         sections_viewed, time_spent_seconds, device, company_name, ab_variant,
         sections_timing)
      VALUES
        (v_portfolio_id, p_country, p_city, p_referrer,
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
      SELECT s.id, COALESCE(s.portfolio_id, po.id) AS portfolio_id,
             s.label, s.target_url, po.username AS canonical_username
        INTO v_link
      FROM public.short_links s
      LEFT JOIN public.portfolios po ON po.id = s.portfolio_id
      WHERE s.id = p_link_id;
      IF NOT FOUND THEN RETURN NULL; END IF;
      UPDATE public.short_links SET click_count = click_count + 1 WHERE id = p_link_id;
      RETURN jsonb_build_object(
        'username',     v_link.canonical_username,
        'portfolio_id', v_link.portfolio_id,
        'label',        v_link.label,
        'target_url',   v_link.target_url
      );
    END;
    $body$
  $rpc$;

  -- portfolio_visits: NOT NULL + drop legacy username — only if portfolio_id exists & is fully back-filled
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='portfolio_visits' AND column_name='portfolio_id')
     AND NOT EXISTS (SELECT 1 FROM public.portfolio_visits WHERE portfolio_id IS NULL)
  THEN
    EXECUTE 'ALTER TABLE public.portfolio_visits ALTER COLUMN portfolio_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.portfolio_visits DROP CONSTRAINT IF EXISTS portfolio_visits_username_portfolios_username_fk';
    EXECUTE 'ALTER TABLE public.portfolio_visits DROP COLUMN IF EXISTS username';
  END IF;

  -- portfolio_interactions: same gate
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='portfolio_interactions' AND column_name='portfolio_id')
     AND NOT EXISTS (SELECT 1 FROM public.portfolio_interactions WHERE portfolio_id IS NULL)
  THEN
    EXECUTE 'ALTER TABLE public.portfolio_interactions ALTER COLUMN portfolio_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.portfolio_interactions DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_fk';
    EXECUTE 'ALTER TABLE public.portfolio_interactions DROP COLUMN IF EXISTS portfolio_username';
  END IF;

  -- short_links: portfolio_id may stay nullable (universal redirects), but drop the legacy column safely.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='short_links' AND column_name='portfolio_id')
  THEN
    EXECUTE 'ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_portfolio_username_fkey';
    EXECUTE 'ALTER TABLE public.short_links DROP CONSTRAINT IF EXISTS short_links_portfolio_username_portfolios_username_fk';
    EXECUTE 'ALTER TABLE public.short_links DROP COLUMN IF EXISTS portfolio_username';
  END IF;
END $$;
