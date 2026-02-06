

# Fix Speech Recognition: Auto-Stop on Silence + Clean UX

## Problem

The screenshot shows the core issue: `SpeechRecognition` runs with `continuous: true` AND auto-restarts on `onend`, causing infinite text accumulation. The user's words get repeated endlessly because the browser keeps recognizing ambient noise and echoes. There is no silence detection to automatically stop listening.

## Solution

### 1. Add Silence Timeout to `useVoiceInterview.ts`

Instead of letting recognition run forever, add an **auto-stop after 3 seconds of silence**:

- Add `silenceTimerRef` that resets every time a new final result arrives
- When 3 seconds pass with no new speech, automatically call `stopListening()`
- Remove the auto-restart in `onend` -- this is the main cause of the infinite loop. Instead, only restart if the silence timer hasn't fired yet
- Keep `continuous: true` but add the safety net of silence detection

Key changes:
```
silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// In onresult, when a final result arrives:
clearTimeout(silenceTimerRef.current);
silenceTimerRef.current = setTimeout(() => {
  // User stopped talking, auto-submit
  stopListeningRef.current();
}, 3000);

// In onend: do NOT auto-restart. Let silence timer handle flow.
recognition.onend = () => {
  // Only restart if still actively listening AND silence timer hasn't fired
  if (isListeningRef.current && silenceTimerRef.current) {
    try { recognition.start(); } catch {}
  }
};
```

### 2. Limit Accumulated Text

- Add a sanity check: if `finalTextRef.current.length > 2000`, auto-stop listening
- This prevents the wall-of-text scenario even if silence detection somehow fails

### 3. Visual Feedback Improvement in `InterviewPage.tsx`

- Show a small "auto-sending in 3s..." indicator when silence is detected but timer hasn't fired yet
- Add `silenceDetected` state to the hook for this purpose

### 4. Better Stop Flow

- When user taps the toggle to stop, immediately abort recognition (don't just `stop()` which waits for final results)
- Use `recognition.abort()` for instant stop when user-initiated
- Use the accumulated `finalTextRef` text that was already captured

## Files Changed (2)

| File | Change |
|------|--------|
| `src/hooks/useVoiceInterview.ts` | Add silence timeout, remove dangerous auto-restart loop, add max-length guard, expose `silenceDetected` state |
| `src/pages/InterviewPage.tsx` | Show "sending soon..." indicator when silence detected, use `silenceDetected` from hook |

## Technical Detail

The root cause is line 199-208 in `useVoiceInterview.ts`:
```typescript
recognition.onend = () => {
  if (isListeningRef.current) {
    try { recognition.start(); } catch {}
  }
};
```
This creates an infinite loop: recognition ends (browser timeout) -> restart -> more text accumulated -> ends again -> restart. Combined with `continuous: true`, the browser keeps recognizing ambient noise and echoes from TTS, producing the garbled repeated text seen in the screenshot.

The fix replaces this with a silence-based auto-stop that sends the user's answer after 3 seconds of quiet.

