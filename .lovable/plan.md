

## Fix: Editor Skeleton Stuck / Premature Redirect

### Root Cause (Refined)

The previous fix introduced a race condition between two async operations:

1. **TanStack Query** resolves `resumeFromDb` and sets `isValidating = false`
2. **useEffect** hydrates `currentResume` from `resumeFromDb`

These happen in separate render cycles. Between them, the guard sees `!currentResume && !isValidating` and redirects to `/dashboard` before the hydration effect runs.

### Fix: Single change in EditorPage.tsx guard logic

Replace the current guard (lines 428-447) with a version that accounts for all states:

```ts
// Resume guard -- wait for DB fetch AND hydration before redirecting
if (!currentResume) {
  // If we have an ID, wait for the query to finish AND hydration to complete
  if (currentResumeId && (isValidating || resumeFromDb)) {
    return (
      <div className="flex-1 flex flex-col animate-pulse">
        <div className="px-4 py-3 border-b border-border">
          <div className="h-2 w-full bg-muted rounded" />
        </div>
        <div className="mt-3 px-4 flex gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-10 w-20 bg-muted rounded flex-shrink-0" />
          ))}
        </div>
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }
  return <Navigate to="/dashboard" replace />;
}
```

The key change: `isValidating || resumeFromDb` instead of just `isValidating`. This means:
- While query is loading (`isValidating = true`) -- show skeleton
- When query resolved but effect hasn't hydrated yet (`resumeFromDb` exists but `currentResume` is still null) -- still show skeleton
- When query failed/no data and loading is done -- redirect to dashboard

This is a single line change in the condition at line 430.

### Technical Details

**File:** `src/pages/EditorPage.tsx`
**Line 430:** Change `if (currentResumeId && isValidating)` to `if (currentResumeId && (isValidating || resumeFromDb))`

No new files, no new dependencies.
