

## Fix "Invalid time value" Crash in CreditUsageSheet

### Root Cause

Line 118 of `src/components/ai/CreditUsageSheet.tsx` calls `format(new Date(item.time), 'h:mm a')` without validating that `item.time` is a valid date. Some `ai_usage_logs` rows have null or malformed `created_at` values, causing `new Date(null)` which produces an "Invalid Date" object and crashes `date-fns`'s `format()`.

### Fix

**File: `src/components/ai/CreditUsageSheet.tsx`**

1. Add a safe date formatter that returns a fallback string when the date is invalid:

```typescript
// inside the map callback (line 59), filter out entries with no created_at
return (data ?? [])
  .filter((log) => log.created_at)
  .map((log) => ({
    type: log.action_type,
    label: CATEGORY_LABELS[log.action_type] || log.action_type,
    time: log.created_at,
  }));
```

2. Wrap the `format()` call on line 118 with a try-catch or validity check:

```typescript
{(() => {
  try {
    const d = new Date(item.time);
    return isNaN(d.getTime()) ? '--:--' : format(d, 'h:mm a');
  } catch {
    return '--:--';
  }
})()}
```

This two-layer defense (filter nulls + guard invalid dates) prevents the crash entirely.
