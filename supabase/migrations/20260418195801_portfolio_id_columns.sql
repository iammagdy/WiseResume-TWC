-- =========================================================================
-- Phase 3 of Task #1 (Backend Remediation) — Portfolio FK migration step 1.
--
-- Adds nullable `portfolio_id uuid` columns to the three portfolio_* tables
-- and back-fills them from the existing username-based FK. The legacy
-- username columns are RETAINED for now so the running app keeps working;
-- a follow-up migration (gated by Step 9 of the plan) will:
--   • flip the FK direction (NOT NULL on portfolio_id, drop on username FK)
--   • drop the username columns once all callers read portfolio_id
--
-- Safe to apply via `supabase db push`. Idempotent.
--
-- NOTE (2026-04-18 application closure): On the canonical Supabase project
-- `public.portfolios` and `public.portfolio_interactions` do NOT exist —
-- the live app stores portfolio data on `public.profiles` (with username
-- and portfolio_* columns). The canonical short-link store is
-- `public.short_links` (NOT `public.portfolio_short_links`, which only
-- exists in some dev DBs and is not the production table). Every block
-- below is wrapped in existence guards so it cleanly no-ops where the
-- target object is absent. The structural cutover this migration was
-- designed for needs a separate plan that first creates `portfolios` (or
-- redefines this work against the existing `profiles`-as-portfolio model).
-- =========================================================================

DO $$
BEGIN
  -- Bail early if there is nothing to point a portfolio_id FK at.
  IF to_regclass('public.portfolios') IS NULL THEN
    RAISE NOTICE 'portfolio_id_columns: public.portfolios is absent — skipping';
    RETURN;
  END IF;

  -- portfolio_visits -------------------------------------------------------
  IF to_regclass('public.portfolio_visits') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.portfolio_visits ADD COLUMN IF NOT EXISTS portfolio_id uuid';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='portfolio_visits' AND column_name='username'
    ) THEN
      EXECUTE $sql$
        UPDATE public.portfolio_visits v
        SET portfolio_id = p.id
        FROM public.portfolios p
        WHERE v.portfolio_id IS NULL AND p.username = v.username
      $sql$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'portfolio_visits_portfolio_id_fkey'
        AND conrelid = 'public.portfolio_visits'::regclass
    ) THEN
      EXECUTE 'ALTER TABLE public.portfolio_visits
        ADD CONSTRAINT portfolio_visits_portfolio_id_fkey
        FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portfolio_visits_portfolio_visited
      ON public.portfolio_visits (portfolio_id, visited_at DESC)';
  END IF;

  -- portfolio_interactions -------------------------------------------------
  IF to_regclass('public.portfolio_interactions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.portfolio_interactions ADD COLUMN IF NOT EXISTS portfolio_id uuid';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='portfolio_interactions' AND column_name='portfolio_username'
    ) THEN
      EXECUTE $sql$
        UPDATE public.portfolio_interactions i
        SET portfolio_id = p.id
        FROM public.portfolios p
        WHERE i.portfolio_id IS NULL AND p.username = i.portfolio_username
      $sql$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'portfolio_interactions_portfolio_id_fkey'
        AND conrelid = 'public.portfolio_interactions'::regclass
    ) THEN
      EXECUTE 'ALTER TABLE public.portfolio_interactions
        ADD CONSTRAINT portfolio_interactions_portfolio_id_fkey
        FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_portfolio_interactions_portfolio_id
      ON public.portfolio_interactions (portfolio_id)';
  END IF;

  -- short_links (canonical production short-link store) -------------------
  -- NOTE: production uses `public.short_links` (created by 20260219095357
  -- and extended by 20260222073214 with `target_url`). It owns the
  -- `portfolio_username`, `label`, `click_count`, `target_url` columns. An
  -- unrelated `portfolio_short_links` table exists in some dev databases
  -- but is NOT the canonical short-link store — do not target it here.
  IF to_regclass('public.short_links') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS portfolio_id uuid';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='short_links' AND column_name='portfolio_username'
    ) THEN
      EXECUTE $sql$
        UPDATE public.short_links s
        SET portfolio_id = p.id
        FROM public.portfolios p
        WHERE s.portfolio_id IS NULL AND p.username = s.portfolio_username
      $sql$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'short_links_portfolio_id_fkey'
        AND conrelid = 'public.short_links'::regclass
    ) THEN
      EXECUTE 'ALTER TABLE public.short_links
        ADD CONSTRAINT short_links_portfolio_id_fkey
        FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_short_links_portfolio_id
      ON public.short_links (portfolio_id)';
  END IF;
END $$;

-- =========================================================================
-- DEFERRED to a follow-up migration after the application has been cut over
-- to read/write portfolio_id (Phase 3, Step 8 + 9 of the plan):
--   • ALTER COLUMN portfolio_id SET NOT NULL on each table
--   • DROP the legacy username/portfolio_username FK + column
--   • Re-author idx_* indexes that reference the dropped column
-- Do NOT do this in the same release — the cutover needs at least one deploy
-- of the consumer code first.
-- =========================================================================
