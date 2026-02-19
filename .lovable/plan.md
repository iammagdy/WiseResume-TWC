

# Interview Tool -- Full Audit and Fix Plan

## Issues Found

### 1. CRITICAL BUG: Quick Practice Mode is Completely Broken

The "Quick Practice" (5 questions) mode does not work at all. Here is the broken flow:

- `InterviewSetup` calls `onStart('__QUICK_PRACTICE__')`, passing the magic string as a "job description"
- `InterviewPage.handleSetupStart` receives it as `jobDescription`, and since it is truthy, it enters the **preview phase** and calls `analyzeRole('__QUICK_PRACTICE__')` -- sending a nonsensical string to the AI for role analysis
- The edge function expects a separate `quickPractice: true` boolean field, but the client never sends it
- Result: Quick Practice acts like a broken job-targeted interview with the literal text "__QUICK_PRACTICE__" as the job description

**Fix:** In `InterviewPage.handleSetupStart`, detect the `__QUICK_PRACTICE__` sentinel and call `startInterview` with a `quickPractice` flag instead of routing to preview. In `useVoiceInterview`, add a `quickPractice` ref and pass it to the edge function body. Remove the magic string approach entirely.

### 2. BUG: Session Auto-Save Uses Stale `pendingJobDescription`

In `InterviewPage.tsx` line 162-184, the auto-save `useEffect` references `pendingJobDescription` in its closure but does NOT include it in the dependency array. Furthermore, `handlePreviewReady` clears `pendingJobDescription` to `undefined` before the interview even starts, so by the time the summary arrives, the job description is always lost.

**Fix:** Store the active job description in a ref that persists for the session lifetime, and use that in the auto-save effect. Also add the missing dependencies to the `useEffect`.

### 3. BUG: Missing `useEffect` Dependencies

The auto-save `useEffect` (line 184) only depends on `[summary, sessionSaved]` but accesses `user`, `pendingJobDescription`, `transcript`, `elapsedSeconds`, and `saveSession`. This can cause stale closures.

**Fix:** Add proper dependencies or use refs for values that should not re-trigger the effect.

### 4. ISSUE: `speechSupported` Always Returns `true`

In `useVoiceInterview.ts` line 251:
```typescript
const speechSupported = isWebSpeechSupported() || true; // always true
```
The `|| true` makes this always `true`, so the "Microphone not supported" warning never shows. This was likely meant to be `|| scribe !== undefined` or similar.

**Fix:** Change to a meaningful check, e.g. `isWebSpeechSupported() || !!navigator.mediaDevices?.getUserMedia` so it only returns true when at least one STT path is actually available.

### 5. ISSUE: Silence Timer Too Aggressive (1.5 seconds)

`SILENCE_TIMEOUT_MS = 1500` means after 1.5 seconds of silence after a committed transcript, the user's turn auto-ends. This is very short -- users who pause to think will get cut off mid-answer.

**Fix:** Increase to 3000ms (3 seconds) for a more natural conversation pace.

### 6. ISSUE: Timer Keeps Running After Interview Ends

In `endInterviewFn`, the timer is cleared, but `callAI(true)` is awaited after -- if the AI call fails, `setIsStarted(false)` still runs but the timer was already cleared. However, if the user navigates away during the AI call, the timer cleanup in the `useEffect` cleanup (line 262) only runs on unmount, not on `endInterview`. This is fine but could lead to a brief moment where the timer is running while "thinking" the summary.

This is minor and the current code handles it acceptably.

### 7. ISSUE: No Error Boundary Wrapping

Per project guidelines, every main view should be wrapped in a React Error Boundary. The `InterviewPage` is a top-level route but has no Error Boundary wrapper.

**Fix:** Wrap the `InterviewPage` export in an `<ErrorBoundary>` component.

### 8. UX: Interview Type Not Saved Correctly for General/Quick Modes

In the auto-save effect (line 175), `interview_type` is set as:
```typescript
interview_type: pendingJobDescription ? 'job-targeted' : 'general'
```
Quick practice sessions are never saved as `'quick-practice'` -- they are either saved as `'job-targeted'` (due to the `__QUICK_PRACTICE__` string) or `'general'`.

**Fix:** Track the actual interview mode and pass it through to the save call.

---

## Summary of File Changes

| File | Changes |
|---|---|
| `src/components/interview/InterviewSetup.tsx` | Remove `__QUICK_PRACTICE__` magic string; pass mode info cleanly via a new callback signature or separate argument |
| `src/pages/InterviewPage.tsx` | Handle quick-practice mode properly (skip preview, pass quickPractice flag); fix auto-save to use a persistent ref for job description and interview type; add Error Boundary wrapper; fix `useEffect` dependencies |
| `src/hooks/useVoiceInterview.ts` | Add `quickPractice` boolean support; send it in edge function body; fix `speechSupported` to not always be `true`; increase `SILENCE_TIMEOUT_MS` to 3000ms |
| `supabase/functions/interview-chat/index.ts` | No changes needed -- it already supports `quickPractice` field |

---

## Technical Details

### Quick Practice Fix Flow

```text
InterviewSetup (mode='quick-practice')
  --> onStart(undefined, { quickPractice: true })

InterviewPage.handleSetupStart
  --> if quickPractice: startInterview(undefined, true)
  --> skip preview phase entirely

useVoiceInterview.startInterview(jobDescription?, quickPractice?)
  --> quickPracticeRef.current = quickPractice
  --> sends { quickPractice: true } in edge function body

interview-chat edge function
  --> reads quickPractice from body (already implemented)
  --> adds "Ask EXACTLY 5 questions" to system prompt
```

### Auto-Save Fix

Store `activeInterviewType` and `activeJobDescription` in refs set at interview start time, so they are available when the summary arrives regardless of state changes during the interview.
