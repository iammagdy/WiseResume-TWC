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
-- =========================================================================

-- portfolio_visits ---------------------------------------------------------
ALTER TABLE public.portfolio_visits
  ADD COLUMN IF NOT EXISTS portfolio_id uuid;

UPDATE public.portfolio_visits v
SET portfolio_id = p.id
FROM public.portfolios p
WHERE v.portfolio_id IS NULL
  AND p.username = v.username;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_visits_portfolio_id_fkey'
      AND conrelid = 'public.portfolio_visits'::regclass
  ) THEN
    ALTER TABLE public.portfolio_visits
      ADD CONSTRAINT portfolio_visits_portfolio_id_fkey
      FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portfolio_visits_portfolio_visited
  ON public.portfolio_visits (portfolio_id, visited_at DESC);

-- portfolio_interactions ---------------------------------------------------
ALTER TABLE public.portfolio_interactions
  ADD COLUMN IF NOT EXISTS portfolio_id uuid;

UPDATE public.portfolio_interactions i
SET portfolio_id = p.id
FROM public.portfolios p
WHERE i.portfolio_id IS NULL
  AND p.username = i.portfolio_username;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_interactions_portfolio_id_fkey'
      AND conrelid = 'public.portfolio_interactions'::regclass
  ) THEN
    ALTER TABLE public.portfolio_interactions
      ADD CONSTRAINT portfolio_interactions_portfolio_id_fkey
      FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portfolio_interactions_portfolio_id
  ON public.portfolio_interactions (portfolio_id);

-- portfolio_short_links ----------------------------------------------------
ALTER TABLE public.portfolio_short_links
  ADD COLUMN IF NOT EXISTS portfolio_id uuid;

UPDATE public.portfolio_short_links s
SET portfolio_id = p.id
FROM public.portfolios p
WHERE s.portfolio_id IS NULL
  AND p.username = s.portfolio_username;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_short_links_portfolio_id_fkey'
      AND conrelid = 'public.portfolio_short_links'::regclass
  ) THEN
    ALTER TABLE public.portfolio_short_links
      ADD CONSTRAINT portfolio_short_links_portfolio_id_fkey
      FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portfolio_short_links_portfolio_id
  ON public.portfolio_short_links (portfolio_id);

-- =========================================================================
-- DEFERRED to a follow-up migration after the application has been cut over
-- to read/write portfolio_id (Phase 3, Step 8 + 9 of the plan):
--   • ALTER COLUMN portfolio_id SET NOT NULL on each table
--   • DROP the legacy username/portfolio_username FK + column
--   • Re-author idx_* indexes that reference the dropped column
-- Do NOT do this in the same release — the cutover needs at least one deploy
-- of the consumer code first.
-- =========================================================================
