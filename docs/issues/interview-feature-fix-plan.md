# Interview Feature Fix Plan

This document outlines the implementation plan for fixing the 9 known issues in the WiseResume Interview feature.

## Phase 1 – Critical Fixes

**Branch name:** `fix/interview-critical`

**Files to touch:**
- `supabase/functions/interview-chat/index.ts`
- `src/hooks/useVoiceInterview.ts`

**Step-by-step actions:**
1. **Fix Issue 1 (`user.id` ReferenceError):**
   - Open `supabase/functions/interview-chat/index.ts`.
   - Locate the `callAIWithRetry` and `recordUsage` calls inside the `analyzeRole` condition block.
   - Replace `user.id` with `userId` (which is correctly extracted from `requireAuth`).
   - Locate the `callAIWithRetry` and `recordUsage` calls at the end of the function (for the main interview chat flow).
   - Replace `user.id` with `userId`.
2. **Fix Issue 2 (Missing dependencies in `callAI`):**
   - Open `src/hooks/useVoiceInterview.ts`.
   - Locate the `callAI` `useCallback` hook (around line 519).
   - Add `checkCredits` and `incrementUsage` to the dependency array `[resumeData, addEntry, speak]`.

**Tests to run:**
- `npm run test src/hooks/__tests__/useAICredits.test.tsx`
- `npm run test src/components/interview/__tests__/InterviewSetup.test.tsx`
- (Ensure all Vitest tests pass)

---

## Phase 2 – Medium Priority Fixes

**Branch name:** `fix/interview-medium`

**Files to touch:**
- `src/components/interview/InterviewSetup.tsx`
- `src/hooks/useVoiceInterview.ts`

**Step-by-step actions:**
1. **Fix Issue 3 (`localStorage` access without guard):**
   - Open `src/components/interview/InterviewSetup.tsx`.
   - Update the `useState` initializer for `mode` (around line 29) to check `typeof window !== 'undefined'` before calling `localStorage.getItem`.
2. **Fix Issue 4 (Global `AudioContext` memory leak):**
   - Open `src/hooks/useVoiceInterview.ts`.
   - Locate the `sharedAudioContext` module-level variable.
   - Implement a cleanup function to close `sharedAudioContext` when it's no longer needed, or refactor to manage it within the component sandbox and clean it up in the `useEffect` return function (around line 356) when the interview is reset/unmounted.
3. **Fix Issue 5 (Score fallback strips tip and improvedAnswer):**
   - Open `src/hooks/useVoiceInterview.ts`.
   - Modify the `parseScoreBlock` function (around line 174). Look at the fallback regex path and ensure it provides a default generic `tip` and `improvedAnswer` if it fails to parse the full JSON, instead of returning empty strings.
4. **Fix Issue 6 (Double submission from STT and text):**
   - Open `src/hooks/useVoiceInterview.ts`.
   - In `handleCommittedTranscript`, add a check or state flag (`isListeningRef` or a new flag) to skip firing the STT silence timer if a text message was just manually submitted or if `isListeningRef` is already toggled off by a manual submission.

**Tests to run:**
- `npm run test src/hooks/__tests__/useVoiceInterview.test.tsx` (if it exists)
- `npm run test src/components/interview/__tests__/InterviewSetup.test.tsx`
- (Run full `npm run test` suite)

---

## Phase 3 – Low Priority Fixes

**Branch name:** `fix/interview-low`

**Files to touch:**
- `src/components/interview/InterviewSetup.tsx`
- `supabase/functions/interview-chat/index.ts`
- `src/hooks/useVoiceInterview.ts`

**Step-by-step actions:**
1. **Fix Issue 7 (`jobTitle` hardcoded to Target Role):**
   - Open `src/components/interview/InterviewSetup.tsx`.
   - Inside the `QuestionBankSheet` component call (around line 438), instead of passing `jobTitle: jobDescription ? 'Target Role' : undefined`, parse the `jobDescription` (or use the result of `roleAnalysis` if available) to pass a more accurate title, or provide an input field for the user to explicitly define the `jobTitle`.
2. **Fix Issue 8 (Rate limit too low):**
   - Open `supabase/functions/interview-chat/index.ts`.
   - Locate the `checkRateLimit` call (around line 26).
   - Increase `maxRequests` to a more reasonable number for a 15-minute mock interview (e.g., 50 or 60).
3. **Fix Issue 9 (`NO_SPEECH_TIMEOUT_MS` too long):**
   - Open `src/hooks/useVoiceInterview.ts`.
   - Find the constant `NO_SPEECH_TIMEOUT_MS = 15000` (around line 41).
   - Reduce it to `8000` or `10000` milliseconds to trigger the nudge faster on mobile devices.

**Tests to run:**
- Run full test suite: `npm run test`
