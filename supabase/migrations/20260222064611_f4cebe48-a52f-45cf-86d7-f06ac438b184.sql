
-- 1. Re-create the handle_new_user trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix 8 FK constraints from NO ACTION to ON DELETE SET NULL
ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT fk_ai_usage_logs_resume,
  ADD CONSTRAINT fk_ai_usage_logs_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.career_assessments
  DROP CONSTRAINT fk_career_assessments_resume,
  ADD CONSTRAINT fk_career_assessments_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.cover_letters
  DROP CONSTRAINT fk_cover_letters_resume,
  ADD CONSTRAINT fk_cover_letters_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.interview_sessions
  DROP CONSTRAINT fk_interview_sessions_resume,
  ADD CONSTRAINT fk_interview_sessions_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.job_applications
  DROP CONSTRAINT fk_job_applications_resume,
  ADD CONSTRAINT fk_job_applications_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.tailor_history
  DROP CONSTRAINT fk_tailor_history_resume,
  ADD CONSTRAINT fk_tailor_history_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_portfolio_resume_id_fkey,
  ADD CONSTRAINT profiles_portfolio_resume_id_fkey
    FOREIGN KEY (portfolio_resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE public.resumes
  DROP CONSTRAINT resumes_parent_resume_id_fkey,
  ADD CONSTRAINT resumes_parent_resume_id_fkey
    FOREIGN KEY (parent_resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

-- 3. Backfill missing user_preferences records
INSERT INTO public.user_preferences (user_id)
SELECT p.user_id FROM public.profiles p
LEFT JOIN public.user_preferences up ON up.user_id = p.user_id
WHERE up.user_id IS NULL;

-- 4. Add missing FKs on short_links and audit_logs
ALTER TABLE public.short_links
  ADD CONSTRAINT short_links_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
