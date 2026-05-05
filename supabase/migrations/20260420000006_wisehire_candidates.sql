-- WiseHire Phase 1 — Migration 6: wisehire_candidates
-- Candidates being evaluated by an HR user. Linked to a role.
-- resume_pdf_path stores the Supabase Storage path in the candidate-resumes bucket.
-- resume_text stores parsed text from the parse-resume edge function.
-- Soft-deleted (is_deleted = true) — hard deleted only after 30-day post-cancellation window.

CREATE TABLE IF NOT EXISTS public.wisehire_candidates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id          UUID REFERENCES public.wisehire_roles(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  resume_pdf_path  TEXT,
  resume_text      TEXT,
  pipeline_stage   TEXT NOT NULL DEFAULT 'shortlisted'
                   CHECK (pipeline_stage IN (
                     'shortlisted', 'contacted', 'interviewing',
                     'offer_sent', 'hired', 'rejected'
                   )),
  notes            TEXT,
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wisehire_candidates_owner_idx
  ON public.wisehire_candidates (owner_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS wisehire_candidates_role_idx
  ON public.wisehire_candidates (role_id)
  WHERE is_deleted = false;

ALTER TABLE public.wisehire_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR user owns their candidates" ON public.wisehire_candidates;
CREATE POLICY "HR user owns their candidates"
  ON public.wisehire_candidates
  FOR ALL
  USING (owner_id = auth.uid() AND is_deleted = false)
  WITH CHECK (owner_id = auth.uid());
