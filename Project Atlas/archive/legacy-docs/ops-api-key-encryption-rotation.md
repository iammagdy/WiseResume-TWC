> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# BYOK API Key Encryption — Migration & Rotation Runbook

> **HISTORICAL — 2026-04-24, Task #21.** The `admin-migrate-api-key-encryption`
> edge function this runbook depends on has been **deleted** from the Supabase
> deployment. The v1 → v2 backfill it performed is complete (the only legacy
> row was migrated 2026-04-21, and the `user_api_keys_key_version_v2_only`
> CHECK constraint is now VALIDATED with zero rows of `key_version <> 2`).
>
> Part 1 below is preserved as a record of the procedure that was actually
> run. Part 2 (future master-secret rotation to v3) is still valid as a
> recipe, but the operator MUST first re-implement an
> `admin-migrate-api-key-encryption-v3` (or similar) edge function from the
> v1→v2 spec — the original source is **not** in git history.

---

This runbook covers two operational procedures for `public.user_api_keys`:

1. **Initial v1 → v2 backfill** (one-shot, AI-2). Re-encrypts every legacy
   row that was written under the static salt and pins them to the
   per-user salt scheme.
2. **Future master-secret rotation** (introducing `key_version = 3`). Same
   shape as the v1 → v2 procedure — repeat with a new prefix.

The legacy fallback is **gone from the read path** (`aiClient.ts` —
`getUserKeyFromDB` / `getUserKeyAndUrlFromDB`): a row whose `key_version`
is anything other than `2` throws `LegacyKeyVersionError` and the user
sees *"please re-enter your key in AI Settings"*. This means the
backfill must complete **before** users with v1 rows make their next
BYOK call, or those users will be locked out until they re-save.

---

## Part 1 — v1 → v2 backfill (one-shot)

### Pre-flight

- Confirm migrations `20260507000010_user_api_keys_key_version_and_audit.sql`
  is applied. The `key_version` column exists with `DEFAULT 1`, so every
  pre-existing row is now explicitly v1. The `ai_key_migration_audit`
  table exists and is empty.
- Migration `20260507000011_user_api_keys_check_v2.sql` is **NOT** yet
  applied — it would refuse to apply while v1 rows exist.
- The `admin-migrate-api-key-encryption` edge function is deployed.
- `API_KEY_ENCRYPTION_SECRET` is set in Edge Function secrets and is the
  **same value** that was in use when the v1 rows were originally
  written (it is the master secret; only the salt changed between v1
  and v2).
- A DevKit admin session is available for the operator running the job
  (the function is gated by `requireAdminAuth`).

### Step 1 — dry run

```bash
curl -s \
  -H "Authorization: Bearer $DEVKIT_TOKEN" \
  -X POST \
  "$SUPABASE_URL/functions/v1/admin-migrate-api-key-encryption?dry_run=true" | jq
```

Expected output:

```json
{
  "success": true,
  "scanned": <total v1 rows>,
  "migrated": <same as scanned, less any decrypt_failed>,
  "skipped_v2": 0,
  "decrypt_failed": 0,
  "reencrypt_failed": 0,
  "update_failed": 0,
  "dry_run": true,
  "remaining_non_v2": <total v1 rows>,
  "details": []
}
```

If `decrypt_failed > 0`, inspect `details` for the affected user_ids
and ciphertext hashes. Likely causes:
- `API_KEY_ENCRYPTION_SECRET` was rotated at some point without a
  migration → those rows are unrecoverable; flag them for the cleanup
  pass below.
- Corrupted ciphertext → same.
- Don't proceed to the live run until you have a list of expected
  failures and have signed off that they are acceptable to leave
  untouched.

### Step 2 — live run

Pick a low-traffic window. The function is online — there is no
maintenance window required, but writers (a user saving a new key in
that exact moment) could race the job. The per-row `update ... .neq('key_version', 2)`
guard means a concurrent v2 write is preserved, not clobbered.

```bash
curl -s \
  -H "Authorization: Bearer $DEVKIT_TOKEN" \
  -X POST \
  "$SUPABASE_URL/functions/v1/admin-migrate-api-key-encryption" | jq
```

The function is **idempotent** — re-running it is safe. If the run
times out before scanning all rows, just re-invoke; the second run
picks up where the first left off (it filters `key_version <> 2` and
pages by `id`).

### Step 3 — verify

```sql
SELECT count(*) FROM public.user_api_keys WHERE key_version <> 2;
-- expect 0

SELECT action, count(*)
FROM public.ai_key_migration_audit
WHERE created_at > now() - interval '1 day'
GROUP BY action;
-- expect: 'migrated' = total_pre_run_v1_count
--         'decrypt_failed' = the expected-failures list (acceptable)
--         all others = 0
```

If `count(*) <> 0` and the remaining rows are all in `decrypt_failed`
audit entries, **do not apply the CHECK constraint yet**. Either:
- Restore the original `API_KEY_ENCRYPTION_SECRET` (if it was rotated)
  and re-run, or
- Hard-delete the unrecoverable rows after a 14-day grace (separate
  follow-up — out of scope for this runbook).

### Step 4 — apply the CHECK constraint

Apply migration `20260507000011_user_api_keys_check_v2.sql`. It will
fail loudly if any `key_version <> 2` rows remain — that is the safety
gate, do not work around it by dropping rows from the migration.

### Step 5 — confirm read path

Smoke-test BYOK for at least one provider (Gemini, Ollama, OpenRouter)
end-to-end via `ai-test`. Confirm a fresh save through `manage-api-keys`
also works (it stores `key_version: 2`).

---

## Part 2 — master-secret rotation (introducing v3)

When `API_KEY_ENCRYPTION_SECRET` itself needs to be rotated (e.g. the
secret was suspected leaked), repeat the pattern with a new version
number. The shape is intentionally the same so this runbook stays the
authoritative reference.

### Step 1 — code: add v3 alongside v2

In `supabase/functions/manage-api-keys/index.ts`:

- Add `API_KEY_ENCRYPTION_SECRET_V3` env var alongside `..._V2` (the
  current one becomes `..._V2`). Read both.
- New writes use v3: salt = `user-api-keys-salt-v3-<userId>`,
  encrypted with the v3 master secret. Set `key_version: 3`.

In `supabase/functions/_shared/aiClient.ts`:

- Extend `decryptKeyWithSalt` to take a master secret as well as a
  salt, or add a sibling helper that picks the secret based on
  `key_version` (2 → V2 secret, 3 → V3 secret).
- `getUserKeyFromDB` / `getUserKeyAndUrlFromDB`: accept either
  `key_version === 2` or `key_version === 3` — but not both forever.
  Plan to remove v2 once the migration completes.

### Step 2 — adapt the migration function

Copy `admin-migrate-api-key-encryption` to e.g.
`admin-migrate-api-key-encryption-v3`. Change:

- The "from" salt + secret to the v2 pair.
- The "to" salt prefix to `user-api-keys-salt-v3-`.
- The "to" secret to the new master.
- `target_to_version` = 3.
- The query filter to `key_version = 2` (not `<> 3`, so a stray v1 row
  is surfaced rather than silently re-migrated under the wrong source
  salt).

### Step 3 — run, verify, constrain

- Drop the existing CHECK constraint:
  `ALTER TABLE public.user_api_keys DROP CONSTRAINT user_api_keys_key_version_v2_only;`
- Run the v3 migration function (dry-run, then live, same as Part 1).
- Verify `SELECT count(*) FROM public.user_api_keys WHERE key_version <> 3 = 0`.
- Add the new CHECK constraint:
  `ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_key_version_v3_only CHECK (key_version = 3);`
- Remove the v2 decrypt path from `aiClient.ts` and the v2 secret from
  the env. The v3 path is now sole.

### Step 4 — old-secret retirement

Rotate `API_KEY_ENCRYPTION_SECRET_V2` out of the secret store at least
24 hours after step 3 ships, in case a rollback is needed. After that,
the old secret has no purpose and should be revoked everywhere it was
ever stored (CI, local `.env` snapshots, etc.).

---

## Failure modes (both procedures)

| Symptom | Likely cause | Action |
|---|---|---|
| `decrypt_failed` for a row | Master secret in use today differs from when the row was written; or ciphertext is corrupt. | Restore the prior secret and re-run, or accept the loss and queue the row for the 14-day cleanup pass. |
| `reencrypt_failed` | Crypto subsystem misconfig; round-trip self-check inside the job caught it before any DB write. | Investigate Edge runtime logs; the row is left untouched, no data loss. |
| `update_failed` | A concurrent writer flipped the row to v2 between SELECT and UPDATE (the `.neq('key_version', 2)` guard kicked in). | Safe — the concurrent write wins. Re-run picks up nothing for that row. |
| CHECK constraint migration aborts | At least one row is still on v1 (or v2, when rolling out v3). | Re-run the migration function until the remaining count is zero. |
| Users complain "please re-enter your key in AI Settings" | Their row is still on a non-target version (the constraint was applied before the backfill completed, or they were the `decrypt_failed` row). | Have them re-save the key via AI Settings — the new write lands at the current version. |
