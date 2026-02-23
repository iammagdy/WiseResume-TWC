-- ============================================================
-- Production hardening: add missing FK constraints + ON DELETE CASCADE
-- ============================================================

-- 1. ai_credits → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ai_credits_user' AND table_name = 'ai_credits'
  ) THEN
    ALTER TABLE public.ai_credits
      ADD CONSTRAINT fk_ai_credits_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. ai_usage_logs → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ai_usage_logs_user' AND table_name = 'ai_usage_logs'
  ) THEN
    ALTER TABLE public.ai_usage_logs
      ADD CONSTRAINT fk_ai_usage_logs_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. audit_logs → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_audit_logs_user' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT fk_audit_logs_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. bug_reports → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bug_reports_user' AND table_name = 'bug_reports'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT fk_bug_reports_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. feature_requests → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_feature_requests_user' AND table_name = 'feature_requests'
  ) THEN
    ALTER TABLE public.feature_requests
      ADD CONSTRAINT fk_feature_requests_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. notifications → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notifications_user' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. push_subscriptions → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_push_subscriptions_user' AND table_name = 'push_subscriptions'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT fk_push_subscriptions_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. resignation_letters → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_resignation_letters_user' AND table_name = 'resignation_letters'
  ) THEN
    ALTER TABLE public.resignation_letters
      ADD CONSTRAINT fk_resignation_letters_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 9. user_api_keys → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_api_keys_user' AND table_name = 'user_api_keys'
  ) THEN
    ALTER TABLE public.user_api_keys
      ADD CONSTRAINT fk_user_api_keys_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. user_preferences → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_preferences_user' AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT fk_user_preferences_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Add ON DELETE CASCADE to existing resume-related FKs
-- (drop + re-add to change the constraint behaviour)
-- ============================================================

-- resume_versions.resume_id
ALTER TABLE public.resume_versions
  DROP CONSTRAINT IF EXISTS fk_resume_versions_resume,
  ADD CONSTRAINT fk_resume_versions_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;

-- cover_letters.resume_id
ALTER TABLE public.cover_letters
  DROP CONSTRAINT IF EXISTS fk_cover_letters_resume,
  ADD CONSTRAINT fk_cover_letters_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

-- career_assessments.resume_id
ALTER TABLE public.career_assessments
  DROP CONSTRAINT IF EXISTS fk_career_assessments_resume,
  ADD CONSTRAINT fk_career_assessments_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

-- interview_sessions.resume_id
ALTER TABLE public.interview_sessions
  DROP CONSTRAINT IF EXISTS fk_interview_sessions_resume,
  ADD CONSTRAINT fk_interview_sessions_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

-- tailor_history.resume_id
ALTER TABLE public.tailor_history
  DROP CONSTRAINT IF EXISTS fk_tailor_history_resume,
  ADD CONSTRAINT fk_tailor_history_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;

-- ai_usage_logs.resume_id
ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS fk_ai_usage_logs_resume,
  ADD CONSTRAINT fk_ai_usage_logs_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;

-- resume_shares.resume_id
ALTER TABLE public.resume_shares
  DROP CONSTRAINT IF EXISTS fk_resume_shares_resume,
  ADD CONSTRAINT fk_resume_shares_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;

-- job_applications.resume_id
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS fk_job_applications_resume,
  ADD CONSTRAINT fk_job_applications_resume
    FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;
