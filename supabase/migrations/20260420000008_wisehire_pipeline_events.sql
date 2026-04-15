-- WiseHire Phase 1 — Migration 8: wisehire_pipeline_events
-- Audit log of every pipeline stage change for a candidate.
-- from_stage is NULL for the initial placement into the pipeline.

CREATE TABLE IF NOT EXISTS public.wisehire_pipeline_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.wisehire_candidates(id) ON DELETE CASCADE,
  from_stage   TEXT,
  to_stage     TEXT NOT NULL,
  moved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS wisehire_pipeline_events_candidate_idx
  ON public.wisehire_pipeline_events (candidate_id);

ALTER TABLE public.wisehire_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR user owns their pipeline events"
  ON public.wisehire_pipeline_events
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
