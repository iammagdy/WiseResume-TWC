-- DB trigger: expire a trial resume the moment its content is first changed.
-- This is the authoritative "24h OR first save, whichever comes first" enforcement.
-- The trigger runs BEFORE UPDATE, modifying NEW.trial_expires_at to now() when
-- content columns change on an active trial resume. This is independent of any
-- client-side cache state.
--
-- Works in tandem with migration 20260418000003 (restrictive RLS USING clause):
--   BEFORE trigger runs → sets NEW.trial_expires_at = now()
--   RLS USING checks OLD row (still active) → passes
--   (No WITH CHECK clause on that policy, so the new expired value is accepted)
--   Subsequent update attempts → OLD row is now expired → USING blocks them

CREATE OR REPLACE FUNCTION public.expire_trial_resume_on_first_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act on active trial resumes where content columns changed
  IF NEW.is_trial = true
     AND NEW.trial_expires_at IS NOT NULL
     AND OLD.trial_expires_at IS NOT NULL
     AND OLD.trial_expires_at > now()
     AND (
       NEW.contact_info   IS DISTINCT FROM OLD.contact_info   OR
       NEW.summary        IS DISTINCT FROM OLD.summary        OR
       NEW.experience     IS DISTINCT FROM OLD.experience     OR
       NEW.education      IS DISTINCT FROM OLD.education      OR
       NEW.skills         IS DISTINCT FROM OLD.skills         OR
       NEW.certifications IS DISTINCT FROM OLD.certifications OR
       NEW.awards         IS DISTINCT FROM OLD.awards         OR
       NEW.projects       IS DISTINCT FROM OLD.projects       OR
       NEW.publications   IS DISTINCT FROM OLD.publications   OR
       NEW.volunteering   IS DISTINCT FROM OLD.volunteering   OR
       NEW.hobbies        IS DISTINCT FROM OLD.hobbies        OR
       NEW.references     IS DISTINCT FROM OLD.references     OR
       NEW.template_id    IS DISTINCT FROM OLD.template_id    OR
       NEW.title          IS DISTINCT FROM OLD.title
     )
  THEN
    -- Expire the trial immediately; RLS USING (old-row check) already passed
    NEW.trial_expires_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trial_resume_expire_on_edit
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.expire_trial_resume_on_first_edit();
