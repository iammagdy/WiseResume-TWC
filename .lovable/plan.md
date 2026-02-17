

## Fix: Activity Page Scroll Flashing and Interview Page Crash

### Issue 1: Activity Page Scroll Flashing on Mobile

**Root cause:** The `PullToRefresh` component wraps content in a `motion.div` with `style={{ y }}`. When the user scrolls past the end of content, overscroll events can re-trigger the pull-to-refresh touch handlers, causing the `y` motion value to fluctuate. This creates a visual "flash" effect -- the content briefly shifts down and snaps back repeatedly during momentum scrolling. The `overscrollBehavior: 'contain'` on the AppShell parent doesn't fully prevent this on all Android WebViews.

**Fix in `src/components/ui/pull-to-refresh.tsx`:**
- Add a guard in `handleTouchMove` to ignore small movements (dead zone of ~10px) before activating pull behavior, preventing false triggers during overscroll bounce
- Set `isPulling.current = false` immediately when scroll position is greater than 0 during touchmove, so momentum scrolling past bottom can't retrigger the pull logic
- Add `overscroll-behavior-y: none` to the wrapper div itself to prevent the browser's native overscroll from interfering with the custom pull-to-refresh

### Issue 2: Interview Page Crash -- "Cannot read properties of undefined (reading 'cancel')"

**Root cause:** Two problems combine:

1. **`window.speechSynthesis` is undefined** on some Android WebView configurations. The `useVoiceInterview` hook calls `window.speechSynthesis.cancel()` in three places (cleanup effect line 265, `endInterview` line 505, `resetInterview` line 527) without checking if `speechSynthesis` exists first. On Android WebViews that don't support the Web Speech API, this throws the "Cannot read properties of undefined (reading 'cancel')" error.

2. **Premature redirect to /upload:** The resume guard at line 40-48 checks `currentResume && currentResume.contactInfo?.fullName`. If the Zustand store hasn't hydrated from localStorage yet when this component mounts, `currentResume` is momentarily `null` even though the user has resume data. This causes an immediate redirect to `/upload` before the store finishes loading.

**Fix in `src/hooks/useVoiceInterview.ts`:**
- Guard all `window.speechSynthesis.cancel()` calls with `window.speechSynthesis?.cancel()` (3 locations: lines 265, 404, 505, 527)
- Also guard `window.speechSynthesis?.speak()`, `window.speechSynthesis?.getVoices()`, and `window.speechSynthesis?.onvoiceschanged` in the setup effect

**Fix in `src/pages/InterviewPage.tsx`:**
- Import and check the store hydration state (`getResumeStoreHasHydrated`) before running the resume guard
- Only redirect to `/upload` after confirming the store has hydrated AND the resume is still missing
- Show a brief loading state while the store is hydrating to prevent the premature redirect

### Technical Summary

| File | Change |
|------|--------|
| `src/components/ui/pull-to-refresh.tsx` | Add dead zone guard, reset pull state when scrolled past top, add `overscroll-behavior-y: none` |
| `src/hooks/useVoiceInterview.ts` | Guard all `speechSynthesis` calls with optional chaining (`?.`) |
| `src/pages/InterviewPage.tsx` | Wait for store hydration before running the resume guard redirect |

