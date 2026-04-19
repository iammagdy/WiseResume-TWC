-- =========================================================================
-- Drop legacy portfolio_username / username text columns from the three
-- analytics tables now that ALL application code has been cut over to
-- the stable `portfolio_id uuid` FK (Phase 3, Steps 8-9 of the plan).
--
-- PRECONDITIONS — verify before applying:
--   1. The consumer code (useShortLinks, useCreateShortLink) has been
--      deployed and serving portfolio_id reads/writes for at least one
--      production release (i.e. 20260418195803 + this repo's code is live).
--   2. All rows in portfolio_visits, portfolio_interactions, and short_links
--      that should be retained have a non-null portfolio_id.  Run the
--      verification queries below before applying.
--
-- VERIFICATION QUERIES (run in Supabase SQL editor before applying):
--
--   SELECT COUNT(*) FROM public.portfolio_visits    WHERE portfolio_id IS NULL;
--   SELECT COUNT(*) FROM public.portfolio_interactions WHERE portfolio_id IS NULL;
--   SELECT COUNT(*) FROM public.short_links          WHERE portfolio_id IS NULL AND portfolio_username IS NOT NULL;
--
-- All three should return 0 (or only rows that are acceptable orphans).
--
-- =========================================================================

-- ── 1. portfolio_visits: make portfolio_id NOT NULL, drop legacy username ──

ALTER TABLE public.portfolio_visits
  ALTER COLUMN portfolio_id SET NOT NULL;

ALTER TABLE public.portfolio_visits
  DROP CONSTRAINT IF EXISTS portfolio_visits_username_portfolios_username_fk;

ALTER TABLE public.portfolio_visits
  DROP COLUMN IF EXISTS username;

-- ── 2. portfolio_interactions: make portfolio_id NOT NULL, drop legacy ──────

ALTER TABLE public.portfolio_interactions
  ALTER COLUMN portfolio_id SET NOT NULL;

ALTER TABLE public.portfolio_interactions
  DROP CONSTRAINT IF EXISTS portfolio_interactions_portfolio_username_portfolios_username_fk;

ALTER TABLE public.portfolio_interactions
  DROP COLUMN IF EXISTS portfolio_username;

-- ── 3. short_links: make portfolio_id NOT NULL where portfolio-linked, ───────
--      drop legacy portfolio_username column
--
-- NOTE: short_links.portfolio_username may be NULL for universal (non-portfolio)
-- links. We only enforce NOT NULL on rows that are portfolio-linked; there is
-- no blanket NOT NULL here. The column is simply dropped.

ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_fkey;

ALTER TABLE public.short_links
  DROP CONSTRAINT IF EXISTS short_links_portfolio_username_portfolios_username_fk;

ALTER TABLE public.short_links
  DROP COLUMN IF EXISTS portfolio_username;

-- =========================================================================
-- Post-drop: the indexes added by 20260418195801 (idx_portfolio_visits_portfolio_visited,
-- idx_portfolio_interactions_portfolio_id, idx_short_links_portfolio_id) are
-- still valid and cover the remaining access patterns — no index changes
-- needed here.
-- =========================================================================
