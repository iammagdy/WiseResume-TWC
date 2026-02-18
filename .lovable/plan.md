
## Session Expiry / Force-Logout Resilience Audit

### What I Tested (Code Path Analysis)

I traced the complete session lifecycle across the Editor, AI operations, and Preview/Export for two failure modes:
1. **Token expiry / silent SIGNED_OUT** — Supabase SDK emits a `SIGNED_OUT` event when a refresh token expires
2. **Force logout from another device** — Same Supabase event path

---

### What Currently Happens (Step-by-Step)

**The good news — the auth event chain IS wired correctly:**
- `AuthContext` listens to `onAuthStateChange`. On a `SIGNED_OUT` event, it calls `resolveInitialLoad(null, null)` which sets `user = null`.
- `ProtectedRoute` watches `user`. When it becomes `null`, it renders `<Navigate to="/auth" replace />`.
- **The redirect DOES happen** — the user will end up on `/auth`.

**The gap — what the user experiences in those brief seconds before redirect:**

#### Scenario 1: User is mid-typing in the Editor when session expires

1. Supabase SDK silently emits `SIGNED_OUT`
2. `user` becomes `null` in context (React re-render queued)
3. The user's current keystroke lands in the Zustand store (this is safe — persisted to localStorage)
4. The 3-second debounced `saveToCloud()` fires — **fails with a 401/unauthorized error** from Supabase
5. The catch block sees this as a non-network error and shows: *"Auto-save failed — your changes are safe locally and will retry."* (from our last sprint's fix)
6. **No specific "your session expired" message is shown** — the user sees a generic warning and is then silently redirected
7. After redirect to `/auth`, the user logs back in and is taken to `/dashboard` — their unsaved edits from the last 3 seconds are in localStorage but the cloud is behind

**Gap:** The warning message doesn't explain *why* the save failed. The user doesn't know they need to log back in before the redirect happens.

#### Scenario 2: User triggers an AI action (enhance/tailor) when session expires mid-flight

1. `supabase.functions.invoke('enhance-section', ...)` fires with an expired JWT
2. The edge function returns a **401 Unauthorized** or the Supabase client rejects the call
3. In `useAIEnhance`: the error hits the `else` branch → *"Failed to enhance content. Please try again."*
4. In `aiTailor.ts`: the 401 check **does** exist (line 121-122) → throws *"Unauthorized. Please log in again."*
5. But `useAIEnhance` has **no 401 detection** — it shows a generic error instead of "session expired"
6. The redirect to `/auth` happens in the background via `ProtectedRoute`, but the toast message doesn't explain the connection

**Gap:** `useAIEnhance` doesn't detect 401 errors. AI tools show a confusing "try again" message moments before the user is redirected.

#### Scenario 3: User tries to export from Preview page when session is expired

1. PDF export is **fully client-side** (html2canvas + pdf-lib) — no auth needed. PDF export works even with an expired session.
2. However, `share-link` and `combined` (cover letter package) exports require Supabase calls with the user's JWT
3. These will silently fail with 401 errors, showing: *"Failed to generate PDF."* with a Retry button that will also fail
4. No session-expired explanation is given before the retry

**Gap:** Export errors from 401s look identical to PDF generation errors. The user doesn't know to log back in.

#### Scenario 4: User returns to the app after being force-logged-out (APK backgrounded, session killed)

1. App resumes, Supabase tries to refresh the token
2. Token refresh fails → `SIGNED_OUT` event → `user = null`
3. `ProtectedRoute` redirects to `/auth` — this works correctly
4. **After re-login**: user is sent to `/dashboard` via `navigate('/dashboard')`
5. The `currentResume` in Zustand is still hydrated from localStorage — **the user can navigate back to the editor and resume exactly where they left off**
6. The cloud save (via `offlineSyncStore`) will flush any pending changes

**This scenario is actually well-handled already.**

---

### Gap Summary Table

| Scenario | Current Behavior | Gap |
|---------|-----------------|-----|
| Mid-typing session expiry | Redirect works; generic save warning shown | No "session expired" explanation in the toast |
| AI enhance with expired JWT | Generic "failed" error + redirect | No 401 detection in `useAIEnhance` |
| AI tailor with expired JWT | "Unauthorized. Please log in again." message | Good — already handled |
| Export (PDF) with expired JWT | Export still works (client-side) | No issue |
| Export (share-link/combined) with expired JWT | Generic export error + redirect | No 401 detection in export |
| Return from background after token kill | Redirect to auth, localStorage intact | No issue — works correctly |
| Re-login recovery | Redirected to dashboard, can resume editing | No issue — localStorage restores state |

---

### Proposed Fixes (4 Changes)

**All UI-only. No auth provider changes. No backend changes.**

---

#### Fix 1: Detect 401 errors in `saveToCloud` in `EditorPage.tsx`

**Problem:** When the session expires mid-edit, the debounced save fails with a 401. The current catch block treats all non-network errors the same: *"Auto-save failed — your changes are safe locally and will retry."*

**Fix:** Add a 401/unauthorized check in the `saveToCloud` catch block. If the error indicates an expired session, show a more specific, actionable message:

> *"Session expired — your changes are saved locally. Please sign back in."*

Since the `ProtectedRoute` redirect is about to happen anyway, this toast serves as the "warning before the redirect" that mobile users need.

**File:** `src/pages/EditorPage.tsx` — in the `saveToCloud` catch block (around line 272-285)

---

#### Fix 2: Detect 401 errors in `useAIEnhance`

**Problem:** When the session expires mid-AI-enhance, the Supabase functions call returns an error. The catch block only checks for `navigator.onLine` (offline) and timeout errors. A 401 hits the generic `else` branch: *"Failed to enhance content. Please try again."*

**Fix:** Add a check for 401/unauthorized errors before the generic fallback:

```
if (is401Error(error)) {
  toast.error('Session expired — please sign in again to use AI features.');
}
```

**File:** `src/hooks/useAIEnhance.ts` — in the catch block (around line 108-117)

---

#### Fix 3: Add a session-expiry interceptor in `AuthContext`

**Problem:** When `SIGNED_OUT` fires due to token expiry (not a user-initiated sign-out), there is currently no differentiation — the user is silently redirected with no explanation shown at the page level.

**Fix:** In `AuthContext`, differentiate between **user-initiated sign-out** (from `signOut()`) and **forced/expired sign-out** (from `onAuthStateChange` event). When an unexpected `SIGNED_OUT` arrives and there *was* a previous authenticated user, dispatch a custom event (`app:session-expired`) that components can listen to.

Then, in the `ProtectedRoute`, when redirecting to `/auth` with `user = null`, check if this is a session expiry redirect and pass a `?reason=session_expired` query parameter to the auth page.

**File:** `src/contexts/AuthContext.tsx` — add `wasAuthenticated` flag + dispatch custom event on unexpected SIGNED_OUT. Also `src/components/layout/ProtectedRoute.tsx` — pass reason query param. Also `src/pages/AuthPage.tsx` — read `?reason=session_expired` and show a banner/toast.

---

#### Fix 4: Detect 401 errors in the export handler (`PreviewPage.tsx`)

**Problem:** When `share-link` or `combined` exports fail with a 401 (session expired), the error message is identical to a PDF generation failure: *"Failed to generate PDF."* with a Retry button that will also fail.

**Fix:** In the `tryExport` catch block, add a check for 401/unauthorized errors and show a session-specific message instead of the generic PDF error:

> *"Session expired — please sign in again to generate this export."*

**File:** `src/pages/PreviewPage.tsx` — in the `tryExport` catch block (around line 396-415)

---

### Implementation Summary

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/pages/EditorPage.tsx` | Add 401 detection in `saveToCloud` catch; show session-expired toast | Very low |
| 2 | `src/hooks/useAIEnhance.ts` | Add 401 detection before generic error fallback | Very low |
| 3 | `src/contexts/AuthContext.tsx` | Flag unexpected SIGNED_OUT; dispatch `app:session-expired` event | Low |
| 3b | `src/components/layout/ProtectedRoute.tsx` | Pass `?reason=session_expired` on redirect when session was unexpectedly lost | Very low |
| 3c | `src/pages/AuthPage.tsx` | Read `reason` param and show informational banner on the auth page | Very low |
| 4 | `src/pages/PreviewPage.tsx` | Add 401 detection in export catch to show session-specific error | Very low |

### What Is NOT Changed
- No auth provider changes
- No Supabase configuration changes
- No database schema changes
- No edge function changes
- No existing autosave or localStorage persistence logic
- No redirect flows (ProtectedRoute still redirects to `/auth` the same way)
- The data safety guarantee: Zustand localStorage persistence ensures all typed content survives the session expiry and is available immediately after re-login
