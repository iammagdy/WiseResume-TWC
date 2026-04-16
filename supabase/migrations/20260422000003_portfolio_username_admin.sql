-- ============================================================
-- Task #3 — Portfolio Usernames admin panel
-- Adds four tables + upgrades check_username_available RPC to
-- return a typed status (available|taken|reserved|exclusive).
-- ============================================================

-- ---------- portfolio_username_rules (singleton global rules) ----------
CREATE TABLE IF NOT EXISTS public.portfolio_username_rules (
  id            INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_length    INT         NOT NULL DEFAULT 3 CHECK (min_length >= 1 AND min_length <= 100),
  max_length    INT         NOT NULL DEFAULT 30 CHECK (max_length >= 1 AND max_length <= 100),
  allow_hyphens BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT pur_length_order CHECK (min_length <= max_length)
);

INSERT INTO public.portfolio_username_rules (id, min_length, max_length, allow_hyphens)
VALUES (1, 3, 30, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.portfolio_username_rules ENABLE ROW LEVEL SECURITY;

-- Global rules are readable by anyone authenticated (so clients can validate).
DROP POLICY IF EXISTS "authenticated_read_username_rules" ON public.portfolio_username_rules;
CREATE POLICY "authenticated_read_username_rules"
  ON public.portfolio_username_rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_write_username_rules" ON public.portfolio_username_rules;
CREATE POLICY "service_role_write_username_rules"
  ON public.portfolio_username_rules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------- portfolio_reserved_usernames (blocklist) ----------
CREATE TABLE IF NOT EXISTS public.portfolio_reserved_usernames (
  username    TEXT        PRIMARY KEY,
  reason      TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.portfolio_reserved_usernames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_reserved_usernames" ON public.portfolio_reserved_usernames;
CREATE POLICY "authenticated_read_reserved_usernames"
  ON public.portfolio_reserved_usernames FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_write_reserved_usernames" ON public.portfolio_reserved_usernames;
CREATE POLICY "service_role_write_reserved_usernames"
  ON public.portfolio_reserved_usernames FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------- portfolio_exclusive_assignments (per-user username reservation) ----------
CREATE TABLE IF NOT EXISTS public.portfolio_exclusive_assignments (
  username    TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_exclusive_user_id
  ON public.portfolio_exclusive_assignments (user_id);

ALTER TABLE public.portfolio_exclusive_assignments ENABLE ROW LEVEL SECURITY;

-- Readable by any authenticated user (the RPC needs to evaluate it for everyone).
DROP POLICY IF EXISTS "authenticated_read_exclusive_assignments" ON public.portfolio_exclusive_assignments;
CREATE POLICY "authenticated_read_exclusive_assignments"
  ON public.portfolio_exclusive_assignments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_write_exclusive_assignments" ON public.portfolio_exclusive_assignments;
CREATE POLICY "service_role_write_exclusive_assignments"
  ON public.portfolio_exclusive_assignments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------- portfolio_user_overrides (per-user rule exceptions) ----------
CREATE TABLE IF NOT EXISTS public.portfolio_user_overrides (
  user_id       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  min_length    INT         CHECK (min_length IS NULL OR (min_length >= 1 AND min_length <= 100)),
  max_length    INT         CHECK (max_length IS NULL OR (max_length >= 1 AND max_length <= 100)),
  allow_hyphens BOOLEAN,
  note          TEXT        NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.portfolio_user_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_own_override" ON public.portfolio_user_overrides;
CREATE POLICY "authenticated_read_own_override"
  ON public.portfolio_user_overrides FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_role_write_user_overrides" ON public.portfolio_user_overrides;
CREATE POLICY "service_role_write_user_overrides"
  ON public.portfolio_user_overrides FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Updated check_username_available RPC.
--
-- Return shape (JSONB):
--   { status: 'available' | 'taken' | 'reserved' | 'exclusive' | 'invalid',
--     reason?: string }
--
-- Back-compat: existing callers that used `data === true` will still work
-- because the old boolean function is DROPped first and replaced with a
-- jsonb-returning function. Callers must inspect `.status === 'available'`.
-- ============================================================

DROP FUNCTION IF EXISTS public.check_username_available(text, uuid);

CREATE OR REPLACE FUNCTION public.check_username_available(
  p_username text,
  p_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clean       text;
  v_min_len     int;
  v_max_len     int;
  v_allow_hyp   boolean;
  v_exclusive   record;
  v_taken       boolean;
  v_reason      text;
BEGIN
  v_clean := lower(coalesce(p_username, ''));

  IF v_clean = '' THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'empty');
  END IF;

  -- Resolve effective rules (global + per-user override)
  SELECT min_length, max_length, allow_hyphens
    INTO v_min_len, v_max_len, v_allow_hyp
    FROM public.portfolio_username_rules
    WHERE id = 1;

  -- Defaults if the rules row is missing
  v_min_len   := coalesce(v_min_len, 3);
  v_max_len   := coalesce(v_max_len, 30);
  v_allow_hyp := coalesce(v_allow_hyp, true);

  IF p_user_id IS NOT NULL THEN
    SELECT
      coalesce(o.min_length,    v_min_len),
      coalesce(o.max_length,    v_max_len),
      coalesce(o.allow_hyphens, v_allow_hyp)
    INTO v_min_len, v_max_len, v_allow_hyp
    FROM public.portfolio_user_overrides o
    WHERE o.user_id = p_user_id;
    -- If no override row, values stay as the globals resolved above.
    -- (SELECT with no row leaves variables unchanged.)
  END IF;

  -- Validation
  IF length(v_clean) < v_min_len THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'too_short');
  END IF;
  IF length(v_clean) > v_max_len THEN
    RETURN jsonb_build_object('status', 'invalid', 'reason', 'too_long');
  END IF;
  IF v_allow_hyp THEN
    IF v_clean !~ '^[a-z0-9-]+$' THEN
      RETURN jsonb_build_object('status', 'invalid', 'reason', 'bad_chars');
    END IF;
    IF v_clean LIKE '-%' OR v_clean LIKE '%-' THEN
      RETURN jsonb_build_object('status', 'invalid', 'reason', 'edge_hyphen');
    END IF;
  ELSE
    IF v_clean !~ '^[a-z0-9]+$' THEN
      RETURN jsonb_build_object('status', 'invalid', 'reason', 'bad_chars');
    END IF;
  END IF;

  -- Exclusive assignment: taken for everyone except the assigned user
  SELECT * INTO v_exclusive
    FROM public.portfolio_exclusive_assignments
    WHERE username = v_clean;
  IF FOUND THEN
    IF p_user_id IS NOT NULL AND v_exclusive.user_id = p_user_id THEN
      -- reserved for this user: treat as available unless someone else already claimed it
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE username = v_clean AND user_id IS DISTINCT FROM p_user_id
      ) INTO v_taken;
      IF v_taken THEN
        RETURN jsonb_build_object('status', 'taken');
      END IF;
      RETURN jsonb_build_object('status', 'available', 'reason', 'exclusive_self');
    ELSE
      RETURN jsonb_build_object('status', 'exclusive');
    END IF;
  END IF;

  -- Reserved blocklist
  SELECT reason INTO v_reason
    FROM public.portfolio_reserved_usernames
    WHERE username = v_clean;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'reserved', 'reason', coalesce(v_reason, ''));
  END IF;

  -- Already claimed by another profile
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = v_clean
      AND (p_user_id IS NULL OR user_id IS DISTINCT FROM p_user_id)
  ) INTO v_taken;
  IF v_taken THEN
    RETURN jsonb_build_object('status', 'taken');
  END IF;

  RETURN jsonb_build_object('status', 'available');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(text, uuid) TO anon, authenticated, service_role;

-- Helpful index for the reserved lookup (PK already covers it, kept for explicitness)
CREATE INDEX IF NOT EXISTS idx_portfolio_reserved_username
  ON public.portfolio_reserved_usernames (username);

COMMENT ON FUNCTION public.check_username_available(text, uuid) IS
  'Returns jsonb { status, reason? } where status is one of: available|taken|reserved|exclusive|invalid';
