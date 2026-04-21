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
-- The CHECK constraint below will fail to apply (and the migration will
-- abort) if any legacy rows remain. That is the safety gate: it guarantees
-- we cannot accidentally orphan a legacy user by deploying the constraint
-- before the data backfill is complete.
--
-- See `docs/ops/api-key-encryption-rotation.md` for the full
-- operational sequence and for the procedure to introduce a future
-- `key_version = 3` (master-secret rotation) without breaking this
-- constraint.

ALTER TABLE public.user_api_keys
  ADD CONSTRAINT user_api_keys_key_version_v2_only
  CHECK (key_version = 2);

COMMENT ON CONSTRAINT user_api_keys_key_version_v2_only ON public.user_api_keys IS
  'AI-2: pin key_version to 2 (per-user salt). Bumping to v3 requires (a) re-running the migration job to backfill all rows, (b) dropping this constraint, (c) re-adding it with the new version. See runbook.';
