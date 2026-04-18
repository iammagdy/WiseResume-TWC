-- Task #11: Add trial-resume columns so free-tier users can create one
-- 24-hour trial resume without upgrading.
ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- Partial index so expired-trial cleanup queries stay fast.
CREATE INDEX IF NOT EXISTS idx_resumes_trial_expires
  ON resumes (trial_expires_at)
  WHERE is_trial = true;

COMMENT ON COLUMN resumes.is_trial IS
  'When true, this resume is a 24-hour free trial copy. It does not count toward the free-plan quota.';
COMMENT ON COLUMN resumes.trial_expires_at IS
  'UTC timestamp at which a trial resume automatically expires. NULL for non-trial resumes.';
