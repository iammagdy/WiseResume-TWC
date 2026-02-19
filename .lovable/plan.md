
# User Journey Audit — Issues Found & Fixes

## Full Journey Traced

The user journey was traced end-to-end across all major flows:

1. Landing page (`/`) → Auth (`/auth`) → Onboarding → Dashboard → Editor → Preview/Export
2. Dashboard → Upload PDF → Import Review → Editor
3. Editor → AI Studio → Interview
4. Dashboard → Portfolio Editor → Public Portfolio
5. Dashboard → AI Studio → Cover Letters / Career / Resignation Letters
6. App lifecycle: session expiry, hardware back button, offline sync

---

## Issues Found

### Issue 1 — Back Navigation Map is Missing Routes (Silent Wrong Navigation)

**File:** `src/lib/navigation.ts`

**Problem:** The `BACK_ROUTES` map is missing entries for:
- `/resignation-letter` (the individual new/edit routes — only `/resignation-letters` list is mapped)
- `/cover-letter/new` → should go to `/cover-letters`
- `/cover-letter/edit` → should go to `/cover-letters`
- `/resignation-letter/new` → should go to `/resignation-letters`
- `/resignation-letter/edit` → should go to `/resignation-letters`
- `/portfolio` back route points to `/profile` but the Portfolio is a primary tab — pressing back there should exit like `/dashboard`

When a user presses the Android hardware back button on any of these routes, they fall through to the default `/dashboard` fallback instead of the correct parent screen.

**Fix:** Add the missing sub-routes and fix `/portfolio` in `EXIT_ROUTES`.

---

### Issue 2 — "Undo" Action on Deleted Resume is a Fake No-Op (UX Deception)

**File:** `src/pages/DashboardPage.tsx` lines 275–283

**Problem:** When a resume is deleted, a toast appears with an "Undo" button. Clicking it shows `toast.info('Undo not available - resume permanently deleted')`. This is a broken UX: a button that does nothing except admit it's useless. This erodes user trust — they were shown an option that was never real.

**Fix:** Remove the fake Undo action from the delete toast entirely. Show a simple confirmation toast without an action button. This is honest and cleaner.

---

### Issue 3 — `OnboardingPage` Has Conflicting Redirect Loops (Two Sources of Truth)

**File:** `src/pages/OnboardingPage.tsx` lines 32–36 and `src/pages/DashboardPage.tsx` lines 106–124

**Problem:** Two independent onboarding systems exist in parallel:
1. `OnboardingPage` checks `localStorage.getItem('wr-onboarding-completed')` and redirects if completed
2. `DashboardPage` checks `supabase profiles.onboarding_completed` and shows an `OnboardingCarousel` overlay

A new user who signs up on one device, completes onboarding, then opens the app on a second device will:
- Have `localStorage` empty on device 2
- Navigate to `/onboarding` (if triggered)
- `OnboardingPage` will NOT redirect because `localStorage` is empty
- They'll see onboarding again

Additionally, the `/onboarding` route is protected (behind `ProtectedRoute`) but `OnboardingPage` uses only `localStorage` for its guard, not the DB — so they are two disconnected systems. The `DashboardPage` already correctly uses the DB for this check with `OnboardingCarousel`. The standalone `OnboardingPage` at `/onboarding` becomes a confusing dead-end.

**Fix:** Add a `useEffect` to `OnboardingPage` that also checks `supabase profiles.onboarding_completed` and redirects if already completed in the DB — making both sources consistent.

---

### Issue 4 — `NotFound` Page Sends Users to `/` Landing Page (Wrong for Authenticated Users)

**File:** `src/pages/NotFound.tsx` line 58

**Problem:** The 404 page has a single "Return to Home" button that calls `navigate("/")`. For an authenticated user who typed a wrong URL or followed a broken link, this sends them to the public landing page — which immediately redirects them back to `/dashboard` since they're logged in. This creates an unnecessary double-redirect and a jarring flash of the landing page.

**Fix:** Use `useAuth()` in `NotFound.tsx` to send authenticated users directly to `/dashboard` and unauthenticated users to `/`.

---

### Issue 5 — Editor `handleBack` Always Navigates to `/dashboard` (Ignores Navigation Map)

**File:** `src/pages/EditorPage.tsx` line 635–637

**Problem:**
```typescript
const handleBack = useCallback(() => {
  navigate('/dashboard');
}, [navigate]);
```

The header back button in the Editor hardcodes `/dashboard` as the destination, completely bypassing the centralized `getBackRoute()` from `src/lib/navigation.ts`. This means:
- If a user navigated from `/resume/:id` detail page into the editor, pressing back takes them to `/dashboard` instead of the detail page
- The unsaved changes guard calls `unsavedGuard.interceptNavigate('/dashboard')` with the same hardcoded path

While `/dashboard` is technically the correct default back route for `/editor`, the problem is that this bypasses the guard's `interceptNavigate` call — meaning the `UnsavedChangesDialog` appears showing the path `/dashboard`, which is correct but accidental rather than intentional.

The actual bug is that the `handleBack` in the header doesn't go through `unsavedGuard.interceptNavigate` — it calls `navigate` directly. So if there are unsaved changes, clicking the back arrow in the header bypasses the dialog entirely and navigates straight to `/dashboard` without warning.

**Fix:** Route the header back button through `unsavedGuard.interceptNavigate('/dashboard')` so the dialog always appears when there are unsaved changes, regardless of whether the user uses the header button or the hardware back button.

---

### Issue 6 — `PreviewPage` Back Button Uses `navigate('/editor')` Without Unsaved Changes Check

**File:** `src/pages/PreviewPage.tsx`

**Problem:** The Preview page uses `navigate('/editor')` for its back button. If a user made changes before entering preview and the auto-save debounce hasn't fired yet, navigating back to the editor from preview and then immediately back to dashboard bypasses any unsaved changes warning.

This is a lower-priority issue since PreviewPage is read-only, but it means going Preview → Editor → Dashboard with dirty state can lose changes in edge cases.

**Fix:** Verify this is safe — PreviewPage is read-only so no new changes happen there. The real fix is ensuring the editor's `saveToCloud` fires when the editor mounts (via the existing `app:save-draft` mechanism). No code change needed here, but noting for completeness.

---

## Summary of Changes

| File | Issue | Change |
|---|---|---|
| `src/lib/navigation.ts` | #1 Missing back routes | Add `/cover-letter/new`, `/cover-letter/edit`, `/resignation-letter/new`, `/resignation-letter/edit` routes; add `/portfolio` to `EXIT_ROUTES` |
| `src/pages/DashboardPage.tsx` | #2 Fake Undo toast | Remove `action` from delete success toast — show plain confirmation |
| `src/pages/OnboardingPage.tsx` | #3 Conflicting onboarding sources | Add DB check alongside `localStorage` check to prevent re-showing onboarding on second devices |
| `src/pages/NotFound.tsx` | #4 Wrong destination for authenticated users | Use `useAuth()` to send authenticated users to `/dashboard` |
| `src/pages/EditorPage.tsx` | #5 Back button bypasses unsaved changes guard | Route header back button through `unsavedGuard.interceptNavigate` |

No database changes. No edge functions. No new dependencies.

---

## Technical Details

### Fix 1 — `src/lib/navigation.ts`

```typescript
const BACK_ROUTES: Record<string, string> = {
  // ... existing routes ...
  '/cover-letter/new': '/cover-letters',
  '/cover-letter/edit': '/cover-letters',
  '/resignation-letter/new': '/resignation-letters',
  '/resignation-letter/edit': '/resignation-letters',
  // Fix: portfolio back maps to dashboard (it's a primary tab, not a sub-page of /profile)
  '/portfolio': '/dashboard',
};

// Fix: portfolio is a primary tab — back should exit, not navigate
export const EXIT_ROUTES = ['/', '/dashboard', '/portfolio'];
```

### Fix 2 — `src/pages/DashboardPage.tsx`

Remove the fake Undo action:
```typescript
// BEFORE (broken UX)
toast.success(`"${resumeToDelete?.title}" deleted`, {
  action: { label: 'Undo', onClick: () => toast.info('Undo not available...') },
  duration: 5000,
});

// AFTER (honest)
toast.success(`"${resumeToDelete?.title}" deleted`, { duration: 3000 });
```

### Fix 3 — `src/pages/OnboardingPage.tsx`

Add a DB check to sync both systems:
```typescript
useEffect(() => {
  // Check localStorage first (fast path)
  if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
    navigate('/dashboard', { replace: true });
    return;
  }
  // Also check DB for cross-device consistency
  if (!user) return;
  supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()
    .then(({ data }) => {
      if (data?.onboarding_completed) {
        localStorage.setItem(ONBOARDING_KEY, 'true'); // sync localStorage
        navigate('/dashboard', { replace: true });
      }
    });
}, [navigate, user]);
```

This requires adding `useAuth` import.

### Fix 4 — `src/pages/NotFound.tsx`

```typescript
const { isAuthenticated } = useAuth();
// In the button onClick:
onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
// Button label change:
{isAuthenticated ? 'Go to Dashboard' : 'Return to Home'}
```

### Fix 5 — `src/pages/EditorPage.tsx`

Change the header back button handler:
```typescript
// BEFORE — bypasses unsaved changes dialog
const handleBack = useCallback(() => {
  navigate('/dashboard');
}, [navigate]);

// AFTER — routes through the guard so UnsavedChangesDialog appears
const handleBack = useCallback(() => {
  unsavedGuard.interceptNavigate('/dashboard');
}, [unsavedGuard]);
```

Note: `unsavedGuard` is already declared later in the file (line 450). The `handleBack` declaration at line 635 occurs after `unsavedGuard` is set up, so this reference is safe. The existing hardware back button guard already correctly uses `unsavedGuard.interceptNavigate` — this just brings the header button into parity.
