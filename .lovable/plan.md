

# Add Performance Indexes on High-Query Tables

## Problem

Several frequently queried tables only have basic single-column `user_id` indexes. The app's query patterns include ordering and filtering on additional columns (`applied_at`, `status`, `created_at`), which means Postgres must do in-memory sorts after the index lookup. As the user base grows, these become bottlenecks.

## Existing Index Coverage

| Table | Existing Indexes | Gap |
|-------|-----------------|-----|
| `resume_versions` | `(user_id, resume_id, created_at DESC)` | Already well-covered |
| `job_applications` | `(user_id)` only | Missing `applied_at` ordering, `status` filtering |
| `cover_letters` | `(user_id)` only | Missing `created_at` ordering |
| `tailor_history` | None (no dedicated index) | Missing `user_id + created_at` for timeline queries |
| `notifications` | `(user_id, is_read)` | Missing `created_at` ordering for sorted reads |

## Query Patterns Driving Index Design

1. **job_applications**: `WHERE user_id = ? ORDER BY applied_at DESC` (main list), `WHERE user_id = ? AND status = ?` (filtered views), `WHERE remind_at <= ? OR status = 'saved'` (pending reminders)
2. **cover_letters**: `WHERE user_id = ? ORDER BY created_at DESC` (list view)
3. **tailor_history**: `WHERE user_id = ? ORDER BY created_at DESC LIMIT 50` (activity timeline), `WHERE user_id = ? SELECT count(*)` (milestones)
4. **notifications**: `WHERE user_id = ? AND is_read = false ORDER BY created_at DESC` (unread badge + list)

## New Indexes

```text
1. idx_job_applications_user_applied
   ON job_applications (user_id, applied_at DESC)
   -- Covers the primary list query with sort

2. idx_job_applications_user_status
   ON job_applications (user_id, status)
   -- Covers filtered views by status

3. idx_cover_letters_user_created
   ON cover_letters (user_id, created_at DESC)
   -- Covers the sorted list query

4. idx_tailor_history_user_created
   ON tailor_history (user_id, created_at DESC)
   -- Covers timeline + activity streak queries

5. idx_notifications_user_created
   ON notifications (user_id, created_at DESC)
   -- Covers the sorted notification list
```

## Technical Details

| Item | Detail |
|------|--------|
| Tables affected | `job_applications`, `cover_letters`, `tailor_history`, `notifications` |
| Migration | One SQL file with 5 `CREATE INDEX IF NOT EXISTS` statements |
| Code changes | None -- queries automatically use the new indexes |
| Risk | Zero -- additive indexes only, no schema changes |
| `resume_versions` | Already optimized with existing composite index, skipped |

## What This Does NOT Change

- No application code modified
- No RLS policies affected
- No table schemas altered
- Existing indexes remain untouched

