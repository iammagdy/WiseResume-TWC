
# Fix Sign-Out Audit Gap in DashboardPage

## Problem

The `DashboardPage.tsx` has a sign-out button (inside a popover menu) that calls `supabase.auth.signOut()` directly, bypassing the `useAuth().signOut()` wrapper. This means sign-outs triggered from the Dashboard are **not** recorded in audit logs.

All other sign-out paths (Settings page, Landing page, post-data-deletion) correctly use `useAuth().signOut()`, which already calls `logAudit('auth', 'signed_out')`.

Data deletion is already fully instrumented in `DeleteDataDialog.tsx` -- no changes needed there.

## What Changes

### File: `src/pages/DashboardPage.tsx` (lines 584-588)

Replace the direct `supabase.auth.signOut()` call with the `signOut` function from `useAuth()`:

**Before:**
```typescript
onClick={async () => {
  haptics.warning();
  await supabase.auth.signOut();
  navigate('/');
}}
```

**After:**
```typescript
onClick={async () => {
  haptics.warning();
  await signOut();
  navigate('/');
}}
```

This ensures the Dashboard sign-out goes through the same `AuthContext.signOut()` path that logs the audit entry, resets internal refs, and clears state -- matching every other sign-out trigger in the app.

If `signOut` is not already destructured from `useAuth()` in this component, that destructuring will also be added.

**One file, one line changed.** No new dependencies, no new audit calls needed -- the existing `logAudit('auth', 'signed_out')` in `AuthContext` covers it once we route through the correct function.
