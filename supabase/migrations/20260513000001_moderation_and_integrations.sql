-- Moderation & Integrations tables for DevKit Task #6.

-- ── BLOCKLIST ──────────────────────────────────────────────────────────────
-- Stores blocked emails, user UUIDs, or text patterns.
-- Blocked users are rejected in token-exchange with ACCOUNT_SUSPENDED.
CREATE TABLE IF NOT EXISTS public.blocklist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL CHECK (type IN ('email', 'user_id', 'pattern')),
  value       TEXT        NOT NULL,
  reason      TEXT,
  added_by    TEXT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocklist_type_value
  ON public.blocklist (type, value);

ALTER TABLE public.blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_public_access" ON public.blocklist
  AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);

-- ── MODERATION QUEUE ───────────────────────────────────────────────────────
-- Stores content items flagged by users or the AI safety pipeline.
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type     TEXT        NOT NULL,
  content_id       UUID,
  snippet          TEXT,
  reporter_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'removed')),
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created
  ON public.moderation_queue (status, created_at DESC);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_public_access" ON public.moderation_queue
  AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);

-- ── KINDE EVENTS ──────────────────────────────────────────────────────────
-- Records every Kinde webhook event received by the kinde-webhook function.
CREATE TABLE IF NOT EXISTS public.kinde_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT        NOT NULL,
  kinde_user_id    TEXT,
  email            TEXT,
  payload          JSONB,
  provisioning_ok  BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kinde_events_created
  ON public.kinde_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kinde_events_type
  ON public.kinde_events (event_type, created_at DESC);

ALTER TABLE public.kinde_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_public_access" ON public.kinde_events
  AS RESTRICTIVE FOR ALL TO public
  USING (false) WITH CHECK (false);

-- ── BUG REPORTS: add private_note column ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bug_reports'
      AND column_name  = 'private_note'
  ) THEN
    ALTER TABLE public.bug_reports ADD COLUMN private_note TEXT DEFAULT NULL;
  END IF;
END;
$$;
