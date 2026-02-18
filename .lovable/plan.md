
# Mobile Network Resilience Audit: Slow 3G / Offline Testing

## What Was Tested (Analysis of Code Paths)

I traced through all five key surfaces — Auth, Dashboard, Editor (typing + AI), Export — for two network failure modes: **Slow 3G / high latency** and **complete offline**. Here is what I found.

---

## Current State: What's Already Good

| Surface | Behavior | Status |
|---------|----------|--------|
| Editor autosave (offline) | Queued to `offlineSyncStore` → localStorage | Safe |
| Editor offline indicator | `OfflineIndicator` badge + save status bar show "Offline" | Good |
| App-level offline banner | `OfflineBanner` appears in `AppShell` with "You're offline" | Good |
| Dashboard resumes (offline) | `networkMode: 'offlineFirst'`, staleTime 5m, serves cache | Good |
| Tailor slow-request toast | 25s timer shows "This is taking longer than usual. Hang tight…" | Good |
| Enhance slow-request toast | 20s timer shows same message | Good |
| AI fallback toast | BYOK key failure now notifies user (from previous sprint) | Good |
| Auth token refresh | `autoRefreshToken: true` in Supabase client | Good |
| Store persistence | Zustand persist writes to localStorage on every state change | Good |
| Background flush | `useAppLifecycle` + `saveToCloud()` on backgrounding (from previous sprint) | Good |

---

## Issues Found: Specific Gaps in Error Messaging

### Issue 1 — Auth login on slow/offline: generic errors, no network awareness

**File:** `src/pages/AuthPage.tsx` lines 114–162

**What happens today on Slow 3G or offline:**
- `supabase.auth.signInWithPassword()` throws a `Failed to fetch` / network error
- Caught by the outer `catch {}` at line 158, which only shows: `toast.error('An unexpected error occurred.')`
- No retry button. No "check your connection" message. User is stuck.

**On offline specifically:** The Submit button just spins and then shows a useless generic error.

**Fix:** Before calling `signInWithPassword`, check `navigator.onLine`. If offline, show a specific "You're offline — please check your connection and try again" message immediately. In the catch, detect network errors and show a more helpful message with a retry hint.

**Risk:** Very low — only changes error message strings, no business logic.

---

### Issue 2 — Dashboard empty state on first load offline: no message

**File:** `src/pages/DashboardPage.tsx` — `useResumes()` hook is `networkMode: 'offlineFirst'`

**What happens today:**
- On first-ever launch with no cache while offline, `useResumes()` returns `{ data: undefined, isError: true }`.
- The Dashboard falls through to the `<EmptyState>` component which shows "No resumes yet" — the same state as a brand new user.
- There is no indication that the empty state is caused by being offline rather than genuinely having no resumes.

**Fix:** In the Dashboard, if `isError === true` AND `!navigator.onLine` AND `resumes === undefined`, show an inline offline state card instead of the generic empty state.

**Risk:** Very low — additive, no existing logic changes.

---

### Issue 3 — Editor save failure on slow network: silent failure

**File:** `src/pages/EditorPage.tsx` line 282

**What happens today on a slow/flaky network (not fully offline):**
```
// Don't show error toast - OfflineIndicator handles it
```
The comment explains the choice, but there's a gap: the `OfflineIndicator` only shows when `!isOnline` (navigator.onLine is false). On a **slow but technically online** connection where `fetch` times out, `navigator.onLine` stays `true`, but the save fails. The error is swallowed silently with only a `console.error`.

The user sees the save spinner (Saving...) that never resolves, with no feedback. Their edit may be in localStorage but not in the cloud, and they don't know it failed.

**Fix:** In the catch block for non-network errors (i.e., online but save still failed), show a brief `toast.warning('Auto-save failed — your changes are safe locally and will retry.')` with a short 4s duration. The message is honest, non-alarming, and tells the user their data is safe.

**Risk:** Very low — adds one `toast.warning` call in an existing catch block.

---

### Issue 4 — AI actions when offline: cryptic errors

**File:** `src/hooks/useAIEnhance.ts` line 113–116

**What happens today when AI is triggered while offline:**
```ts
} catch (error) {
  if (isTimeoutError(error)) {
    toast.warning('The request timed out. Please try again.');
  } else {
    toast.error('Failed to enhance content. Please try again.');
  }
}
```

A `Failed to fetch` error caused by being offline hits the `else` branch and shows: **"Failed to enhance content. Please try again."**

Same problem in `aiTailor.ts`: the generic outer `throw` escalates to wherever `tailorResumeWithProgress` is called from, and the caller shows generic error text.

Both messages don't tell the user **why** it failed or that their existing content is **safe**.

**Fix:** Add a `navigator.onLine` check inside the catch block. If offline, show: **"You're offline — AI features need an internet connection. Your resume content is saved."** This is specific, calming, and actionable.

**Risk:** Very low — only changes toast message in the catch block. No logic change.

---

### Issue 5 — Export on slow network / offline: silent Loader2 spinner

**File:** `src/components/editor/ExportOptionsSheet.tsx` lines 315–335 and the export handler in `EditorPage.tsx`

**What happens today:**
- Export is fully client-side (html2canvas + pdf-lib) — no network needed for PDF/DOCX generation.
- However, the export handler catches errors silently. If the template rendering fails (e.g., image loading fails because of no network for avatars), the export spinner never resolves and the sheet stays open.

**Check needed in EditorPage export handler** — add a try/catch around the generatePDF call that shows a `toast.error('Export failed — please try again.')` and resets the export state.

Also: for **online-required** exports (like cover letter package which requires a backend call), if the user is offline, the button should proactively show an offline warning rather than spinning and failing.

**Fix:**
1. In `EditorPage.tsx` export handler: wrap in try/catch, show a clear toast on failure, always call `reset()` in finally.
2. In `ExportOptionsSheet.tsx`: when `!navigator.onLine` and the selected export type requires network, show a small inline `Alert` near the export button.

**Risk:** Low — additive try/catch and one conditional Alert UI.

---

### Issue 6 — Slow login button has no timeout or retry

**File:** `src/pages/AuthPage.tsx` — `handleSubmit`

**What happens today on Slow 3G:**
- Auth `signInWithPassword` has no timeout. On very slow connections it can take 30–60s with the button stuck as `isLoading=true`.
- There is no "Still connecting…" feedback after a delay.
- No retry affordance.

**Fix:** Add a 15-second slow-connection indicator using a `setTimeout`: after 15s of loading, show a small note below the button: "This is taking longer than usual. Please check your connection." This matches the pattern already used in `useAIEnhance`.

**Risk:** Very low — additive `useState` + `setTimeout` only.

---

## Implementation Plan

### Files to Change (6 changes, all UI-only)

| # | File | What Changes |
|---|------|-------------|
| 1 | `src/pages/AuthPage.tsx` | Add `navigator.onLine` guard in `handleSubmit`; add slow-connection timeout indicator (15s); improve catch message for network failures |
| 2 | `src/pages/DashboardPage.tsx` | Add offline+error empty state detection: show "You're offline" card instead of generic empty state when `isError && !resumes && !isOnline` |
| 3 | `src/pages/EditorPage.tsx` | In `saveToCloud` catch: add `toast.warning` for non-network save failures (slow/flaky online). Wrap export call in try/catch with toast on failure |
| 4 | `src/hooks/useAIEnhance.ts` | In catch: add `navigator.onLine` check to show "You're offline — AI features need internet. Your resume is saved." instead of generic error |
| 5 | `src/lib/aiTailor.ts` | Same offline check in the catch block before rethrowing, so TailorSheet receives an offline-specific error code |
| 6 | `src/components/editor/ExportOptionsSheet.tsx` | Add inline offline `Alert` when user is offline and export type requires network (cover letter package). No change for PDF/DOCX which are client-side |

### What Does NOT Change
- No database schema changes
- No edge function changes
- No business logic changes
- No prompt changes
- No autosave timing changes (already fixed in previous sprint)
- The existing `OfflineBanner` and `OfflineIndicator` components are already correct — only their surrounding page-level error states need improvement

---

## Detailed Change Specs

### Change 1: `src/pages/AuthPage.tsx`

In `handleSubmit`, before calling `signInWithPassword`:
```ts
if (!navigator.onLine) {
  toast.error("You're offline — please check your connection and try again.");
  setIsLoading(false);
  return;
}
```

In the catch block (currently just `toast.error('An unexpected error occurred.')`):
```ts
} catch (err) {
  const isNetworkErr = err instanceof Error && 
    (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'));
  toast.error(isNetworkErr 
    ? "Connection failed — check your network and try again." 
    : 'Something went wrong. Please try again.');
}
```

Add a slow-connection timer: after `setIsLoading(true)`, start a 15s timer that sets a `isSlowConnection` state to `true`. Render a small note under the submit button when `isSlowConnection && isLoading`.

### Change 2: `src/pages/DashboardPage.tsx`

After the `useResumes()` destructuring, add:
```ts
const { data: resumes, isLoading: resumesLoading, isError: resumesError, refetch } = useResumes();
const isOfflineAndEmpty = resumesError && !resumes && !navigator.onLine;
```

In the render, before the `<EmptyState>`:
```tsx
if (isOfflineAndEmpty) {
  return <OfflineEmptyState onRetry={refetch} />;
}
```

`OfflineEmptyState` is a small inline component (not a new file) with a WifiOff icon, "You're offline" headline, "Connect to the internet to load your resumes" description, and a "Retry" button.

### Change 3: `src/pages/EditorPage.tsx`

In `saveToCloud` catch (around line 272):
```ts
} catch (error) {
  const isNetworkError = !navigator.onLine || ...;
  if (isNetworkError && currentResumeId) {
    addPendingChange(currentResumeId, resume);
    // Don't show error toast - OfflineIndicator handles it
  } else {
    console.error('Auto-save failed:', error);
    // NEW: slow/flaky network — save failed but user is "online"
    toast.warning('Auto-save failed — your changes are safe locally and will retry.', { duration: 4000 });
  }
}
```

In the export handler (wherever `generatePDF` / export is called):
```ts
try {
  await handleExportLogic(...);
} catch (err) {
  toast.error('Export failed — please try again.');
  reset(); // reset export progress
}
```

### Change 4: `src/hooks/useAIEnhance.ts`

In the catch block (around line 108):
```ts
} catch (error) {
  clearTimeout(slowTimer);
  console.error('AI enhancement error:', error);
  if (!navigator.onLine) {
    toast.warning("You're offline — AI features need an internet connection. Your resume content is safe.");
  } else if (isTimeoutError(error)) {
    toast.warning('The request timed out. Please try again.');
  } else {
    toast.error('Failed to enhance content. Please try again.');
  }
}
```

### Change 5: `src/lib/aiTailor.ts`

In the catch rethrow block (around line 156):
```ts
} catch (error) {
  clearInterval(progressInterval);
  clearTimeout(slowTimer);
  // Tag offline errors for callers to handle with specific messaging
  if (!navigator.onLine && error instanceof Error && !error.message.includes('offline')) {
    const e = new Error('You\'re offline — AI features need an internet connection. Your resume content is safe.');
    (e as TailorError).code = 'generic';
    throw e;
  }
  throw error;
}
```

### Change 6: `src/components/editor/ExportOptionsSheet.tsx`

Add `useNetworkStatus` hook import.

Before the Export button, when `!isOnline` and `selectedType === 'full-package'` (the only network-dependent export):
```tsx
{!isOnline && selectedType === 'full-package' && (
  <Alert>
    <WifiOff className="h-4 w-4" />
    <AlertDescription>
      You're offline. The cover letter package requires an internet connection. PDF and DOCX exports still work offline.
    </AlertDescription>
  </Alert>
)}
```

---

## Risk Summary

All 6 changes are purely additive UI improvements:
- No backend changes
- No database changes
- No business logic changes
- No breaking changes to existing flows
- Each change adds 1-3 lines or a small conditional render
- The only new UI elements are toast messages with better wording and one conditional Alert in the export sheet
