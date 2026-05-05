-- WiseHire: wisehire_mask_sessions
-- Persists CV masking results so recruiters can revisit anonymised CVs
-- across browser sessions and devices.
-- owner_id references auth.users(id) directly so auth.uid() can be used
-- end-to-end (insert, RLS) without requiring a profiles.id sub-lookup.

CREATE TABLE IF NOT EXISTS public.wisehire_mask_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  results    JSONB       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS wisehire_mask_sessions_owner_created_idx
  ON public.wisehire_mask_sessions (owner_id, created_at DESC);

ALTER TABLE public.wisehire_mask_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR user owns their mask sessions" ON public.wisehire_mask_sessions;
CREATE POLICY "HR user owns their mask sessions"
  ON public.wisehire_mask_sessions
  FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
