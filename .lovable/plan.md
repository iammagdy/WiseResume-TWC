

# Fix: Auth Session Flipping on Theme Change

## Root Cause

You have two separate accounts in the system:
- **Google**: magdyysaber@gmail.com (user `31fe76bb`)
- **Email**: magdy.saber@outlook.com (user `94c8feb3`)

Both sessions have active tokens. The app's auth listener (`onAuthStateChange`) fires on every token refresh event -- and when the theme toggle triggers a DOM change and re-render, the listener can receive a refresh event from the OTHER account's session, causing the displayed profile to suddenly switch.

The custom session cache (`sb-auth-session-cache`) makes this worse: it can hold one user's session while the real auth storage holds the other's.

## Solution

### 1. Lock the session to one user (`AuthContext.tsx`)

Once the initial session is resolved, store the current user's ID. If `onAuthStateChange` fires with a DIFFERENT user ID (from a stale second session), ignore it instead of updating state. Only accept events for the same user, or explicit SIGNED_IN / SIGNED_OUT events.

```
Changes to AuthContext.tsx:
- Track the active user ID in a ref
- In the onAuthStateChange callback, check the event type:
  - SIGNED_IN: always accept (user explicitly signed in)
  - SIGNED_OUT: always accept (clear state)
  - TOKEN_REFRESHED: only accept if the user ID matches the current active user
  - INITIAL_SESSION: always accept
- This prevents a stale second session from hijacking the UI
```

### 2. Clear ALL session artifacts on sign-out (`AuthContext.tsx`)

When signing out, explicitly clear both the custom cache AND invalidate any stale sessions:

```
const signOut = async () => {
  localStorage.removeItem(SESSION_CACHE_KEY);
  activeUserIdRef.current = null;
  await supabase.auth.signOut({ scope: 'local' });
  setState({ user: null, session: null, loading: false });
};
```

### 3. Prevent theme toggle from cascading unnecessary re-renders (`ThemeToggle.tsx`)

The ripple overlay animation and class changes on `document.documentElement` trigger the MutationObserver in `useStatusBarThemeSync`, which updates state, which re-renders the entire page. While the auth fix above is the real solution, we should also make the theme toggle more stable:

- Wrap the theme state update in `startTransition` so it doesn't interrupt critical renders
- This is a minor optimization, not the root fix

## Files to Modify

1. **`src/contexts/AuthContext.tsx`** -- Main fix: add user ID tracking ref, filter `onAuthStateChange` events by user ID, clear cache on sign-out
2. **`src/components/settings/ThemeToggle.tsx`** -- Minor: no functional change needed after the auth fix

## What This Fixes

- Toggling the theme will no longer cause the profile/account to switch
- Signing out properly clears all cached session data
- Token refresh events from a stale second session are ignored
- The app stays locked to whichever account the user explicitly signed into

