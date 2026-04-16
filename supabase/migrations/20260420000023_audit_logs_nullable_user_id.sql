-- Allow null user_id in audit_logs for actions targeting non-existent recipients.
-- When an admin sends email to an address not in auth.users, we store user_id = null
-- and capture the intended recipient in metadata.target_email to preserve audit integrity
-- without misattributing the action to the admin caller.

ALTER TABLE public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- Existing FK constraint on user_id is preserved (it allows nulls with the FK intact).
-- Existing RLS policies using `auth.uid() = user_id` safely evaluate to false for null
-- rows (SQL NULL comparison), which is correct — null-subject rows are admin-only.

-- Admin read policy for null-subject audit rows (service-role bypass covers inserts).
DROP POLICY IF EXISTS "Admin can read all audit logs" ON public.audit_logs;
CREATE POLICY "Admin can read all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
