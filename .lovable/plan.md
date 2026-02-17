

## Clean Reset: Wipe Today's Activity and Reset Credits

### What's Happening

The database data is actually correctly tagged (all 362 ATS Score entries have `background: true` metadata), and the UI code has the right logic to separate them. The stale entries you're seeing are likely from a cached version of the component before our latest fix was deployed.

Rather than debugging the cache, we'll do a full clean reset as you requested.

### Steps

**1. Database cleanup** (two SQL statements)

- Delete ALL of today's `ai_usage_logs` entries to wipe the activity history clean
- Reset `ai_credits` to `daily_usage = 0` and `total_usage = 0` so the counter shows 0/20

**2. Force UI refresh**

- Add `refetchOnMount: 'always'` to the activity query in `CreditUsageSheet.tsx` so it always fetches fresh data when opened
- This ensures the sheet never shows stale cached data

### Technical Details

| Step | Target | Action |
|------|--------|--------|
| 1 | `ai_usage_logs` table | `DELETE FROM ai_usage_logs WHERE created_at >= CURRENT_DATE` |
| 2 | `ai_credits` table | `UPDATE ai_credits SET daily_usage = 0, total_usage = 0, updated_at = now()` |
| 3 | `CreditUsageSheet.tsx` | Add `refetchOnMount: 'always'` and `staleTime: 0` to the activity query |

### Result

- Credit ring: **0 / 20**
- Credited Activity: **empty** ("No credited AI actions yet today")
- Background Activity: **hidden** (no entries)
- Lifetime usage: **0 credits**
- Every new AI action you take will correctly appear in the right section going forward

