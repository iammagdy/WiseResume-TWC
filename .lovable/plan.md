

## Fix: Editor Page Infinite Loading -- Complete Rewrite of Guard Logic

### Problem Diagnosis

After thoroughly analyzing the 868-line `EditorPage.tsx`, the root cause is **six competing `useEffect` hooks** that manage navigation guards and data loading. They run in different render cycles and create race conditions that no single-line fix can resolve:

1. **Line 94**: Hydrate `currentResume` from DB
2. **Line 100**: Validate ownership
3. **Line 134**: Loading timeout detection
4. **Line 147**: Handle loading timeout
5. **Line 160**: Early redirect if no resume ID
6. **Line 190**: Handle query completion without data

These effects fight each other -- one redirects while another is still loading, or the hydration effect hasn't fired yet when a guard checks state. Every previous fix addressed one edge case but broke another.

### Solution: Replace All Guard Effects with a Single Deterministic Flow

The fix replaces all 6 guard-related `useEffect` hooks with:

1. **One inline guard block** (synchronous, runs every render) -- no timing issues
2. **One hydration effect** (the only async side-effect needed)
3. **One safety timeout** (catches truly stuck states)

### Detailed Changes (EditorPage.tsx only)

**Step 1: Remove these useEffect blocks entirely:**
- Lines 100-108 (ownership validation -- move to inline guard)
- Lines 134-144 (loading timeout detection)
- Lines 147-156 (handle loading timeout)
- Lines 160-165 (early redirect)
- Lines 190-198 (query completion redirect)
- Remove `loadingTimeout` state variable (line 131)

**Step 2: Rewrite the hydration effect (lines 94-98) to be robust:**

```ts
// Single hydration effect: sync DB data into Zustand store
useEffect(() => {
  if (!resumeFromDb || !currentResumeId) return;

  // Ownership check
  if (user && resumeFromDb.user_id !== user.id) {
    setCurrentResumeId(null);
    toast.error('Access denied.');
    navigate('/dashboard', { replace: true });
    return;
  }

  // Hydrate store if needed
  if (!currentResume) {
    useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
  }
}, [resumeFromDb, currentResume, currentResumeId, user]);
```

**Step 3: Add one safety-net timeout effect:**

```ts
// Safety timeout: if stuck loading for 10s, bail out
useEffect(() => {
  if (currentResume || !currentResumeId || !storeHydrated) return;

  const timer = setTimeout(() => {
    setCurrentResumeId(null);
    toast.error('Resume could not be loaded.');
    navigate('/dashboard', { replace: true });
  }, 10000);

  return () => clearTimeout(timer);
}, [currentResume, currentResumeId, storeHydrated]);
```

**Step 4: Replace the guard block (lines 472-558) with a simple, linear flow:**

```ts
// === GUARDS (all inline, no effects) ===

// 1. Auth loading
if (authLoading) {
  return <EditorSkeleton />;
}

// 2. No user
if (!user) {
  return <Navigate to="/auth" replace />;
}

// 3. Store not hydrated yet
if (!storeHydrated) {
  return <EditorSkeleton />;
}

// 4. No resume selected at all
if (!currentResumeId && !currentResume) {
  return <Navigate to="/dashboard" replace />;
}

// 5. Have ID but data not loaded yet -- show skeleton
if (!currentResume) {
  return <EditorSkeleton />;
}

// === Past this point, currentResume is guaranteed non-null ===
```

This uses the existing `EditorSkeleton` component from `PageSkeletons.tsx` instead of inline skeleton JSX, keeping the code clean.

**Step 5: Import `EditorSkeleton` at the top:**

```ts
import { EditorSkeleton } from '@/components/layout/PageSkeletons';
```

### Why This Works

```text
User flow: Dashboard -> click resume -> /editor

  storeHydrated?  ---no---> EditorSkeleton
        |
       yes
        |
  authLoading?  ---yes---> EditorSkeleton
        |
        no
        |
  user exists?  ---no---> /auth
        |
       yes
        |
  currentResumeId || currentResume?  ---no---> /dashboard
        |
       yes
        |
  currentResume?  ---no---> EditorSkeleton
        |                   (useEffect hydrates from DB)
       yes                  (timeout after 10s -> /dashboard)
        |
  RENDER EDITOR
```

- **No race conditions**: Guards are checked synchronously on every render
- **No competing effects**: Only 2 effects remain (hydration + timeout)
- **No flash redirects**: Skeleton shows until data is confirmed present or absent
- **Clean timeout**: Single 10s fallback catches all stuck states

### Summary

- **File changed**: `src/pages/EditorPage.tsx` only
- **Lines removed**: ~60 lines (6 useEffect blocks + loadingTimeout state + inline skeleton JSX)
- **Lines added**: ~30 lines (2 effects + simplified guard block + 1 import)
- **Net reduction**: ~30 lines, dramatically simpler logic
- **No new dependencies**

