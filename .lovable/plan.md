

## Fix: Stop Dashboard from Auto-Deducting Credits on Every Visit

### Problem

The dashboard's auto-score effect (line 148-178 in `DashboardPage.tsx`) calls `scoreResume()` -- the user-facing function that deducts AI credits -- for every resume without a cached score. Since the cache is an in-memory `Map` that resets on page reload, **every visit to the dashboard consumes 1 credit per resume** (5 resumes = 5 credits gone instantly).

### Solution

Replace `scoreResume` with `backgroundScore` on the dashboard. The `backgroundScore` function already exists and does NOT deduct credits -- it silently scores and caches. Credit deduction should only happen when a user explicitly taps "Re-score" or triggers an AI action.

### Changes

**File: `src/pages/DashboardPage.tsx`**

1. Import `backgroundScore` instead of using `scoreResume` for the auto-score effect
2. Rewrite the `useEffect` (lines 148-178) to use `backgroundScore` for automatic scoring
3. Keep `scoreResume` available only for explicit user actions (if any exist on this page)

```typescript
// Change the auto-score effect to use backgroundScore (no credit cost)
useEffect(() => {
  if (!resumes || resumes.length === 0) return;
  let cancelled = false;

  const scoreNext = async () => {
    for (const resume of resumes) {
      if (cancelled) break;
      await new Promise<void>(r =>
        'requestIdleCallback' in window
          ? (window as any).requestIdleCallback(r)
          : setTimeout(r, 50)
      );
      if (cancelled) break;
      const cached = getCachedScore(resume.id, resume.updated_at);
      if (cached) {
        setHealthScores(prev => ({ ...prev, [resume.id]: cached }));
        continue;
      }
      // Use backgroundScore (no credit deduction) instead of scoreResume
      const resumeData = dbToResumeData(resume);
      await backgroundScore(resume.id, resumeData, resume.updated_at);
      const newCached = getCachedScore(resume.id, resume.updated_at);
      if (newCached && !cancelled) {
        setHealthScores(prev => ({ ...prev, [resume.id]: newCached }));
      }
    }
  };

  const timer = setTimeout(scoreNext, 1000);
  return () => { cancelled = true; clearTimeout(timer); };
}, [resumes, getCachedScore]);
```

**File: `src/hooks/useResumeScore.ts`** (minor)

- Ensure `backgroundScore` does NOT call `incrementUsage` (already correct)
- No changes needed here, just confirming the function is credit-free

### What This Fixes

- Dashboard visits no longer consume credits
- Background ATS scores still appear on resume cards (scored silently)
- Credits are only deducted when users explicitly trigger AI actions (enhance, tailor, manual re-score, etc.)
- The "Today's Activity" log stops filling with automatic ATS Score entries

