> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Interview Feature - Known Issues

Based on manual code review, the following issues have been identified in the Interview feature.

## Critical Issues

### Issue 1: user.id ReferenceError in analyzeRole
- **File:** `supabase/functions/interview-chat/index.ts`
- **Problem:** The `analyzeRole` path uses `user.id` in two places, but the correct variable from `requireAuth` is `userId`. This causes a `ReferenceError` crash every time a user clicks "Research Company" in Job-Targeted mode.
- **Impact:** `analyzeRole` feature is completely broken.

### Issue 2: Missing dependencies in callAI useCallback
- **File:** `src/hooks/useVoiceInterview.ts`
- **Problem:** `checkCredits` and `incrementUsage` are missing from the dependency array of the `callAI` `useCallback`. The hook uses stale references to these credit functions.
- **Impact:** Credit checking may silently fail or behave incorrectly during interviews.

---

## Medium Issues

### Issue 3: localStorage access in useState initializer without guard
- **File:** `src/components/interview/InterviewSetup.tsx`
- **Problem:** `localStorage.getItem` is called directly inside `useState()` initializer without checking if `window` exists.
- **Impact:** Can crash in SSR or Capacitor edge cases.

### Issue 4: Global AudioContext memory leak
- **File:** `src/hooks/useVoiceInterview.ts`
- **Problem:** `sharedAudioContext` is a module-level global variable that is never cleaned up when the component unmounts. Re-opening the interview multiple times causes memory accumulation.
- **Impact:** Memory leak on repeated interview sessions.

### Issue 5: Score fallback strips tip and improvedAnswer
- **File:** `src/hooks/useVoiceInterview.ts`
- **Problem:** In `parseScoreBlock`, the regex fallback path returns an empty `tip` and `improvedAnswer`. Users see a score with no explanation or actionable advice.
- **Impact:** Degraded UX when AI returns score in non-standard format.

### Issue 6: Potential double submission when mixing text input and STT
- **File:** `src/hooks/useVoiceInterview.ts`
- **Problem:** `handleCommittedTranscript` sets a silence timer unconditionally. If the user sends a text message while STT is also active, both paths can fire and submit two messages to the AI.
- **Impact:** Duplicate messages sent to `interview-chat` edge function, wasting credits.

---

## Low Priority Issues

### Issue 7: jobTitle always hardcoded as Target Role
- **File:** `src/components/interview/InterviewSetup.tsx`
- **Problem:** `jobTitle` passed to `QuestionBankSheet` is always the string `'Target Role'` instead of extracting the actual job title from the job description.
- **Impact:** `QuestionBankSheet` always shows "Target Role" as the job title.

### Issue 8: Rate limit too low for long interview sessions
- **File:** `supabase/functions/interview-chat/index.ts`
- **Problem:** Rate limit is set to 30 requests per 60 seconds. A full interview session can exceed this, causing the session to be cut off mid-interview.
- **Impact:** Users may hit rate limit during a normal interview session.

### Issue 9: NO_SPEECH_TIMEOUT_MS 15000ms too long on mobile
- **File:** `src/hooks/useVoiceInterview.ts`
- **Problem:** 15 seconds of silence before the first nudge is too long, especially on mobile where STT initialization is slower.
- **Impact:** Poor UX on mobile, users think the app froze.
