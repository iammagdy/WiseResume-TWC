
-- Drop existing FK constraints if they exist, then re-add with proper CASCADE/SET NULL behavior

-- resume_versions.resume_id → resumes.id (CASCADE - meaningless without resume)
ALTER TABLE resume_versions DROP CONSTRAINT IF EXISTS fk_resume_versions_resume;
ALTER TABLE resume_versions DROP CONSTRAINT IF EXISTS resume_versions_resume_id_fkey;
ALTER TABLE resume_versions
  ADD CONSTRAINT fk_resume_versions_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;

-- resume_shares.resume_id → resumes.id (CASCADE - meaningless without resume)
ALTER TABLE resume_shares DROP CONSTRAINT IF EXISTS fk_resume_shares_resume;
ALTER TABLE resume_shares DROP CONSTRAINT IF EXISTS resume_shares_resume_id_fkey;
ALTER TABLE resume_shares
  ADD CONSTRAINT fk_resume_shares_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;

-- share_comments.share_id → resume_shares.id (CASCADE - comments die with share)
ALTER TABLE share_comments DROP CONSTRAINT IF EXISTS fk_share_comments_share;
ALTER TABLE share_comments DROP CONSTRAINT IF EXISTS share_comments_share_id_fkey;
ALTER TABLE share_comments
  ADD CONSTRAINT fk_share_comments_share
  FOREIGN KEY (share_id) REFERENCES resume_shares(id) ON DELETE CASCADE;

-- cover_letters.resume_id → resumes.id (SET NULL - letter can exist without resume)
ALTER TABLE cover_letters DROP CONSTRAINT IF EXISTS fk_cover_letters_resume;
ALTER TABLE cover_letters DROP CONSTRAINT IF EXISTS cover_letters_resume_id_fkey;
ALTER TABLE cover_letters
  ADD CONSTRAINT fk_cover_letters_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

-- tailor_history.resume_id → resumes.id (SET NULL)
ALTER TABLE tailor_history DROP CONSTRAINT IF EXISTS fk_tailor_history_resume;
ALTER TABLE tailor_history DROP CONSTRAINT IF EXISTS tailor_history_resume_id_fkey;
ALTER TABLE tailor_history
  ADD CONSTRAINT fk_tailor_history_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

-- ai_usage_logs.resume_id → resumes.id (SET NULL)
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS fk_ai_usage_logs_resume;
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_resume_id_fkey;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT fk_ai_usage_logs_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

-- interview_sessions.resume_id → resumes.id (SET NULL)
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS fk_interview_sessions_resume;
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_resume_id_fkey;
ALTER TABLE interview_sessions
  ADD CONSTRAINT fk_interview_sessions_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

-- career_assessments.resume_id → resumes.id (SET NULL)
ALTER TABLE career_assessments DROP CONSTRAINT IF EXISTS fk_career_assessments_resume;
ALTER TABLE career_assessments DROP CONSTRAINT IF EXISTS career_assessments_resume_id_fkey;
ALTER TABLE career_assessments
  ADD CONSTRAINT fk_career_assessments_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

-- job_applications.resume_id → resumes.id (SET NULL)
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS fk_job_applications_resume;
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_resume_id_fkey;
ALTER TABLE job_applications
  ADD CONSTRAINT fk_job_applications_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;
