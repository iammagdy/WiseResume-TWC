-- Task #41: Retire the 4 legacy Editor AI edge functions.
-- Remove their individual ai_routing_config rows now that all traffic
-- routes through the `editor-ai` consolidated router (Task #40).
--
-- Rollback: re-insert rows manually or revert this migration.
-- The `editor-ai` row itself is NOT touched by this migration.

DELETE FROM ai_routing_config
WHERE feature_name IN (
  'analyze-resume',
  'recruiter-simulation',
  'suggest-template',
  'optimize-for-linkedin'
);
