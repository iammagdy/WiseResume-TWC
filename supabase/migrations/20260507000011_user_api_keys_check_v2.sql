-- AI-2 step 3 of 3: lock `user_api_keys.key_version` to 2 forever.
--
-- DEPLOY ORDER NOTE FOR OPERATORS
-- -------------------------------
-- This migration MUST be applied AFTER the admin-migrate-api-key-encryption
-- edge function has been run against the target environment and the
-- following query returns zero:
--
--   SELECT count(*) FROM public.user_api_keys WHERE key_version <> 2;
--
-- The CHECK constraint is added with `NOT VALID` so the migration applies
-- even when one or more legacy `key_version = 1` rows are still present.
-- This protects every NEW row immediately while leaving the legacy rows
-- in place for the operator to re-encrypt on their own schedule. Once the
-- legacy backfill is complete, run:
--
--   ALTER TABLE public.user_api_keys VALIDATE CONSTRAINT user_api_keys_key_version_v2_only;
--
-- to confirm the entire table is now v2. (See follow-up Task #8.)
--
-- See `docs/ops/api-key-encryption-rotation.md` for the full
-- operational sequence and for the procedure to introduce a future
-- `key_version = 3` (master-secret rotation) without breaking this
-- constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_api_keys_key_version_v2_only'
      AND conrelid = 'public.user_api_keys'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.user_api_keys
      ADD CONSTRAINT user_api_keys_key_version_v2_only
      CHECK (key_version = 2) NOT VALID';
  END IF;
END $$;

COMMENT ON CONSTRAINT user_api_keys_key_version_v2_only ON public.user_api_keys IS
  'AI-2: pin key_version to 2 (per-user salt) for new rows. Added NOT VALID '
  'so legacy v1 rows can be re-encrypted asynchronously. Run '
  'ALTER TABLE ... VALIDATE CONSTRAINT once backfill is complete. Bumping '
  'to v3 requires (a) re-running the migration job to backfill all rows, '
  '(b) dropping this constraint, (c) re-adding it with the new version. '
  'See runbook.';
