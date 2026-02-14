

## Fix Editor Loading Issue

### Root Cause

The `EditorPage` has two navigation guards (lines 417-424):

```text
if (!user) → redirect to /auth
if (!currentResume) → redirect to /dashboard
```

The problem: `currentResume` is checked from the Zustand store BEFORE the database query (`useResume`) has a chance to load. This means:

1. User navigates to `/editor` (via bottom tab or URL)
2. Zustand restores `currentResumeId` from localStorage, but `currentResume` may be `null` (e.g., if persist data is large and hydration is slow, or if only the ID was set without the full resume data)
3. The guard immediately redirects to `/dashboard` before `useResume` finishes fetching
4. User sees dashboard instead of editor, or sees a brief loading skeleton that disappears

Additionally, the `useResume` query result (`resumeFromDb`) is never used to populate `currentResume` -- it's only used for stale-ID detection. So even if the DB query succeeds, the Zustand state stays null.

### Fix (2 changes in EditorPage.tsx)

**Change 1: Hydrate `currentResume` from the database query**

After the `useResume` query resolves, sync the result into Zustand's `currentResume` if it's currently null. This bridges the gap between persisted IDs and full resume data:

```ts
// After line 89 (useResume call), add:
useEffect(() => {
  if (resumeFromDb && !currentResume && currentResumeId) {
    useResumeStore.getState().setCurrentResume(resumeFromDb);
  }
}, [resumeFromDb, currentResume, currentResumeId]);
```

**Change 2: Show loading state while validating instead of redirecting**

Replace the immediate redirect with a loading check. If `currentResumeId` exists but the data is still loading, show the skeleton instead of redirecting:

```ts
// Replace lines 421-424:
// OLD:
if (!currentResume) {
  return <Navigate to="/dashboard" replace />;
}

// NEW:
if (!currentResume) {
  if (currentResumeId && isValidating) {
    // Data is loading from database, show skeleton
    return (
      <div className="flex-1 flex flex-col animate-pulse">
        <div className="px-4 py-3 border-b border-border">
          <div className="h-2 w-full bg-muted rounded" />
        </div>
        <div className="mt-3 px-4 flex gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-20 bg-muted rounded flex-shrink-0" />)}
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

**Change 3: Remove double bottom padding**

The `AppShell` already adds `pb-20` when `showBottomNav` is true. The `EditorPage` root div also has `pb-20`. Remove the redundant one from EditorPage (line 427):

```ts
// OLD:
<div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20">

// NEW:
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
```

### Summary

These three changes ensure:
- The editor waits for data to load instead of immediately redirecting
- Database-fetched resume data hydrates the Zustand store when persistence fails
- No double bottom padding wastes screen space

No new files. No new dependencies. Only `src/pages/EditorPage.tsx` is modified.
