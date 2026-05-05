-- ============================================================
-- Feature Flags System — Migration
-- Adds: feature_flags table with per-plan, per-user,
--       percentage-rollout, and kill-switch support
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL UNIQUE,
  description          TEXT        NOT NULL DEFAULT '',
  enabled_globally     BOOLEAN     NOT NULL DEFAULT FALSE,
  enabled_plans        TEXT[]      NOT NULL DEFAULT '{}',
  enabled_user_ids     UUID[]      NOT NULL DEFAULT '{}',
  percentage_rollout   INTEGER     NOT NULL DEFAULT 0 CHECK (percentage_rollout >= 0 AND percentage_rollout <= 100),
  kill_switch_function TEXT        NULL,
  updated_by           TEXT        NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_flags_name_idx ON public.feature_flags (name);
CREATE INDEX IF NOT EXISTS feature_flags_updated_at_idx ON public.feature_flags (updated_at DESC);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_feature_flags" ON public.feature_flags;
CREATE POLICY "service_role_feature_flags" ON public.feature_flags
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed the existing feature flags that were previously stored in app_settings
INSERT INTO public.feature_flags (name, description, enabled_globally) VALUES
  ('cover_letters',    'Enable cover letter generation feature',    TRUE),
  ('applications',     'Enable job application tracking',           TRUE),
  ('ai_studio',        'Enable AI studio tools',                    TRUE),
  ('portfolio',        'Enable public portfolio pages',             TRUE),
  ('interview_coach',  'Enable interview preparation tools',        TRUE),
  ('career_advisor',   'Enable career path advisory tools',         TRUE)
ON CONFLICT (name) DO NOTHING;
