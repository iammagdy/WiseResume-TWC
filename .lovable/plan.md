

# Fix 3 Interview UX Issues: Validation, Progress, Skip/Replay

## Issue 1: Launch Button Validation for Job-Targeted Mode

### Current State
The button is already disabled via `disabled={mode === 'job-targeted' && !jobDescription.trim()}` at line 366 of `InterviewSetup.tsx`. However:
- The disabled styling may not be visually clear enough (no explicit `opacity-40`)
- There is no inline validation message when the user taps while empty

### Changes

**File: `src/components/interview/InterviewSetup.tsx`**
- Add a `showValidation` state that gets set to `true` when the user taps the Launch button while JD is empty
- Reset `showValidation` when the user types in the JD field
- Below the `<Textarea>`, render an inline validation message with `AnimatePresence`:
  - Text: "Please paste a job description to continue"
  - Style: `text-red-400 text-xs mt-1`, fade-in animation
- Wrap the Launch button tap handler to set `showValidation` when JD is empty instead of calling `handleStart`
- Add explicit disabled styling: `disabled:opacity-40 disabled:cursor-not-allowed` to the button, with a `transition-opacity duration-200`

---

## Issue 2: Question Progress Indicator During Active Interview

### How It Works
- Count interviewer messages in the `transcript` array to determine the current question number
- For Quick Practice mode: total = 5, show "Question X of 5" with a determinate progress bar
- For General and Job-Targeted modes: show an indeterminate pulsing progress bar (no "X of Y" text)

### Changes

**File: `src/pages/InterviewPage.tsx`**
- Pass `activeInterviewTypeRef.current` as state so we know the mode during the active phase
- In the active interview section, between the header bar and the transcript area, add:
  - A thin 3px progress bar spanning full width
  - For Quick mode: fill = `(currentQuestion / 5) * 100%` with `transition-all duration-500 ease-in-out`
  - For other modes: a CSS pulsing animation (fill oscillates 0% to 60% and back)
  - Below the bar: centered text "Question X of 5" (Quick mode only), styled `text-muted-foreground text-xs text-center mt-1`
- Derive `currentQuestion` by counting `transcript.filter(e => e.role === 'interviewer').length`
- Use `motion.div` for the progress bar with `initial={{ opacity: 0 }}` fade-in

---

## Issue 3: Replay and Skip Buttons

### Replay Logic
- Find the last interviewer message from the transcript
- Call the existing `speak()` function (via window.speechSynthesis) to replay it
- The `speak` function is inside `useVoiceInterview` but not currently exposed. We need to either:
  - (a) Expose a `replayLastQuestion` function from the hook, OR
  - (b) Re-trigger TTS directly from `InterviewPage` using `window.speechSynthesis`
- Option (b) is simpler and avoids changing the hook's return interface. We'll use `window.speechSynthesis` with the same voice selection logic

### Skip Logic
- Send a predefined text message like "(skipped)" via the existing `sendTextMessage` function
- This tells the AI the user skipped, prompting the next question

### Changes

**File: `src/pages/InterviewPage.tsx`**
- In the controls area, add a flex row around the `InterviewToggle`:
  - LEFT: Replay button (RotateCcw icon from lucide-react)
    - 44x44px, `rounded-full`, `text-foreground/70`, `bg-transparent` with `active:bg-white/10`
    - Label below: "Replay" in `text-muted-foreground text-xs`
    - Disabled/hidden when `status === 'speaking'` or `status === 'thinking'` or no interviewer messages exist
    - On tap: use `window.speechSynthesis` to re-speak the last interviewer transcript entry
  - RIGHT: Skip button (SkipForward icon from lucide-react)
    - Same styling as Replay
    - Label below: "Skip" in `text-muted-foreground text-xs`
    - Disabled when `status === 'thinking'`
    - On tap: call `sendTextMessage('(skipped)')`, with a `whileTap={{ scale: 1.15 }}` bounce
- Both buttons use `motion.button` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` fade-in
- Layout: `flex items-center justify-center gap-6` with the toggle in the center

**File: `src/hooks/useVoiceInterview.ts`** -- NO changes needed. We use `sendTextMessage` for skip and `window.speechSynthesis` directly for replay.

---

## Files Changed Summary

| File | Changes |
|---|---|
| `src/components/interview/InterviewSetup.tsx` | Add `showValidation` state; inline validation message below JD textarea; enhanced disabled button styling |
| `src/pages/InterviewPage.tsx` | Add progress bar + question counter between header and transcript; add Replay and Skip buttons flanking the InterviewToggle |

## Technical Notes
- All animations use Framer Motion (`motion.div`, `motion.button`, `AnimatePresence`)
- `useReducedMotion` respected for all new animations
- No changes to AI prompts, API calls, voice engine logic, scoring, or data models
- Replay uses `window.speechSynthesis` directly with `pickBestVoice` logic (imported or inlined)
- Skip sends "(skipped)" via existing `sendTextMessage`
- 44px minimum touch targets on all new buttons
- Progress bar positioned between header and transcript with no overlap

