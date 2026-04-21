-- Interview session drafts: enable per-turn persistence, mid-session resume,
-- and 24-hour cleanup of abandoned drafts.
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'interview_sessions_status_check'
  ) THEN
    ALTER TABLE public.interview_sessions
      ADD CONSTRAINT interview_sessions_status_check
      CHECK (status IN ('draft', 'completed'));
  END IF;
END$$;

-- Bump updated_at automatically on every UPDATE.
DROP TRIGGER IF EXISTS update_interview_sessions_updated_at ON public.interview_sessions;
CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fast lookup of the user's most recent draft (used on /interview entry).
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_draft
  ON public.interview_sessions (user_id, updated_at DESC)
  WHERE status = 'draft';

-- Cleanup function: removes drafts older than 24h. Safe to call from cron
-- or ad-hoc; SECURITY DEFINER so the cron role can prune across users.
CREATE OR REPLACE FUNCTION public.cleanup_expired_interview_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.interview_sessions
  WHERE status = 'draft'
    AND updated_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_interview_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_interview_drafts() TO service_role;
