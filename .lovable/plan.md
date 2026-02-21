
# Resumable Migration Retry Workflow

## Problem

Both migration flows -- guest resume migration (`useGuestMigration`) and API key migration (`migrateLocalKeysToServer`) -- are fire-and-forget with no retry logic. If a network blip occurs during sign-in, the migration silently fails and the user's local data is stranded until they manually trigger it again (next full session for keys, or never for guest data since `hasRun.current` blocks re-attempts within the same React lifecycle).

## Solution

Extract a shared `retryWithBackoff` utility and refactor both migrations into multi-step pipelines where each step is idempotent and progress is checkpointed to `localStorage`. If a step fails, the pipeline stops and automatically retries with exponential backoff (up to 3 attempts). On next app launch, incomplete migrations resume from the last successful checkpoint.

---

## New File: `src/lib/migrationRunner.ts`

A generic migration runner with:

- **`retryWithBackoff(fn, options)`** -- runs an async function up to `maxRetries` times with exponential backoff (1s, 2s, 4s). Returns result or throws after exhaustion.
- **`runMigrationPipeline(id, steps)`** -- accepts a pipeline ID (e.g. `'guest-resume'`) and an ordered array of named steps. For each step:
  1. Checks `localStorage` checkpoint (`wr-migration-{id}-step`) to skip already-completed steps (resumable).
  2. Runs the step function wrapped in `retryWithBackoff`.
  3. On success, writes the step name to the checkpoint.
  4. On failure after all retries, stops and returns `{ completed: false, failedStep }`.
  5. When all steps complete, writes a final "done" checkpoint and returns `{ completed: true }`.

Each step function is idempotent by contract -- safe to re-run if the checkpoint write failed after the step succeeded.

## Modified File: `src/hooks/useGuestMigration.ts`

Refactor the single `migrate()` function into a 3-step pipeline:

| Step | Action | Idempotency Guard |
|------|--------|-------------------|
| `check-existing` | Query DB for existing resume by ID | Read-only, always safe |
| `insert-resume` | Insert resume row | Uses `ON CONFLICT DO NOTHING` or checks existence first (already does `maybeSingle` check) |
| `cleanup-local` | Clear guest data from localStorage, invalidate queries, show toast | Clearing already-null data is a no-op |

Changes:
- Replace the monolithic `migrate()` with `runMigrationPipeline('guest-resume', steps)`.
- Remove `hasRun.current` ref guard -- the checkpoint system handles deduplication.
- Replace `sessionStorage` flag with the pipeline's own "done" checkpoint in `localStorage` (persists across sessions so incomplete migrations resume).
- On partial failure, show a softer toast: "We'll finish saving your draft next time you're online."

## Modified File: `src/lib/migrateLocalKeys.ts`

Refactor into a 2-step pipeline:

| Step | Action | Idempotency Guard |
|------|--------|-------------------|
| `upload-key` | Invoke `manage-api-keys` edge function | Server-side upsert (inserting same key twice is safe) |
| `strip-local` | Remove sensitive keys from localStorage, set migrated flag | Stripping already-absent keys is a no-op |

Changes:
- Replace the single try/catch with `runMigrationPipeline('api-keys', steps)`.
- The existing `MIGRATED_FLAG` check becomes the pipeline's "done" checkpoint.
- Retries with backoff instead of silently deferring to "next session".

## Modified File: `src/contexts/AuthContext.tsx`

No structural changes. The `migrateLocalKeysToServer()` call on line 65 remains fire-and-forget -- the retry logic is now internal to the function. The only change is that if the pipeline was left incomplete from a previous session, it automatically resumes on next sign-in.

---

## Technical Details

### `migrationRunner.ts` (~60 lines)

```text
retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000 })
  - Attempt 1: immediate
  - Attempt 2: wait 1s
  - Attempt 3: wait 2s
  - Attempt 4: wait 4s (if maxRetries=3, this is the last)
  - Throws on final failure

runMigrationPipeline(id, steps[])
  - Reads checkpoint: localStorage['wr-migration-{id}-step']
  - Skips steps up to and including the checkpointed step
  - Runs remaining steps sequentially with retryWithBackoff
  - Writes checkpoint after each successful step
  - Returns { completed, failedStep? }
```

### Checkpoint storage format

```text
Key: wr-migration-guest-resume-step
Value: "insert-resume"  (last completed step name)

Key: wr-migration-guest-resume-done
Value: "1"  (pipeline fully complete)
```

### `useGuestMigration.ts` changes

- The `useEffect` still gates on `session?.user` being present.
- Instead of `hasRun.current`, checks `localStorage['wr-migration-guest-resume-done'] === '1'` for instant bail-out.
- The pipeline's `check-existing` step returns early (marks pipeline done) if the resume already exists in DB.
- The `cleanup-local` step is the final step -- local data is only cleared after the DB insert is confirmed and checkpointed.

### `migrateLocalKeys.ts` changes

- The existing `MIGRATED_FLAG` (`wiseresume-keys-migrated`) is replaced by the pipeline's `wr-migration-api-keys-done` checkpoint.
- The `upload-key` step gracefully handles the case where no key exists (marks done immediately).

### Files Summary

| File | Action |
|------|--------|
| `src/lib/migrationRunner.ts` | Create -- shared retry + pipeline runner |
| `src/hooks/useGuestMigration.ts` | Modify -- refactor to use pipeline |
| `src/lib/migrateLocalKeys.ts` | Modify -- refactor to use pipeline |
| `src/contexts/AuthContext.tsx` | No changes needed |

### No new dependencies required.
