

## Fix: Dashboard Stuck on Loading Skeleton Forever

### Root Cause
In `DashboardPage.tsx`, the `checkOnboardingStatus` function (line 86) exits early when `user` is `null` without setting `profileLoaded = true`. Since the loading gate on line 309 requires `profileLoaded` to be `true`, the skeleton stays visible forever if `user` is briefly null during auth resolution.

### Changes

**File: `src/pages/DashboardPage.tsx`**

1. **Fix the early return**: When `user` is null, still set `profileLoaded = true` before returning. The `ProtectedRoute` already handles redirecting unauthenticated users, so we just need to unblock the loading gate.

```typescript
// Line 86: Change from
if (!user) return;
// To
if (!user) {
  setProfileLoaded(true);
  return;
}
```

This single-line fix ensures the dashboard never gets stuck on the skeleton screen regardless of auth timing.

