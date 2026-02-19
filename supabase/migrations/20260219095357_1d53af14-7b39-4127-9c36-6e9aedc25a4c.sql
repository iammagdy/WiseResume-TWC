
-- ── short_links table ──────────────────────────────────────────────────────
CREATE TABLE public.short_links (
  id            text        PRIMARY KEY,          -- 5-char slug, e.g. "xK9mR"
  owner_user_id uuid        NOT NULL,
  portfolio_username text   NOT NULL,
  label         text        NOT NULL DEFAULT 'My Link',
  click_count   integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their links
CREATE POLICY "Owners can manage own short links"
  ON public.short_links FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- ── portfolio_visits table ────────────────────────────────────────────────
CREATE TABLE public.portfolio_visits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username            text        NOT NULL,
  short_link_id       text        REFERENCES public.short_links(id) ON DELETE SET NULL,
  country             text,
  city                text,
  time_spent_seconds  integer,
  sections_viewed     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  referrer            text,
  visited_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT a visit (public portfolio tracking)
CREATE POLICY "Anyone can record portfolio visit"
  ON public.portfolio_visits FOR INSERT
  WITH CHECK (true);

-- Owner can view visits for their own portfolio username (via security definer)
CREATE POLICY "Portfolio owner can view own visits"
  ON public.portfolio_visits FOR SELECT
  USING (
    username IN (
      SELECT p.username FROM public.profiles p WHERE p.user_id = auth.uid() AND p.username IS NOT NULL
    )
  );

-- ── SECURITY DEFINER: resolve a short link by id (public, no auth needed) ──
CREATE OR REPLACE FUNCTION public.resolve_short_link(p_link_id text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT id, portfolio_username, label INTO v_link
  FROM public.short_links
  WHERE id = p_link_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'username', v_link.portfolio_username,
    'label',    v_link.label
  );
END;
$$;

-- ── SECURITY DEFINER: get visit analytics for portfolio owner ─────────────
CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(p_username text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_visits  jsonb;
  v_summary jsonb;
BEGIN
  -- Verify requester owns this username
  SELECT user_id INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username) AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Recent 50 visits
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 pv.id,
      'country',            pv.country,
      'city',               pv.city,
      'time_spent_seconds', pv.time_spent_seconds,
      'sections_viewed',    pv.sections_viewed,
      'referrer',           pv.referrer,
      'short_link_id',      pv.short_link_id,
      'visited_at',         pv.visited_at
    ) ORDER BY pv.visited_at DESC
  ), '[]'::jsonb)
  INTO v_visits
  FROM public.portfolio_visits pv
  WHERE pv.username = lower(p_username)
  LIMIT 50;

  -- Summary stats
  SELECT jsonb_build_object(
    'total_visits',      count(*),
    'unique_countries',  count(DISTINCT country) FILTER (WHERE country IS NOT NULL),
    'avg_time_seconds',  round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL))::int
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
