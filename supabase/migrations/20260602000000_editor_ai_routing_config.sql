-- Task #40: Register the consolidated editor-ai router in ai_routing_config.
--
-- Adds a single row for 'editor-ai' with provider 'auto' so all 4 actions
-- (analyze, recruiter-sim, suggest-template, optimize-for-linkedin) inherit
-- the same routing rule. Individual rows for the 4 legacy functions are
-- retained for now — Phase 3 will remove them once those functions are
-- retired. ON CONFLICT DO NOTHING makes this migration idempotent.

INSERT INTO ai_routing_config (feature_name, provider, model, updated_by)
VALUES ('editor-ai', 'auto', '', 'system')
ON CONFLICT (feature_name) DO NOTHING;
