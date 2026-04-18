-- =============================================================================
-- Expired trial resume cleanup
-- =============================================================================
-- Adds `purge_expired_trial_resumes(p_batch_size)`:
--   Deletes ONE batch (≤ p_batch_size rows) of trial resumes whose
--   `trial_expires_at` is older than 3 days (matching the 3-day grace window
--   the client-side `useResumes` hook applies).  Returns the count deleted.
--
-- Called by the Express analytics sweeper (server/index.ts) on its daily
-- run, so expired trials are removed automatically without manual DBA work.
--
-- The partial index `idx_resumes_trial_expires` (created in migration
-- 20260418000002) is used by the inner SELECT to keep the delete efficient
-- even as the `resumes` table grows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.purge_expired_trial_resumes(
  p_batch_size INTEGER DEFAULT 500
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BIGINT := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'batch size must be between 1 and 10000 (got %)', p_batch_size;
  END IF;

  WITH victims AS (
    SELECT id
    FROM public.resumes
    WHERE is_trial = TRUE
      AND trial_expires_at < now() - INTERVAL '3 days'
    ORDER BY trial_expires_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.resumes r
  USING victims
  WHERE r.id = victims.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_trial_resumes(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_trial_resumes(INTEGER)
  TO service_role;
DO $grant$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.purge_expired_trial_resumes(INTEGER) TO postgres';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;
DO $grant$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.purge_expired_trial_resumes(INTEGER) TO neon_superuser';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;

COMMENT ON FUNCTION public.purge_expired_trial_resumes(INTEGER) IS
  'Deletes one batch (<= p_batch_size) of trial resumes whose trial_expires_at
   is older than 3 days (the client-side grace window).  Returns rows deleted.
   Called daily by the Express analytics sweeper.';
