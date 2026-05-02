-- ============================================================
-- Snapshot resume.title onto cover_letters / career_assessments /
-- interview_sessions so the artifact survives a resume delete with
-- a meaningful label.
--
-- Background (audit item H-6, 2026-05-02 backend audit):
--   These three tables already have ON DELETE SET NULL on resume_id,
--   so deleting a resume orphans the rows with resume_id = NULL and
--   nothing to display. Product decision (Task #22): cover letters,
--   interview transcripts, and career assessments are standalone
--   artifacts the user spent time/credits creating, so we keep them.
--   We snapshot resumes.title at write time onto a new column so the
--   row still has a meaningful "from" label after the resume is gone.
--
-- Snapshot semantics:
--   * INSERT with resume_id set        → snapshot resumes.title
--   * INSERT with resume_id NULL       → leave resume_title alone
--                                        (lets duplicates of an orphan
--                                        carry the original snapshot)
--   * UPDATE that changes resume_id to
--     a new non-null value             → re-snapshot
--   * UPDATE that changes resume_id to
--     NULL (incl. FK SET NULL action)  → keep existing snapshot
--   * UPDATE that doesn't touch
--     resume_id                        → leave snapshot alone
--
-- We deliberately do NOT propagate later renames of the resume into
-- the snapshot — the snapshot represents the resume name *at the time
-- this artifact was created*.
-- ============================================================

-- 1. Add nullable resume_title columns -----------------------------
ALTER TABLE public.cover_letters
  ADD COLUMN IF NOT EXISTS resume_title text;

ALTER TABLE public.career_assessments
  ADD COLUMN IF NOT EXISTS resume_title text;

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS resume_title text;

-- 2. One-time backfill from currently-linked resumes ---------------
UPDATE public.cover_letters c
   SET resume_title = r.title
  FROM public.resumes r
 WHERE c.resume_id = r.id
   AND c.resume_title IS NULL;

UPDATE public.career_assessments a
   SET resume_title = r.title
  FROM public.resumes r
 WHERE a.resume_id = r.id
   AND a.resume_title IS NULL;

UPDATE public.interview_sessions s
   SET resume_title = r.title
  FROM public.resumes r
 WHERE s.resume_id = r.id
   AND s.resume_title IS NULL;

-- 3. Trigger function: snapshot title when resume_id is set --------
-- SECURITY INVOKER: relies on RLS — caller must own the resume they
-- reference. We still pin search_path per the function-hardening
-- convention established in 20260502000000.
CREATE OR REPLACE FUNCTION public.snapshot_resume_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only snapshot when a resume is being linked. If resume_id is
    -- NULL, preserve whatever the caller passed (including a snapshot
    -- carried over from a duplicated orphan row).
    IF NEW.resume_id IS NOT NULL THEN
      SELECT title INTO NEW.resume_title
        FROM public.resumes
       WHERE id = NEW.resume_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.resume_id IS DISTINCT FROM OLD.resume_id
     AND NEW.resume_id IS NOT NULL THEN
    -- Re-link to a different resume → re-snapshot.
    SELECT title INTO NEW.resume_title
      FROM public.resumes
     WHERE id = NEW.resume_id;
  ELSIF NEW.resume_id IS NULL AND OLD.resume_id IS NOT NULL THEN
    -- Resume was unlinked (manual update or FK SET NULL action).
    -- Preserve the existing snapshot so the row still has a label.
    NEW.resume_title := OLD.resume_title;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Wire the trigger up to all three tables -----------------------
DROP TRIGGER IF EXISTS trg_snapshot_resume_title
  ON public.cover_letters;
CREATE TRIGGER trg_snapshot_resume_title
  BEFORE INSERT OR UPDATE OF resume_id
  ON public.cover_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_resume_title();

DROP TRIGGER IF EXISTS trg_snapshot_resume_title
  ON public.career_assessments;
CREATE TRIGGER trg_snapshot_resume_title
  BEFORE INSERT OR UPDATE OF resume_id
  ON public.career_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_resume_title();

DROP TRIGGER IF EXISTS trg_snapshot_resume_title
  ON public.interview_sessions;
CREATE TRIGGER trg_snapshot_resume_title
  BEFORE INSERT OR UPDATE OF resume_id
  ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_resume_title();

COMMENT ON COLUMN public.cover_letters.resume_title IS
  'Snapshot of resumes.title at the time this cover letter was generated. '
  'Survives the source resume being deleted (FK is ON DELETE SET NULL). '
  'Maintained by the snapshot_resume_title() trigger; not refreshed on rename.';
COMMENT ON COLUMN public.career_assessments.resume_title IS
  'Snapshot of resumes.title at the time this assessment was generated. '
  'Survives the source resume being deleted (FK is ON DELETE SET NULL). '
  'Maintained by the snapshot_resume_title() trigger; not refreshed on rename.';
COMMENT ON COLUMN public.interview_sessions.resume_title IS
  'Snapshot of resumes.title at the time this session was started. '
  'Survives the source resume being deleted (FK is ON DELETE SET NULL). '
  'Maintained by the snapshot_resume_title() trigger; not refreshed on rename.';
