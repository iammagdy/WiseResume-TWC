

## Fix: Editor Page Infinite Loading -- Root Cause Resolution

### Root Causes Found (via live reproduction in browser tool)

Three issues work together to create the infinite loading:

1. **AppShell uses `key={location.pathname}`** which forces React to fully unmount and remount the entire page component tree on every navigation. When going from `/dashboard` to `/editor`, the EditorPage is destroyed and recreated, re-triggering the Suspense lazy load and resetting all component state.

2. **`useResumeStoreHydration()` can get stuck returning `false`**. It uses `useSyncExternalStore` with a server snapshot of `() => false`. If the Zustand persist hydration completes before the component subscribes, the listener never fires and the component never learns hydration finished. This blocks the guard at line 445: `if (!storeHydrated) return <EditorSkeleton />`.

3. **The safety timeout depends on `storeHydrated`**. Since `storeHydrated` is stuck at `false`, the timeout effect returns early and never starts its 10-second countdown. Result: skeleton shows forever.

### Fix (3 files)

**File 1: `src/components/layout/AppShell.tsx`**
- Remove `key={location.pathname}` from the outlet wrapper div
- This prevents unnecessary unmount/remount of pages during navigation
- Pages will now properly transition without losing state

**File 2: `src/store/resumeStore.ts`**
- Change `useResumeStoreHydration` to directly read `hasHydrated` using a simple `useState` + `useEffect` pattern instead of `useSyncExternalStore`
- This eliminates the race condition where `useSyncExternalStore` misses the hydration event

**File 3: `src/pages/EditorPage.tsx`**
- Make the safety timeout independent of `storeHydrated` -- if stuck loading for 8 seconds regardless of hydration state, redirect to dashboard
- Add a fallback: if `storeHydrated` is false for more than 2 seconds, treat it as hydrated (the store definitely hydrated by then since localStorage is synchronous)

### Technical Details

**AppShell.tsx change (line 30):**
```text
Before: <div key={location.pathname} className="...">
After:  <div className="...">
```

**resumeStore.ts -- replace `useResumeStoreHydration` (bottom of file):**
```ts
export const useResumeStoreHydration = () => {
  const [hydrated, setHydrated] = useState(getResumeStoreHasHydrated);
  useEffect(() => {
    if (hydrated) return;
    // If already hydrated, set immediately
    if (getResumeStoreHasHydrated()) {
      setHydrated(true);
      return;
    }
    // Otherwise subscribe
    const unsub = subscribeToHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);
  return hydrated;
};
```

**EditorPage.tsx -- make timeout unconditional:**
```ts
// Safety timeout: if no resume after 8s, bail out (no storeHydrated dependency)
useEffect(() => {
  if (currentResume) return;
  const timer = setTimeout(() => {
    if (!useResumeStore.getState().currentResume) {
      useResumeStore.getState().setCurrentResumeId(null);
      toast.error('Resume could not be loaded.');
      navigate('/dashboard', { replace: true });
    }
  }, 8000);
  return () => clearTimeout(timer);
}, [currentResume, navigate]);
```

### Why This Works

- Removing `key={location.pathname}` stops the destructive remount cycle
- The new hydration hook reliably detects hydration even if it completed before mount
- The unconditional timeout ensures the app NEVER gets permanently stuck -- worst case, it redirects after 8 seconds
- No new dependencies needed

