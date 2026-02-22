

# Make the Interview Feel Like a Real Live HR Interview

## Problems Identified

After analyzing the full speech detection pipeline, here are the core issues making the interview feel "fake":

1. **No-speech detection is passive**: When the user doesn't speak after the AI question, the system just shows a quiet toast after 10 seconds ("No speech detected") and does nothing else. A real interviewer would prompt again.

2. **Silence after partial speech auto-submits too fast**: The `SILENCE_TIMEOUT_MS` is 3 seconds -- if the user pauses to think mid-sentence, their half-answer gets submitted. Real conversations have natural pauses.

3. **No "are you there?" re-prompting**: If the user stays silent, the system never re-asks or nudges. It just sits in "listening" state forever after the toast.

4. **stopListening with empty text silently drops to idle**: When `stopListening` runs with no captured text (line 499), it just sets status to `idle` -- no feedback, no re-prompt, no indication of what happened.

5. **WebSpeech `no-speech` error causes silent restarts**: The browser fires `no-speech` errors which restart recognition silently, but the user sees no visual change -- it looks frozen.

## Solution

### 1. Increase silence timeout for natural pauses (useVoiceInterview.ts)

Change `SILENCE_TIMEOUT_MS` from 3000ms to 5000ms. This gives users time to think between sentences without auto-submitting a half-answer.

### 2. Add re-prompt logic when no speech is detected (useVoiceInterview.ts)

Instead of just showing a toast, the `handleNoSpeech` callback will:
- First occurrence: Show a gentle nudge toast ("Take your time, I'm listening...")
- Second occurrence (after another 10s): Auto-send a "(no response)" message so the AI interviewer can naturally re-prompt the user, like a real HR interviewer would say "Take your time" or "Shall I rephrase that?"
- Track no-speech count with a ref

### 3. Add "empty answer" re-prompt in stopListening (useVoiceInterview.ts)

When `stopListening` fires with no captured text:
- Instead of silently going to `idle`, send a "(silence)" message to the AI so it can naturally re-prompt
- This makes the AI respond with something like "No worries, take your time. Would you like me to rephrase the question?"

### 4. Add visual "waiting for you" pulse state (InterviewToggle.tsx)

When the status is `listening` but `audioLevel` is near zero for a few seconds, show a subtle pulsing text like "Waiting for your answer..." instead of "Listening...". This gives the user clear visual feedback that the system is actively waiting.

### 5. Improve the countdown and transition feel (useVoiceInterview.ts)

After the AI finishes speaking:
- Increase countdown from 1 second to 2 seconds (gives user time to prepare)
- Add a second beep tone (lower pitch) as a "your turn" cue

### 6. Add gentle audio prompt for silence (useVoiceInterview.ts)

After the no-speech timeout fires the first time, play a soft double-beep to audibly nudge the user that the mic is still active.

---

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useVoiceInterview.ts` | Increase `SILENCE_TIMEOUT_MS` to 5000; increase `COUNTDOWN_SECONDS` to 2; add `noSpeechCountRef` to track repeated silence; update `handleNoSpeech` with escalating behavior (nudge toast then auto-send silence message); update `stopListening` empty-text path to send "(no response)" to AI; add `playDoubleBeep()` for audio nudge; reset `noSpeechCountRef` in `startListening` and `startInterview` |
| `src/components/interview/InterviewToggle.tsx` | Add "Waiting for your answer..." text when listening with low audio level for 3+ seconds (use internal timer); add subtle shake animation on the mic icon after extended silence |
| `supabase/functions/interview-chat/index.ts` | Update system prompt to handle "(no response)" and "(silence)" user messages gracefully -- instruct the AI to gently re-prompt or rephrase the question when it receives these markers |

## Expected User Experience After Fix

1. AI asks a question and finishes speaking
2. 2-second countdown with beep -- "Your turn!"
3. User sees pulsing mic with "Listening..." label
4. If user doesn't speak for 3 seconds, label changes to "Waiting for your answer..."
5. After 10 seconds of silence, a gentle double-beep plays and toast says "Take your time, I'm still listening..."
6. After another 10 seconds, the AI naturally re-prompts: "No problem! Would you like me to rephrase the question, or shall we move to the next one?"
7. If user speaks mid-sentence and pauses, the 5-second timeout gives them time to continue before auto-submitting

