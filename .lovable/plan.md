

## Fix: Persistent Chunk Loading Errors on Dashboard

### Problem
The dashboard keeps showing the "Connection hiccup" error screen because `lazyWithRetry` only retries once (after 1.5s). When the dev server is rebuilding or the network hiccups, a single retry is not enough. The stale module URL fails again, and the error propagates to the ErrorBoundary where the user must manually tap "Reload".

### Solution
Make `lazyWithRetry` more resilient with two changes:

1. **Retry up to 3 times** with increasing delays (1s, 2s, 4s) instead of a single 1.5s retry
2. **Auto-reload as last resort** -- if all retries fail, force a full page reload (`window.location.reload()`) which gets fresh module URLs from the server. Add a sessionStorage guard to prevent infinite reload loops (only auto-reload once per page load).

### Technical Details

**File: `src/lib/lazyWithRetry.ts`**

Replace the current single-retry logic with a multi-retry loop:

```text
factory() fails
  -> retry 1 (after 1000ms)
  -> retry 2 (after 2000ms)
  -> retry 3 (after 4000ms)
  -> all failed? check sessionStorage flag
     -> flag not set: set flag, window.location.reload()
     -> flag already set: reject (shows ErrorBoundary as fallback)
```

The sessionStorage key (e.g. `wr-chunk-reload`) prevents infinite reload loops. It gets cleared on successful page loads via a small cleanup in the same file.

This means users will almost never see the "Connection hiccup" screen -- the page will silently retry and auto-recover. The ErrorBoundary remains as a last-resort safety net.

