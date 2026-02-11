

# Fix: Bottom Tab Bar Not Visible

## What's Happening

The app IS loading now (the previous crash fix worked), but the navigation chain redirects you:
1. `/editor` has no resume loaded, so it redirects to `/dashboard`
2. `/dashboard` has no authenticated user, so it redirects to `/auth`
3. `/auth` is rendered OUTSIDE the `AppShell` component (line 102 in `App.tsx`), so there is no bottom tab bar

## Fix

### File: `src/App.tsx`

Move the `/auth` route inside the `AppShell` layout so the bottom tab bar is visible even on the auth page. This lets users navigate to other pages (like Upload or Settings) without being stuck.

Change:
```text
BEFORE:
  <Route path="/auth" element={...}><AuthPage /></Route>   // outside AppShell
  <Route element={<AppShell />}>
    ...
  </Route>

AFTER:
  <Route element={<AppShell />}>
    <Route path="/auth" element={...}><AuthPage /></Route>  // inside AppShell
    ...
  </Route>
```

### File: `src/components/layout/AppShell.tsx`

Add `/auth` to `TAB_ROUTES` so the bottom bar is shown on the auth page:

```text
BEFORE: const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview'];
AFTER:  const TAB_ROUTES = ['/dashboard', '/upload', '/settings', '/interview', '/auth'];
```

### File: `src/pages/DashboardPage.tsx`

Remove the automatic redirect to `/auth` when not authenticated (lines 90-94). Instead, let the dashboard render for guests too -- it already has guest-friendly content. Users can sign in via the profile avatar or settings.

```text
BEFORE (lines 90-94):
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

AFTER:
  // Remove this redirect entirely - guests can use the dashboard
```

## Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Move `/auth` route inside `AppShell` |
| `src/components/layout/AppShell.tsx` | Add `/auth` to `TAB_ROUTES` |
| `src/pages/DashboardPage.tsx` | Remove forced redirect to `/auth` for guests |

