-- Task #39 — Phase 1: Add missing Editor AI rows to ai_routing_config.
--
-- The existing migration (20260511000001) seeded 6 rows:
--   tailor-resume, enhance-section, analyze-resume,
--   generate-cover-letter, agentic-chat, wise-ai-chat
--
-- The 8 Editor AI functions identified in Phase 1 are:
--   resume-section-ai, tailor-resume, analyze-resume, recruiter-simulation,
--   suggest-template, optimize-for-linkedin, smart-fit-rewrite, agentic-chat
--
-- This migration adds the 5 missing rows with safe ON CONFLICT DO NOTHING
-- so re-running the migration is always idempotent.

INSERT INTO public.ai_routing_config (feature_name) VALUES
  ('resume-section-ai'),
  ('recruiter-simulation'),
  ('suggest-template'),
  ('optimize-for-linkedin'),
  ('smart-fit-rewrite')
ON CONFLICT (feature_name) DO NOTHING;
