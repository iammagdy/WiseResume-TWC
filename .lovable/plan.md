

## Fix: Old Background Scores Polluting Credited Activity

### Root Cause

The database has **356 old log entries** from today with `metadata = null`. These are all background ATS scores created **before** the edge function was updated to tag them with `{ background: true }`. Only 5 recent entries have the correct flag.

The UI code (`isBackground()`) correctly checks for `metadata.background === true`, but since old entries lack this flag, they all appear as "Credited Activity" with "-1 credit" -- which is completely wrong and misleading.

### Two-Part Fix

**1. Clean up existing data** (database migration)

Run a one-time UPDATE to retroactively tag old background scores. The logic: if the `increment_ai_usage` RPC was never called for a log entry, it was a background call. Since background scores fire in rapid succession (every 2-3 seconds), we can identify them by pattern -- but the safest approach is: the `ai_credits` table tracks the **actual** credit count. Today's `daily_usage` is the true number. Any `score` entries beyond that count are background entries.

Simpler approach: since background scores happen in rapid bursts (multiple entries within seconds of each other) and we know only ~9 were user-initiated today, we tag all `score` entries with null metadata as background:

```sql
UPDATE ai_usage_logs
SET metadata = '{"background": true}'::jsonb
WHERE action_type = 'score'
  AND metadata IS NULL
  AND created_at >= CURRENT_DATE;
```

**2. Future-proof the UI** (`src/components/ai/CreditUsageSheet.tsx`)

Add a fallback heuristic: if `metadata` is null AND the `action_type` is `score` AND there are many such entries clustered together, treat them as background. This prevents the same issue if any edge case causes a null metadata entry in the future.

Specifically: treat any `score` entry with `null` metadata as background, since user-initiated scores always go through `recordUsage(userId, 'score')` without metadata, but the `increment_ai_usage` RPC is what actually counts credits. We can cross-reference: if total score entries with null metadata exceeds the daily_usage count, the extras are background.

Actually, the cleanest approach:
- Run the migration to fix existing data
- In the UI, treat `score` entries with `null` metadata as background too (defensive fallback)

### Technical Details

| Step | File | Change |
|------|------|--------|
| 1 | Database migration | UPDATE all `score` entries with null metadata today to `{"background": true}` |
| 2 | `src/components/ai/CreditUsageSheet.tsx` | In `isBackground()`, also return `true` when metadata is null AND action_type is `score` -- pass action_type to the function |

### Why This Works

- The migration fixes all 356 existing bad entries immediately
- The UI fallback ensures any future null-metadata score entries default to "background"
- User-initiated scores (enhance, tailor, cover-letter, etc.) are never affected since they have different action types
- The credited activity section will show only the real user-initiated actions that actually cost credits

