

# Add Performance Index on ai_usage_logs for Rate Limiter Queries

## Problem

Every AI edge function calls `checkRateLimit()`, which runs:

```sql
SELECT * FROM ai_usage_logs
WHERE user_id = ? AND action_type = ? AND created_at >= ?
```

Without a composite index, this does a sequential scan on every AI request. As the table grows, this becomes a bottleneck since rate limiting runs before every single AI call.

## Solution

Create a single composite index covering all three columns in the WHERE clause:

```sql
CREATE INDEX idx_ai_usage_logs_rate_limit
ON public.ai_usage_logs (user_id, action_type, created_at DESC);
```

This is a single migration with no code changes needed. The existing `checkRateLimit` queries will automatically use this index.

## Why This Index Shape

- **Column order matches the query**: `user_id = X AND action_type = Y AND created_at >= Z` -- equality columns first, range column last
- **DESC on created_at**: matches the "recent N seconds" window pattern, allowing Postgres to scan from newest to oldest and stop early
- **Covers the exact query pattern** used by all 18+ edge functions via the shared `rateLimiter.ts`

## Technical Details

| Item | Detail |
|------|--------|
| Table | `ai_usage_logs` |
| Index | `(user_id, action_type, created_at DESC)` |
| Migration | One `CREATE INDEX` statement |
| Code changes | None |
| Risk | Zero -- additive index, no schema change |

