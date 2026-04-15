-- WiseHire Phase 1 — Migration 2: wisehire_waitlist
-- Stores pre-launch waitlist submissions. Admin-only access via service role key.
-- No user-facing RLS policies — accessed only from admin edge functions.

CREATE TABLE IF NOT EXISTS public.wisehire_waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  company_size  TEXT NOT NULL CHECK (company_size IN ('1-10', '11-50', '51-200', '200+')),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at    TIMESTAMPTZ,
  notes         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS wisehire_waitlist_email_idx
  ON public.wisehire_waitlist (email);

ALTER TABLE public.wisehire_waitlist ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies. Service role key bypasses RLS for admin functions.
