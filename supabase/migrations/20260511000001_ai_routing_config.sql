-- AI per-feature routing config + plan-level spend caps
-- Used by admin-ai-routing and admin-ai-caps edge functions.
-- creditUtils.ts reads daily_cap_<plan> from app_settings at request time.

CREATE TABLE IF NOT EXISTS public.ai_routing_config (
  feature_name         TEXT    PRIMARY KEY,
  provider             TEXT    NOT NULL DEFAULT 'auto',
  model                TEXT    NOT NULL DEFAULT '',
  ab_secondary_provider TEXT   DEFAULT NULL,
  ab_secondary_model   TEXT    NOT NULL DEFAULT '',
  ab_split_pct         INTEGER NOT NULL DEFAULT 0
                                        CHECK (ab_split_pct >= 0 AND ab_split_pct <= 100),
  updated_by           TEXT    DEFAULT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_routing_config ENABLE ROW LEVEL SECURITY;

-- Seed the 6 AI features that use callAI/callAIWithRetry (idempotent).
-- score-resume is excluded — it is fully deterministic and does not call any LLM,
-- so routing config has no effect on it.
INSERT INTO public.ai_routing_config (feature_name) VALUES
  ('tailor-resume'),
  ('enhance-section'),
  ('analyze-resume'),
  ('generate-cover-letter'),
  ('agentic-chat'),
  ('wise-ai-chat')
ON CONFLICT (feature_name) DO NOTHING;

-- Plan-level spend caps are stored as k/v pairs in the existing app_settings table:
--   daily_cap_free   TEXT  (null = use per-plan default)
--   daily_cap_trial  TEXT
--   daily_cap_pro    TEXT
-- No schema change needed — app_settings already exists.
