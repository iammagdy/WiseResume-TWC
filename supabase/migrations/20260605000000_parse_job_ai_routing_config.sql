-- Add the `enabled` column to ai_routing_config if it doesn't exist yet.
-- The original table creation (20260511000001) omitted this column; preview
-- branches run all migrations from scratch so this guard is required before
-- the INSERT below references it.
ALTER TABLE public.ai_routing_config
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

INSERT INTO ai_routing_config (feature_name, provider, model, enabled)
VALUES
  ('parse-job-url',  'auto', '', true),
  ('parse-job-text', 'auto', '', true),
  ('parse-linkedin', 'auto', '', true)
ON CONFLICT (feature_name) DO UPDATE SET
  provider = EXCLUDED.provider,
  model    = EXCLUDED.model,
  enabled  = EXCLUDED.enabled;
