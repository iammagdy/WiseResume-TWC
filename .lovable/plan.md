

# Fix Transient "Failed to Fetch" Errors on Dashboard Navigation and Sign-In

## Root Cause Analysis

Both issues share the same root cause: **transient network failures** on the first request after a period of inactivity (cold connection to the backend). The backend is healthy -- no database errors exist in the logs.

### Issue 1: "Go to Dashboard" Error on First Click

When you tap "Go to Dashboard" from the landing page, React lazy-loads the `DashboardPage` chunk. If the very first HTTP request to the CDN encounters a transient timeout or DNS resolution delay, the chunk load fails and throws a `"Failed to fetch"` error. This error propagates to the `ErrorBoundary`, which displays the error screen. Clicking "Retry" works because the connection is now warm.

**Why `lazyWithRetry` doesn't fully help here:** The retry mechanism has a 1-second delay before retrying, but the error has already been thrown to React's `Suspense` boundary, which bubbles up to the `ErrorBoundary` before the retry can kick in.

### Issue 2: "Failed to fetch data" on Sign-In

When you click Sign In, `supabase.auth.signInWithPassword()` makes an HTTP request to the auth server. If this is the first request after the page has been idle, the same cold-connection issue can cause a transient `"Failed to fetch"` error. The `catch` block in `AuthPage.tsx` handles it with a toast, and the second attempt works because the connection is now established.

---

## Fixes

### 1. Add Retry Logic to Sign-In (`src/pages/AuthPage.tsx`)

Wrap the `signInWithPassword` call in a single automatic retry with a 1.5-second delay. If the first attempt fails with a network error ("Failed to fetch", "NetworkError", "Load failed"), retry once silently before showing an error toast.

```text
signInWithPassword attempt 1
  --> fails with "Failed to fetch"
  --> wait 1.5s, retry automatically
  --> attempt 2 succeeds
  --> user sees "Welcome back!" (never sees the error)
```

This same retry pattern will be applied to the `signUp` call as well.

### 2. Pre-Warm the Backend Connection on Landing Page (`src/pages/Index.tsx`)

Add a lightweight `HEAD` request to the backend URL when the landing page mounts. This establishes the TCP/TLS connection before the user clicks anything, so when they navigate to Dashboard or Sign In, the connection is already warm.

```text
Landing page mounts
  --> HEAD request to backend (fire-and-forget, no error handling)
  --> User clicks "Go to Dashboard" 3 seconds later
  --> Connection is warm, chunk loads instantly
```

### 3. Improve ErrorBoundary Chunk Detection (`src/components/ErrorBoundary.tsx`)

The current `isChunkError` check matches `"Failed to fetch"` too broadly -- it catches chunk load failures AND API fetch failures. Narrow it to only match errors that are clearly chunk-related by checking for `"dynamically imported module"` or `"Loading chunk"` specifically, and handle generic `"Failed to fetch"` separately with an auto-retry before showing the error screen.

### 4. Add Auto-Retry to `useProfile` and `useResumes` Queries

Both hooks currently have `retry: 1` (from the global QueryClient default). Increase to `retry: 2` with exponential backoff specifically for these critical queries, so transient failures during page load are retried silently.

---

## Summary of File Changes

| File | Changes |
|---|---|
| `src/pages/AuthPage.tsx` | Wrap `signInWithPassword` and `signUp` in a retry helper that auto-retries once on network errors before showing toast |
| `src/pages/Index.tsx` | Add a `useEffect` that sends a HEAD request to pre-warm the backend connection on mount |
| `src/components/ErrorBoundary.tsx` | Narrow the `isChunkError` detection; add auto-retry for the error boundary itself (retry rendering once before showing error screen) |
| `src/hooks/useResumes.ts` | Add `retry: 2` and `retryDelay` with exponential backoff to `useResumes` query |
| `src/hooks/useProfile.ts` | Add `retry: 2` and `retryDelay` with exponential backoff to `useProfile` query |

## Technical Details

### Sign-In Retry Helper

```typescript
async function withNetworkRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isNetwork = err instanceof Error &&
      (err.message.includes('Failed to fetch') ||
       err.message.includes('NetworkError') ||
       err.message.includes('Load failed'));
    if (isNetwork && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return withNetworkRetry(fn, retries - 1);
    }
    throw err;
  }
}
```

### Pre-Warm Connection

```typescript
useEffect(() => {
  // Pre-warm backend connection to avoid cold-start failures
  fetch(SUPABASE_URL + '/rest/v1/', {
    method: 'HEAD',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  }).catch(() => {});
}, []);
```

### ErrorBoundary Auto-Retry

Add a `retryCount` to the ErrorBoundary state. On first error, if it looks like a transient fetch error, automatically reset and retry rendering once (with a brief delay) before showing the error screen. This handles the case where a chunk load fails but would succeed on the second attempt.

