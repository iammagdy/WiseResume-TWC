

# Speed Up App Startup

The app currently has two sequential slow phases before becoming usable:

1. **Splash animation**: 3.2 seconds of animation before anything happens
2. **Auth + data loading**: Auth session fetch (up to 5s timeout) + resume data fetch, shown as skeletons/spinners

Together these can make startup feel like 5-8 seconds. Here's how to cut that down significantly.

---

## Changes

### 1. Reduce splash duration from 3.2s to 1.8s
**File:** `src/components/AnimatedSplash.tsx`

Cut the auto-dismiss timeout from 3200ms to 1800ms. The animations will still look polished (logo bounce, glow, title fade all complete within 1.5s), and tap-to-dismiss remains available. Reduced-motion stays at 1s.

### 2. Start auth session fetch during splash (parallel loading)
**File:** `src/contexts/AuthContext.tsx`

Currently auth only starts resolving after React mounts. The splash blocks the entire UI for its full duration. Instead, kick off `supabase.auth.getSession()` eagerly at module load time and cache the promise. When the AuthProvider mounts, it consumes the cached result instead of making a fresh call. This overlaps auth resolution with the splash animation -- by the time the splash finishes, auth is likely already resolved.

### 3. Reduce auth safety timeout from 5s to 3s
**File:** `src/contexts/AuthContext.tsx`

The 5-second timeout is conservative. Reduce to 3 seconds so worst-case startup doesn't stack 3.2s splash + 5s auth = 8.2s. With the parallel fetch from step 2, this timeout rarely fires anyway.

### 4. Prefetch the editor route during splash
**File:** `src/components/AnimatedSplash.tsx`

If the user was previously on `/editor` (check `window.location.pathname`), trigger the EditorPage chunk prefetch during the splash so the JS is already cached by the time the skeleton would show.

---

## Technical Details

### Auth prefetch (step 2)
```typescript
// At module level in AuthContext.tsx:
const earlySessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }));

// Inside useEffect, replace the getSession() call:
earlySessionPromise.then(({ data: { session } }) => {
  resolveInitialLoad(session?.user ?? null, session);
});
```

### Editor prefetch (step 4)
```typescript
// Inside AnimatedSplash, after mount:
useEffect(() => {
  if (window.location.pathname === '/editor') {
    import('../pages/EditorPage');
  }
}, []);
```

---

## Expected Impact

| Phase | Before | After |
|-------|--------|-------|
| Splash | 3.2s | 1.8s |
| Auth (sequential) | 0-5s | 0s (runs in parallel) |
| Auth timeout | 5s | 3s |
| Editor chunk load | After auth | During splash |
| **Worst case total** | **~8s** | **~3s** |

No visual changes to the app. The splash still plays its full animation (just shorter), and all skeletons remain as fallbacks.

