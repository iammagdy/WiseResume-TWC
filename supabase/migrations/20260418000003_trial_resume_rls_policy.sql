-- Add a RESTRICTIVE RLS policy that prevents writes to ALREADY-expired trial resumes.
-- The USING clause (old-row check) blocks any UPDATE where the existing row is an
-- expired trial. This correctly enforces read-only state after expiry.
--
-- No WITH CHECK clause is needed here: WITH CHECK would apply to the new-row values
-- and would incorrectly reject the legitimate first-save transition where the client
-- sets trial_expires_at = now() to mark expiry. The USING clause is sufficient.
--
-- Lifecycle guaranteed by this policy:
--   Active trial  (trial_expires_at > now())  → USING passes → write allowed
--   First edit    (client sets trial_expires_at = now())  → USING saw old row as active → write succeeds, trial expires
--   Expired trial (trial_expires_at <= now()) → USING blocks → write rejected

DROP POLICY IF EXISTS "block_writes_to_expired_trials" ON public.resumes;
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
  );
