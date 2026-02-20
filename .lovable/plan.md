
# Fix Interview Page Scrolling and Tailor Loading Resilience

## Problem 1: Interview Page Scrolling Broken

The AppShell wraps all pages in a scrollable container (`overflow-y-auto`). The interview page has its own internal scroll area for the transcript, but its root containers don't block the AppShell's scroll. This creates two competing scroll contexts, causing touch scroll conflicts -- especially on mobile and in Android WebViews.

Per the established pattern used on Settings, Templates, Guides, and other pages, pages with internal scroll containers must add `overflow-hidden` to their root div to block the AppShell scroll.

## Problem 2: Tailor "Keeps Loading then Errors"

The tailor flow calls the backend once with no client-side retry. If the AI backend is slow or temporarily overloaded, the request fails and shows an error card. The user then has to manually tap "Try Again". Adding an automatic single retry for transient errors (timeouts, 5xx) would prevent most of these false failures.

---

## Technical Changes

### File: `src/pages/InterviewPage.tsx`

Add `overflow-hidden` to the root div of each interview phase to prevent AppShell scroll conflicts:

- **Setup phase** (line 264): Change `flex-1 flex flex-col` to `flex-1 flex flex-col overflow-hidden`
- **Active phase** (line 299): Change `flex-1 flex flex-col` to `flex-1 flex flex-col overflow-hidden`
- **Preview phase** (line 242): Change `flex-1 flex flex-col overflow-y-auto` to `flex-1 flex flex-col overflow-hidden` and keep the inner content scrollable
- **Summary phase** (line 225): Change `flex-1 flex flex-col overflow-y-auto` to `flex-1 flex flex-col overflow-hidden` and wrap content in a scrollable inner div

### File: `src/lib/aiTailor.ts`

Add a single automatic retry for transient errors in `tailorResumeWithProgress`:

- If the first `supabase.functions.invoke` call fails with a timeout or generic 5xx-like error (not auth/credits), wait 2 seconds and retry once automatically
- Update the progress message to "Retrying..." during the retry attempt
- Only throw to the caller if the retry also fails

This eliminates the most common scenario where the AI backend is temporarily slow but succeeds on a second attempt.
