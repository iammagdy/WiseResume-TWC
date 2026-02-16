CREATE INDEX IF NOT EXISTS idx_resume_versions_user_resume ON resume_versions (user_id, resume_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_assessments_user_id ON career_assessments (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);