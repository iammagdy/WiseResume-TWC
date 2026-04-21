-- AI-2: Migrate legacy AI key encryption to per-user salt.
--
-- Step 1 of 3 (this file):
--   * Add the `key_version` column to `public.user_api_keys`. The column has
--     existed in code (`aiClient.ts`, `manage-api-keys/index.ts`) since the
--     v2 per-user-salt design was introduced, but no migration ever added
--     the physical column — every existing row therefore reads back as
--     `key_version = NULL` and falls through to the static-salt v1 decrypt.
--     We add the column with `DEFAULT 1` so existing rows are explicitly
--     marked as legacy v1 (they were encrypted under the static salt).
--     New writes from `manage-api-keys` already supply `key_version: 2`.
--
--   * Create `ai_key_migration_audit` — a small, dedicated audit table for
--     per-row outcomes of the v1 → v2 re-encryption job. Lives separate
--     from `audit_logs` so the migration runbook can scan a single table
--     without RLS contortions and without polluting the user-facing audit
--     stream. Stores no key material — only `user_id`, `provider`,
--     `action`, and `details` (e.g. error code on failure).
--
-- Step 2 (separate edge function): `admin-migrate-api-key-encryption`
--   re-encrypts every non-v2 row under the per-user salt and flips the
--   row's `key_version` to 2.
--
-- Step 3 (separate migration `..._user_api_keys_check_v2.sql`): once
--   step 2 reports zero non-v2 rows in production, apply the CHECK
--   constraint that pins `key_version = 2` permanently.
--
-- Why split: applying the CHECK constraint before the data backfill runs
-- in production would refuse to apply (the legacy rows still hold v1).
-- The split lets operators sequence migrate → verify → constrain.

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS key_version smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.user_api_keys.key_version IS
  'Encryption salt scheme. 1 = legacy static salt (deprecated, must be migrated). 2 = per-user salt user-api-keys-salt-v2-<userId>. New writes always store 2.';

CREATE TABLE IF NOT EXISTS public.ai_key_migration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  action text NOT NULL CHECK (action IN ('migrated', 'skipped_v2', 'decrypt_failed', 'reencrypt_failed', 'update_failed')),
  from_version smallint,
  to_version smallint,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_key_migration_audit IS
  'AI-2: per-row outcomes of the v1 → v2 BYOK encryption migration. Never stores key material.';

ALTER TABLE public.ai_key_migration_audit ENABLE ROW LEVEL SECURITY;

-- Service-role only: the migration job and admin tooling read/write.
-- No user-level policies — there is intentionally no path for end-users
-- to read this table from the client.
CREATE INDEX IF NOT EXISTS idx_ai_key_migration_audit_user_provider
  ON public.ai_key_migration_audit (user_id, provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_key_migration_audit_action_created
  ON public.ai_key_migration_audit (action, created_at DESC);
