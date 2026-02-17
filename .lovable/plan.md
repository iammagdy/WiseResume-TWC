

## Fix AI Credits Not Updating + Clean Up Usage Breakdown

### Root Cause Analysis

**Bug 1 - Credits not deducting:** The `ai_credits` table has TWO conflicting unique constraints: `UNIQUE(user_id)` AND `UNIQUE(user_id, usage_date)`. The `increment_ai_usage` RPC tries `ON CONFLICT (user_id, usage_date)`, but since `UNIQUE(user_id)` gets violated first on a new day, the insert fails silently. The last successful update was Feb 14 -- every call since has been failing.

**Bug 2 - Fake-looking breakdown numbers:** The "341 ATS Score credits" shown in the breakdown are real `ai_usage_logs` entries, but they were inserted by edge functions (server-side rate limiter) for EVERY AI call -- including background scoring that happens automatically without user action. These don't represent actual credit deductions. The breakdown should only reflect user-initiated credit usage.

### Changes

**1. Database Migration: Fix the RPC and constraints**

- Drop the conflicting `UNIQUE(user_id)` constraint (keep `UNIQUE(user_id, usage_date)`)
- Rewrite `increment_ai_usage` RPC to handle daily reset in a single upsert:
  - If same day: increment `daily_usage` and `total_usage`
  - If new day: reset `daily_usage` to 1, increment `total_usage`, update `usage_date`
  - Uses `ON CONFLICT (user_id)` after switching to single-row-per-user model

Actually, the cleaner approach: keep one row per user (keep `UNIQUE(user_id)`, drop `UNIQUE(user_id, usage_date)`), and fix the RPC to use `ON CONFLICT (user_id)` with date-aware reset logic.

```sql
-- Drop the (user_id, usage_date) constraint, keep (user_id)
ALTER TABLE ai_credits DROP CONSTRAINT ai_credits_user_id_usage_date_key;

-- Recreate the RPC to use ON CONFLICT (user_id)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
  VALUES (p_user_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id)
  DO UPDATE SET
    daily_usage = CASE
      WHEN ai_credits.usage_date = CURRENT_DATE THEN ai_credits.daily_usage + 1
      ELSE 1
    END,
    total_usage = ai_credits.total_usage + 1,
    usage_date = CURRENT_DATE,
    updated_at = now();
END;
$$;
```

**2. Fix `src/hooks/useAICredits.ts` - Force refetch after mutation**

- Add `await queryClient.invalidateQueries()` with `refetchType: 'all'` in `onSuccess` to ensure the ring updates immediately
- Remove the redundant follow-up SELECT in the mutation (the invalidation handles it)

**3. Fix `src/components/ai/CreditUsageSheet.tsx` - Real breakdown**

- Replace the `ai_usage_logs` query with data from the `ai_credits` table itself for the total count (source of truth)
- For the per-category breakdown, keep the `ai_usage_logs` query but add a `credits_used` column filter or limit results to only logs that correspond to user-initiated credit-consuming actions (not background scoring)
- Add a simple "Recent Activity" list showing the last 10 logged actions with timestamps, giving users a clear history of what used credits

**4. Fix `src/hooks/useResumeScore.ts` - Stop background scoring from logging credits**

- The `backgroundScore` function should NOT call `incrementUsage` (it currently doesn't, which is correct)
- But the edge function's rate limiter inserts into `ai_usage_logs` for every call, inflating the breakdown
- Add a `source` or `is_background` flag to distinguish background vs user-initiated calls, OR filter the breakdown to only count logs from the current day that match the `ai_credits.daily_usage` count

### Summary of Files Changed

| File | Change |
|------|--------|
| Database migration | Fix unique constraint + rewrite RPC |
| `src/hooks/useAICredits.ts` | Simplify mutation, force refetch |
| `src/components/ai/CreditUsageSheet.tsx` | Fix breakdown to use real credit data, add recent activity history |
| `src/hooks/useResumeScore.ts` | Minor: ensure credit toast only fires for user-initiated scores |

### Technical Details

The core fix is the database constraint conflict. Once that's resolved, `increment_ai_usage` will correctly upsert the single row per user with daily reset logic, and `invalidateQueries` will refresh the CreditRing immediately. The breakdown will be redesigned to show proportional category distribution based on the actual `daily_usage` count rather than raw log counts, with a simple scrollable history list for transparency.

