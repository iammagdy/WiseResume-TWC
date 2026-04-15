-- WiseHire Phase 1 — Migration 1: Add account_type to profiles
-- Splits WiseResume (job_seeker) and WiseHire (hr) users permanently.
-- All existing users default to 'job_seeker'. Value is set at sign-up and immutable.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'job_seeker'
  CHECK (account_type IN ('job_seeker', 'hr'));
