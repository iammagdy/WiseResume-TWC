

# Audit Logging for DB Migrations and User-Related Changes

## Problem

Migration pipelines (`migrationRunner.ts`) and key user actions (account deletion, API key changes, profile updates) produce only ephemeral `console.warn`/`console.info` logs that vanish when the browser tab closes. There is no persistent, queryable record of migration outcomes, retries, or sensitive account-level changes -- making debugging and support harder.

## Solution

Add a lightweight, client-side audit logger that persists structured events to the `ai_usage_logs`-style pattern -- a new `audit_logs` table in the database. The logger is fire-and-forget (never blocks UX) and captures migration step results, account changes, and API key lifecycle events.

---

## 1. Create `audit_logs` Database Table

A new table to store structured audit events with RLS scoped to the owning user.

```text
Table: audit_logs
Columns:
  id          uuid        PK, default gen_random_uuid()
  user_id     uuid        NOT NULL
  category    text        NOT NULL  -- 'migration' | 'account' | 'api_key' | 'auth'
  action      text        NOT NULL  -- 'pipeline_started' | 'step_completed' | 'step_failed' | 'data_deleted' | 'key_saved' | 'key_deleted' | 'signed_out'
  metadata    jsonb       DEFAULT '{}'  -- pipeline_id, step_name, error message, etc.
  created_at  timestamptz DEFAULT now()

RLS policies:
  - INSERT: auth.uid() = user_id
  - SELECT: auth.uid() = user_id
  - DELETE: auth.uid() = user_id  (for GDPR data export/delete)
```

No UPDATE policy needed -- audit logs are append-only.

## 2. Create `src/lib/auditLogger.ts`

A thin utility (~30 lines) that wraps inserts to `audit_logs`. It is fire-and-forget -- errors are caught and silently logged to console to never disrupt the user.

```text
Functions:
  logAudit(category, action, metadata?)
    - Reads user ID from supabase.auth.getUser() (cached)
    - Inserts a row into audit_logs
    - Catches and swallows errors (console.warn only)
```

Key design decisions:
- Uses the existing Supabase client from `safeClient.ts`
- No batching needed -- audit events are infrequent (a few per session)
- Returns void, never throws

## 3. Instrument `migrationRunner.ts`

Add `logAudit` calls at three points inside `runMigrationPipeline`:
- **Pipeline start**: `logAudit('migration', 'pipeline_started', { pipelineId, totalSteps, resumedFrom })`
- **Step success**: `logAudit('migration', 'step_completed', { pipelineId, stepName })`
- **Step failure** (after retry exhaustion): `logAudit('migration', 'step_failed', { pipelineId, stepName, error })`

These are fire-and-forget -- they don't affect pipeline control flow or checkpointing.

## 4. Instrument User-Related Changes

### `manage-api-keys` Edge Function
Add a `logAudit` call after successful POST (key saved) and DELETE (key removed) in `migrateLocalKeys.ts` and `AISettingsSheet.tsx`:
- `logAudit('api_key', 'key_saved', { provider })`
- `logAudit('api_key', 'key_deleted', { provider })`

### `DeleteDataDialog.tsx`
After successful `deleteAllUserData()`:
- `logAudit('account', 'data_deleted', { resumeCount })`

### `AuthContext.tsx`
On user-initiated sign-out:
- `logAudit('auth', 'signed_out')` (called before `supabase.auth.signOut`)

## 5. Integrate into Data Export

Add `audit_logs` to the existing `dataExport.ts` tables array so users can export their own audit trail via GDPR export.

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create `audit_logs` table with RLS |
| `src/lib/auditLogger.ts` | Create -- fire-and-forget audit insert utility |
| `src/lib/migrationRunner.ts` | Modify -- add 3 audit log calls (start, success, fail) |
| `src/lib/migrateLocalKeys.ts` | Modify -- log key upload success |
| `src/components/settings/AISettingsSheet.tsx` | Modify -- log key save/delete |
| `src/components/settings/DeleteDataDialog.tsx` | Modify -- log data deletion |
| `src/contexts/AuthContext.tsx` | Modify -- log sign-out |
| `src/lib/dataExport.ts` | Modify -- add `audit_logs` to export list |

### No new dependencies required.

