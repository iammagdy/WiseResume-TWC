

## Lock Down App: Require Sign-In Before Accessing Any Screen

### Overview

Currently, auth guards are scattered across individual pages -- some redirect to `/auth`, some show partial guest content, and a few have no guard at all. This change introduces a single centralized `ProtectedRoute` wrapper that blocks ALL app routes for unauthenticated users, redirecting them to the sign-in page immediately.

### What Changes

**Only 3 routes remain public (no login required):**
- `/` -- Landing page
- `/auth` -- Sign-in / Sign-up page
- `/share/:token` -- Public resume sharing link

**Every other route** requires authentication. Unauthenticated users are instantly redirected to `/auth`.

### Technical Plan

**1. Create `src/components/layout/ProtectedRoute.tsx` (new file)**

A small wrapper component that checks auth state:
- If `loading` is true, render a skeleton/spinner
- If no `user`, redirect to `/auth` with `replace`
- Otherwise, render children via `<Outlet />`

```text
function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
```

**2. Update `src/App.tsx` routing**

Wrap all protected routes inside a parent `<Route element={<ProtectedRoute />}>` so the guard applies universally:

```text
<Routes>
  {/* Public routes */}
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<AppShell><AuthPage /></AppShell>} />
  <Route path="/share/:token" element={<SharePage />} />

  {/* All protected routes */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>
      <Route path="/dashboard" ... />
      <Route path="/editor" ... />
      {/* ... all other app routes ... */}
    </Route>
  </Route>

  <Route path="*" element={<NotFound />} />
</Routes>
```

**3. Clean up per-page auth guards (optional but recommended)**

Remove the now-redundant individual auth checks from these pages since `ProtectedRoute` handles it globally:
- `DashboardPage.tsx` -- remove `if (!authLoading && !user) return <Navigate ...>`
- `ApplicationsPage.tsx` -- remove `if (!user) return <Navigate ...>`
- `EditorPage.tsx` -- remove `if (!user) return <Navigate ...>`
- `ProfilePage.tsx` -- remove `useEffect` redirect
- `CoverLettersPage.tsx`, `CoverLetterNewPage.tsx`, `CoverLetterEditPage.tsx` -- remove guards
- `ResignationLetterNewPage.tsx`, `ResignationLetterEditPage.tsx` -- remove guards
- `CareerPage.tsx`, `JobDetailPage.tsx`, `ApplicationTrackerPage.tsx`, `CoverLetterPage.tsx` -- remove guards
- `SettingsPage.tsx` -- remove guest-mode conditional UI blocks (the "Sign in to..." prompts become unreachable)

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/layout/ProtectedRoute.tsx` | **New** -- centralized auth guard component |
| `src/App.tsx` | Wrap protected routes with `ProtectedRoute`, keep `/`, `/auth`, `/share/:token` public |
| ~12 page files | Remove redundant per-page auth guard code |

### Result

- Unauthenticated users see ONLY the landing page or the sign-in screen
- No app structure, navigation, or content is visible before login
- A single point of control for auth gating (easy to maintain)

