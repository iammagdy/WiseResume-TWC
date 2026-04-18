-- Add a RESTRICTIVE RLS policy that prevents writes to expired trial resumes.
-- Permissive policies still allow users to update their own resumes, but this
-- restrictive policy ensures expired trials cannot be modified regardless of
-- any permissive policy that might allow it.
--
-- Rule: is_trial = true AND trial_expires_at <= now()  →  block the write.

CREATE POLICY "block_writes_to_expired_trials"
  ON public.resumes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    NOT (
      is_trial = true
      AND trial_expires_at IS NOT NULL
      AND trial_expires_at <= now()
    )
  )
  WITH CHECK (
    NOT (
      is_trial = true
      AND trial_expires_at IS NOT NULL
      AND trial_expires_at <= now()
    )
  );
