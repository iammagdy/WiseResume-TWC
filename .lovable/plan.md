

# Fix Infinite Loading on All Pages

## Root Cause

In `AuthContext.tsx`, when no cached session exists (or it's expired), the auth `loading` state starts as `true` and waits for `supabase.auth.getSession()` to resolve. Two problems:

1. The `.then()` call has no `.catch()` -- if the network request fails, `loading` stays `true` forever
2. There is no timeout -- if the request hangs on slow mobile networks, the app stays frozen

Since every protected page (Settings, Dashboard, Editor, etc.) checks `if (loading) return <Skeleton />`, a stuck loading state causes infinite skeleton screens across the entire app.

## Fix

### 1. Add error handling and timeout to AuthContext (`src/contexts/AuthContext.tsx`)

- Add `.catch()` to the `getSession()` call that sets `loading: false` (with null user/session) so the page can redirect to auth instead of freezing
- Add a 5-second safety timeout that forces `loading: false` if neither `onAuthStateChange` nor `getSession()` have resolved yet
- Clean up the timeout on unmount or when auth resolves

```text
Before:
  getSession().then(...)   // no catch, no timeout

After:
  getSession().then(...).catch(...)   // handles failures
  setTimeout(() => force loading=false, 5000)  // safety net
```

### 2. Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `.catch()` handler and 5-second safety timeout |

This is a one-file fix. No other changes needed since all pages already handle the `!loading && !user` case by redirecting to `/auth`.

