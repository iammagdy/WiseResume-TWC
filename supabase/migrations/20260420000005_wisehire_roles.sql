-- WiseHire Phase 1 — Migration 5: wisehire_roles
-- Open positions created by HR users. Each role has a title, optional JD text,
-- open/closed status, and soft-delete flag.

CREATE TABLE IF NOT EXISTS public.wisehire_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES public.wisehire_companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  jd_text      TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  is_deleted   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wisehire_roles_owner_idx
  ON public.wisehire_roles (owner_id)
  WHERE is_deleted = false;

ALTER TABLE public.wisehire_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR user owns their roles"
  ON public.wisehire_roles
  FOR ALL
  USING (owner_id = auth.uid() AND is_deleted = false)
  WITH CHECK (owner_id = auth.uid());
