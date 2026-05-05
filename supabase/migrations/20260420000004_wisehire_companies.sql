-- WiseHire Phase 1 — Migration 4: wisehire_companies
-- One company record per HR account (owner_id = profiles.id).
-- Stores company identity and onboarding context collected during WiseHire onboarding.

CREATE TABLE IF NOT EXISTS public.wisehire_companies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  size                 TEXT NOT NULL CHECK (size IN ('1-10', '11-50', '51-200', '200+')),
  role_types           TEXT[],
  monthly_volume       TEXT CHECK (monthly_volume IN ('1-5', '6-20', '21-50', '50+')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wisehire_companies_owner_idx
  ON public.wisehire_companies (owner_id);

ALTER TABLE public.wisehire_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR user owns their company" ON public.wisehire_companies;
CREATE POLICY "HR user owns their company"
  ON public.wisehire_companies
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
