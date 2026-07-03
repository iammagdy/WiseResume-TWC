# Performance Audit Report — 2026-05-13

**Symptom:** Every button click shows the loading skeleton ("Still setting up your session…") for 3–6 seconds before rendering content.
**Scope:** Auth initialization flow, route guards, cache behavior
**Method:** Static code trace of `ProtectedRoute.tsx`, `AuthContext.tsx`, `useMe.ts`, `useProfile.ts`

---

## Summary

| Severity | Count |
|----------|------:|
| Critical | 2 |
| High | 2 |
| Medium | 2 |

---

## Critical Issues

### C1 — ProtectedRoute email-verification gate is permanently stuck open

**File:** `src/components/layout/ProtectedRoute.tsx:117`
**Code:**
```tsx
if ((meLoading || !meData?.profile) && !loadingTimedOut) {
  return <LoadingSkeleton />;
}
```

**Root cause:** `useMe.ts` explicitly returns `profile: null` on line 64:
```tsx
return {
  userId: user.id,
  profile: null, // <-- ALWAYS null
  ...
}
```

Therefore `!meData?.profile` is **always `true`** after `meData` resolves. The condition reduces to:
```
(meLoading || true) && !loadingTimedOut  →  !loadingTimedOut
```

This means the loading skeleton **always renders for the full timeout duration** (up to 6 seconds) on every navigation, regardless of whether `useMe` has finished loading. The email verification gate is conceptually broken because it relies on `useMe` for profile data, but `useMe` intentionally does not fetch profile data (it delegates to `useProfile`).

**Impact:** Every authenticated page load is blocked behind a 3–6 second artificial delay.

**Fix options:**
1. **Recommended:** Remove the `!meData?.profile` check entirely from the loading condition. Use `useProfile` for the email verification gate instead of `useMe`.
2. **Alternative:** If email verification is required, change the gate to check `useProfile` data directly.

---

### C2 — ProtectedRoute resets its timeout on every navigation

**File:** `src/components/layout/ProtectedRoute.tsx:42-48`
**Code:**
```tsx
useEffect(() => {
  setLoadingTimedOut(false);
  setShowSlowHint(false);
  const hintTimer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS);      // 3s
  const timeoutTimer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS); // 6s
  return () => { clearTimeout(hintTimer); clearTimeout(timeoutTimer); };
}, [location.key]);
```

**Root cause:** `location.key` changes on every navigation. This effect:
1. Resets `loadingTimedOut` to `false`
2. Restarts both the 3-second "slow hint" and 6-second timeout timers

So after the user waits 6 seconds for the first page to load, clicking any button resets both timers and they wait another 6 seconds.

**Impact:** Navigating between pages in the app is blocked by 3–6 seconds of skeleton on every transition.

**Fix:** Remove `location.key` from the dependency array. The timeout should only run once on initial app load, not on every internal navigation. Use a ref or a mount-only effect:
```tsx
const hasTimedOutOnce = useRef(false);
useEffect(() => {
  if (hasTimedOutOnce.current) return;
  const hintTimer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_MS);
  const timeoutTimer = setTimeout(() => { setLoadingTimedOut(true); hasTimedOutOnce.current = true; }, LOADING_TIMEOUT_MS);
  return () => { clearTimeout(hintTimer); clearTimeout(timeoutTimer); };
}, []); // mount only
```

---

## High Issues

### H1 — Appwrite `account.get()` has no timeout

**File:** `src/contexts/AuthContext.tsx:44-60`
**Code:**
```tsx
useEffect(() => {
  if (!isAppwriteEnabled) { setAppwriteLoading(false); return; }
  (async () => {
    try {
      const user = await appwriteAccount.get();
      setAppwriteUser(user);
    } catch (err) {
      setAppwriteUser(null);
    } finally {
      setAppwriteLoading(false);
    }
  })();
}, []);
```

**Root cause:** `appwriteAccount.get()` is an uncapped network request to `https://fra.cloud.appwrite.io/v1`. If the Appwrite endpoint is slow, unreachable, or the user's connection is poor, this promise never resolves (or resolves after 30+ seconds). There is no timeout, no retry, and no degradation.

**Impact:** If Appwrite is slow, the entire app stays on the initial loading screen indefinitely (or until the browser gives up).

**Fix:** Wrap in a `Promise.race` with a 5-second timeout:
```tsx
const user = await Promise.race([
  appwriteAccount.get(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
]);
```

---

### H2 — AuthContext clears ALL caches on every user ID change

**File:** `src/contexts/AuthContext.tsx:96-109`
**Code:**
```tsx
useEffect(() => {
  const currentId = user?.id ?? null;
  setErrorBoundaryUserId(currentId);
  if (lastSeenUserIdRef.current !== currentId) {
    const previousId = lastSeenUserIdRef.current;
    lastSeenUserIdRef.current = currentId;
    if (previousId !== null || currentId !== null) {
      queryClient.clear();
      clearAllPersistedCaches();
      clearAllCachedScores();
      clearAllEditorSessions();
    }
  }
}, [user?.id, queryClient]);
```

**Root cause:** On every `user?.id` change (including initial auth settling from `null` to a real ID), the effect wipes:
- Entire React Query cache (`queryClient.clear()`)
- All persisted caches
- All cached resume scores
- All editor sessions

This forces **complete re-fetching** of all dashboard data, resumes, health scores, etc. on every page load or auth state transition.

**Impact:** Extra network requests after auth settles; data that was already cached is discarded and re-fetched.

**Fix:** Only clear caches when the user ID changes from one *authenticated* user to another (sign-out → sign-in, or user switch), not on the initial transition from `null` to a value. The current condition `previousId !== null || currentId !== null` triggers on the very first auth resolution.

---

## Medium Issues

### M1 — `useMe` fetches subscriptions + ai_credits on every mount despite staleTime

**File:** `src/hooks/useMe.ts:49-88`

`useMe` has `staleTime: 5 * 60 * 1000` (5 minutes), but `ProtectedRoute` renders it on every page transition. React Query should serve from cache when within stale time, but if the cache was cleared by `AuthContext` (see H2), it refetches.

**Impact:** Extra DB queries on every page load after auth settles.

**Fix:** Decouple the email verification check from `useMe` data. The profile check should use `useProfile` which has its own cache.

---

### M2 — `useProfile` is fetched independently but ProtectedRoute doesn't use it

**File:** `src/hooks/useProfile.ts`

`useProfile` fetches the `profiles` collection with full fields. `DashboardPage.tsx` calls `useProfile(user?.id)` to get profile data. But `ProtectedRoute.tsx` uses `useMe()` which explicitly returns `profile: null`.

This is a design inconsistency: the route guard checks for profile data from a hook that never provides it.

---

## Root Cause Chain

```
User clicks button
    ↓
React Router navigates → location.key changes
    ↓
ProtectedRoute effect resets loadingTimedOut=false, starts 6s timer
    ↓
ProtectedRoute checks (meLoading || !meData?.profile) && !loadingTimedOut
    ↓
!meData?.profile is ALWAYS true (useMe returns profile:null)
    ↓
loadingTimedOut is false (just reset)
    ↓
Renders skeleton for up to 6 seconds
    ↓
After 6s timeout → loadingTimedOut=true → finally renders content
```

**The 6-second delay is artificial — it is not waiting for any actual data to load.** The data (`useMe`, `useAuth`) resolves much faster, but the route guard is stuck because of the always-`null` profile check and the reset-on-navigation timer.

---

## Recommended Fix Priority

1. **C2** (1 line): Change `location.key` → `[]` in the timeout effect so timers don't reset on navigation.
2. **C1** (1 line): Remove `!meData?.profile` from the loading condition, or switch the gate to use `useProfile`.
3. **H1** (5 lines): Add a 5-second timeout to `appwriteAccount.get()`.
4. **H2** (3 lines): Narrow the cache-clear condition to only fire on actual user switches, not initial auth resolution.

Combined effort: ~10 lines of code. Estimated fix time: 5 minutes.
