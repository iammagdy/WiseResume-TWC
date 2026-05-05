-- Premium handles marketplace — Task #14.
-- Admins can mark usernames as premium (with a price) and manually assign them
-- to users after an offline payment is confirmed.

CREATE TABLE IF NOT EXISTS public.portfolio_premium_usernames (
  username            TEXT        PRIMARY KEY,
  price_cents         INTEGER     NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency            TEXT        NOT NULL DEFAULT 'usd',
  status              TEXT        NOT NULL DEFAULT 'available'
                                  CHECK (status IN ('available', 'pending', 'assigned')),
  assigned_to_user_id UUID        REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppu_status
  ON public.portfolio_premium_usernames (status);

CREATE INDEX IF NOT EXISTS idx_ppu_assigned_user
  ON public.portfolio_premium_usernames (assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;

-- Only service-role (admin edge functions) can read/write this table.
-- Regular authenticated users get a read-only view of available listings only.
ALTER TABLE public.portfolio_premium_usernames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_public_write" ON public.portfolio_premium_usernames;
CREATE POLICY "deny_public_write" ON public.portfolio_premium_usernames
  FOR ALL USING (false);

DROP POLICY IF EXISTS "authenticated_read_available" ON public.portfolio_premium_usernames;
CREATE POLICY "authenticated_read_available" ON public.portfolio_premium_usernames
  FOR SELECT
  USING (status = 'available');
