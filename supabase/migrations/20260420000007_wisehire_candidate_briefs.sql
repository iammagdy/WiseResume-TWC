-- WiseHire Phase 1 — Migration 7: wisehire_candidate_briefs
-- AI-generated candidate assessments. Each brief belongs to one candidate.
-- share_token is a UUID used for public read-only share links.
-- share_token_active = false means the link is revoked.

CREATE TABLE IF NOT EXISTS public.wisehire_candidate_briefs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id        UUID NOT NULL REFERENCES public.wisehire_candidates(id) ON DELETE CASCADE,
  role_id             UUID REFERENCES public.wisehire_roles(id) ON DELETE SET NULL,
  match_score         INTEGER CHECK (match_score BETWEEN 0 AND 100),
  strengths           TEXT[],
  concerns            TEXT[],
  interview_questions TEXT[],
  employment_notes    TEXT,
  ai_model_used       TEXT,
  is_byok             BOOLEAN NOT NULL DEFAULT false,
  share_token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  share_token_active  BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wisehire_briefs_owner_idx
  ON public.wisehire_candidate_briefs (owner_id);

CREATE INDEX IF NOT EXISTS wisehire_briefs_candidate_idx
  ON public.wisehire_candidate_briefs (candidate_id);

CREATE INDEX IF NOT EXISTS wisehire_briefs_token_idx
  ON public.wisehire_candidate_briefs (share_token)
  WHERE share_token_active = true;

ALTER TABLE public.wisehire_candidate_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR user owns their briefs" ON public.wisehire_candidate_briefs;
CREATE POLICY "HR user owns their briefs"
  ON public.wisehire_candidate_briefs
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
