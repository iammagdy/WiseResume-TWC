

## Fix: Theme Toggle Triggering Auth Session Re-evaluation

### Root Cause

The issue has two interacting parts:

**Part A -- AuthContext re-renders on every token refresh:**
In `AuthContext.tsx`, the `onAuthStateChange` listener calls `setState({ user, session, loading: false })` for every event, including periodic `TOKEN_REFRESHED` events. Even though the user hasn't changed, React sees a new state object (the `session` contains a fresh access token) and triggers a full re-render of the entire component tree. This causes the Settings page to briefly re-evaluate its `user ? (authenticated view) : (guest view)` conditional.

**Part B -- ThemeToggle classList gap:**
The ThemeToggle's `useEffect` does `root.classList.remove('light', 'dark')` followed by `root.classList.add(theme)`. Between these two calls, there's a micro-moment with no theme class, causing CSS variable resolution to break momentarily. This visual disruption makes any coincidental auth re-render more noticeable.

When these two overlap (user clicks theme toggle around the same time as a periodic token refresh), it looks like the theme toggle is "recalling a login session."

---

### Fix 1: Prevent unnecessary re-renders in AuthContext on token refresh

**File: `src/contexts/AuthContext.tsx`**

In the `resolveInitialLoad` function, skip the `setState` call if the user ID hasn't changed and loading is already `false`. This prevents the entire app from re-rendering on routine token refreshes.

Changes:
- Use a functional state update that compares the incoming user ID with the current state's user ID
- Only update `session` in the ref (for API calls) without triggering a React re-render when the user hasn't changed
- Add a `sessionRef` to hold the latest session without causing re-renders
- For `TOKEN_REFRESHED` events specifically: update the cached session and sessionRef, but skip `setState` if user ID matches

```
// Before (causes re-render on every event):
setState({ user, session, loading: false });

// After (skip re-render if user unchanged):
setState(prev => {
  if (prev.user?.id === user?.id && !prev.loading) {
    // Session refreshed but user unchanged -- don't re-render
    return prev;
  }
  return { user, session, loading: false };
});
```

- Still call `cacheSession(user, session)` so the cache stays fresh
- Still update `activeUserIdRef` for the session integrity guard

---

### Fix 2: Atomic theme class swap to eliminate the no-class gap

**File: `src/components/settings/ThemeToggle.tsx`**

Replace the two-step remove-then-add with an atomic swap that never leaves the document without a theme class.

Changes in the `useEffect`:
```
// Before (brief gap with no class):
root.classList.remove('light', 'dark');
root.classList.add(theme);

// After (atomic swap):
const resolved = theme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : theme;
const other = resolved === 'dark' ? 'light' : 'dark';
root.classList.replace(other, resolved) || root.classList.add(resolved);
```

`classList.replace()` is atomic -- the old class is swapped for the new one in a single operation with no gap. The fallback `|| root.classList.add(resolved)` handles the edge case where the old class doesn't exist.

---

### Fix 3: Clean up dead code in ThemeToggle

**File: `src/components/settings/ThemeToggle.tsx`**

Remove the unused `RippleOverlay` component function, `rippleColorMap`, and `createPortal` import that were left behind from the previous ripple removal. This reduces bundle size and prevents confusion.

Remove:
- `import { createPortal } from 'react-dom'` (line 6)
- `rippleColorMap` constant (lines 173-176)
- `RippleOverlay` component function (lines 130-158)

---

### Files Modified

- `src/contexts/AuthContext.tsx` -- skip re-renders on TOKEN_REFRESHED when user hasn't changed
- `src/components/settings/ThemeToggle.tsx` -- atomic class swap, remove dead code

### Why This Works

The combination ensures that (1) routine token refreshes no longer cascade re-renders through the entire app, and (2) theme switches happen atomically without any CSS variable resolution gaps. Together, these eliminate the perceived "login session recall" flash.
