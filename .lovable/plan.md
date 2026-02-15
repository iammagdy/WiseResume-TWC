

## Fix Speech Recognition and Enhance Voice Feedback

### Root Cause Analysis

The current speech recognition relies **entirely on ElevenLabs Scribe** (realtime WebSocket STT). When the ElevenLabs WebSocket connection fails silently (network issues, token problems, or browser WebSocket limitations in the preview iframe), the UI shows "Listening..." but no audio is processed. There is **no fallback** to the browser's built-in Web Speech API.

Additionally:
- `speechSupported` is hardcoded to `true` -- it never checks actual browser capability
- There is no timeout for "no speech detected"
- Errors during WebSocket setup may not surface to the user clearly
- No debug logging exists for diagnosing connection issues

### What Changes

---

#### 1. Add Web Speech API Fallback (`src/hooks/useWebSpeechFallback.ts` -- NEW)

A new hook that uses the browser's native `SpeechRecognition` API as a fallback:

- Initializes `SpeechRecognition` only on user gesture (click)
- Handles `onresult` for both interim and final transcripts
- Auto-restarts on `onend` if user intends to keep listening (via `isListeningRef`)
- 10-second timeout: if no speech detected, calls `onNoSpeech` callback
- Error handling for "not-allowed", "no-speech", "network" errors
- Provides `audioLevel` approximation (binary: 0 when silent, 0.5 when speech detected)
- Browser compatibility check via `window.SpeechRecognition || window.webkitSpeechRecognition`

#### 2. Update ElevenLabs Scribe Hook (`src/hooks/useElevenLabsScribe.ts`)

- Add console logging at every step: token fetch, WebSocket open, audio processing, message received, errors
- Add a `connectionTimeout` (5 seconds) -- if WebSocket doesn't open in time, reject with error
- Add `onConnected` callback so the voice interview hook knows when audio is actually flowing
- Return a `connectionFailed` state so the caller can switch to fallback

#### 3. Update Voice Interview Hook (`src/hooks/useVoiceInterview.ts`)

- Replace hardcoded `speechSupported = true` with actual browser capability check
- Add fallback logic: try ElevenLabs Scribe first, on failure automatically switch to Web Speech API
- Add 10-second "no speech detected" timeout with toast message: "No speech detected. Please speak clearly or use the Type button"
- Track which STT engine is active (`elevenlabs` | `webspeech` | `none`)
- Add `sttEngine` to returned state for UI display

#### 4. Enhance Interview Toggle (`src/components/interview/InterviewToggle.tsx`)

- Show "Detecting speech..." text when `audioLevel > 0` and listening
- Show "No speech detected" message after timeout with hint to use Type button
- Add small VU meter indicator (3 bars that respond to `audioLevel`) below the main button when listening
- Show STT engine badge ("ElevenLabs" or "Browser") as a tiny label

#### 5. Add Mic Test to Interview Setup (`src/components/interview/InterviewSetup.tsx`)

- Add a "Test Microphone" button below the voice gender selector
- On tap: requests mic permission, captures 3 seconds of audio, shows VU meter animation
- Shows success ("Microphone working!") or failure ("Microphone not detected") message
- If mic test fails, automatically show text input recommendation

#### 6. Enhanced Error Messages (`src/pages/InterviewPage.tsx`)

- Map specific error types to user-friendly messages:
  - "Microphone blocked" -- when permission denied
  - "No speech detected" -- after timeout
  - "Speech recognition unavailable" -- when neither ElevenLabs nor Web Speech API works
- Show a dismissible tooltip near the mic button when speech recognition fails: "Having trouble? Make sure your microphone is working and you're speaking clearly. You can also use the Type button"
- Auto-show text input when speech recognition fails

---

### What Does NOT Change

- Text input mode and all text-based interview flow
- AI question generation and feedback system
- Interview summary page and scoring
- Session history and saving
- All UI layouts and styling (only additions, no modifications to existing styles)
- Edge function logic (token generation works correctly)

---

### Files Summary

| File | Action |
|------|--------|
| `src/hooks/useWebSpeechFallback.ts` | New -- Web Speech API fallback hook |
| `src/hooks/useElevenLabsScribe.ts` | Add logging, connection timeout, connected callback |
| `src/hooks/useVoiceInterview.ts` | Add fallback logic, no-speech timeout, engine tracking |
| `src/components/interview/InterviewToggle.tsx` | Add VU meter, "detecting speech" text, engine badge |
| `src/components/interview/InterviewSetup.tsx` | Add "Test Microphone" button |
| `src/pages/InterviewPage.tsx` | Enhanced error handling, auto-show text input on failure |

### Implementation Order

1. `useWebSpeechFallback.ts` (new fallback hook)
2. `useElevenLabsScribe.ts` (add logging + timeout)
3. `useVoiceInterview.ts` (integrate fallback + no-speech timeout)
4. `InterviewToggle.tsx` (VU meter + detecting text)
5. `InterviewSetup.tsx` (mic test button)
6. `InterviewPage.tsx` (error handling + auto text input)

