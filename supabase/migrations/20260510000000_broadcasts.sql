-- ============================================================
-- Broadcasts System — Migration
-- Adds: broadcasts table for in-app announcement banners
--       managed by the admin via DevKit Owner Ops panel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  severity     TEXT        NOT NULL DEFAULT 'info'
                           CHECK (severity IN ('info', 'warning', 'critical')),
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS broadcasts_active_idx    ON public.broadcasts (active);
CREATE INDEX IF NOT EXISTS broadcasts_created_at_idx ON public.broadcasts (created_at DESC);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active, non-expired broadcasts
CREATE POLICY "authenticated_read_active_broadcasts" ON public.broadcasts
  FOR SELECT TO authenticated
  USING (
    active = TRUE
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Anon users can also read (for pre-auth pages / loading states)
CREATE POLICY "anon_read_active_broadcasts" ON public.broadcasts
  FOR SELECT TO anon
  USING (
    active = TRUE
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Service role has full write access (edge functions use service role)
CREATE POLICY "service_role_broadcasts_all" ON public.broadcasts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
