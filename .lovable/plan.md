

# Database Cleanup Utility for Post-Migration Orphan Pruning

## Problem

After migrations run (guest resume, API key), several types of orphaned data can accumulate:

1. **Stale localStorage checkpoints** -- `wr-migration-*-step` keys persist even after `wr-migration-*-done` is set to `1`. These are harmless but accumulate indefinitely.
2. **Database orphans** -- The existing `cleanup_stale_data()` Postgres function handles old audit logs (90d), read notifications (30d), and excess resume versions (50 per resume), but it is never called from the client. It runs only if manually invoked.
3. **Potential orphaned resume_shares/resume_versions** -- If a resume is deleted but cascade didn't fire (edge case with soft-deletes or failed transactions), child rows linger.

## Solution

Create a lightweight cleanup utility that runs once per day (debounced via localStorage timestamp) and:
- Calls the existing `cleanup_stale_data()` RPC to prune old logs, notifications, and excess versions
- Cleans up completed migration checkpoint keys from localStorage
- Logs the cleanup event to audit_logs

---

## Changes

### 1. Create `src/lib/dbCleanup.ts` (~50 lines)

A utility with two functions:

**`pruneLocalStorageCheckpoints()`** -- Scans localStorage for `wr-migration-*-done` keys. For each completed pipeline, removes the corresponding `wr-migration-*-step` key (no longer needed after completion).

**`runDailyCleanup()`** -- The main entry point:
1. Checks `localStorage['wr-cleanup-last']` timestamp. If less than 24 hours ago, returns immediately.
2. Calls `pruneLocalStorageCheckpoints()`.
3. Invokes `supabase.rpc('cleanup_stale_data')` to prune server-side orphans.
4. Writes current timestamp to `wr-cleanup-last`.
5. Logs `logAudit('account', 'daily_cleanup_ran')`.
6. Entire function is wrapped in try/catch -- never blocks or throws.

### 2. Modify `src/contexts/AuthContext.tsx`

Add a single fire-and-forget call to `runDailyCleanup()` inside the existing `onAuthStateChange` handler, right after the `migrateLocalKeysToServer()` call. It only fires on `SIGNED_IN` events (same gate as key migration), ensuring it runs once per authenticated session.

### 3. Modify existing `cleanup_stale_data()` DB function (migration)

Extend the existing function to also prune:
- `audit_logs` older than 90 days (matching the `ai_usage_logs` retention)
- `resume_shares` where `is_active = false` and `created_at` older than 30 days

This keeps the single RPC call comprehensive.

---

## Technical Details

### `dbCleanup.ts` structure

```text
pruneLocalStorageCheckpoints()
  - Iterate localStorage keys matching /^wr-migration-.*-done$/
  - For each, extract pipeline ID
  - Remove the corresponding -step key
  - No DB interaction

runDailyCleanup()
  - Guard: skip if last run < 24h ago
  - Call pruneLocalStorageCheckpoints()
  - Call supabase.rpc('cleanup_stale_data')
  - Update wr-cleanup-last timestamp
  - logAudit('account', 'daily_cleanup_ran')
  - All wrapped in try/catch
```

### AuthContext integration point

```text
// Inside onAuthStateChange SIGNED_IN handler (after migrateLocalKeysToServer):
runDailyCleanup();  // fire-and-forget, never blocks
```

### Extended cleanup_stale_data() SQL

```text
-- Existing:
DELETE FROM ai_usage_logs WHERE created_at < now() - interval '90 days';
DELETE FROM notifications WHERE is_read = true AND created_at < now() - interval '30 days';
DELETE FROM resume_versions WHERE rn > 50 (per resume);

-- New additions:
DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';
DELETE FROM resume_shares WHERE is_active = false AND created_at < now() - interval '30 days';
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/dbCleanup.ts` | Create -- daily cleanup utility |
| `src/contexts/AuthContext.tsx` | Modify -- add `runDailyCleanup()` call on sign-in |
| Database migration | Modify -- extend `cleanup_stale_data()` with audit_logs and inactive shares pruning |

### No new dependencies required.

