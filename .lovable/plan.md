
# Add Browser Compatibility Check + Text Input Fallback for Transcription

## Problem

The Web Speech API (`SpeechRecognition`) is not supported in all browsers (e.g., Firefox, Samsung Internet, some WebViews). When unsupported, users see no transcriptions and get no explanation why.

## Solution

### 1. Show a clear warning banner when speech is not supported (`InterviewPage.tsx`)

When `speechSupported` is `false` and the interview is active:
- Display a warning banner at the top of the transcript area: "Voice transcription is not available in this browser. Use the text input below to type your answers."
- Auto-enable the text input mode (`setShowTextInput(true)`) so users can still participate

### 2. Auto-enable text input fallback (`InterviewPage.tsx`)

- In the active phase, if `!speechSupported`, automatically show the text input bar instead of requiring the user to tap the keyboard icon
- Hide the mic toggle entirely when speech is not supported (no point showing it)
- The existing `sendTextMessage` flow already works -- just need to surface it automatically

### 3. Improve the setup screen warning (`InterviewSetup.tsx`)

- The setup screen already has a `speechSupported` prop -- enhance the existing warning to be more prominent and suggest using a Chrome-based browser for the best experience
- Add a note that text-based interview mode is available as fallback

## Files Changed (2)

| File | Change |
|------|--------|
| `src/pages/InterviewPage.tsx` | Add unsupported-browser banner in active phase, auto-show text input when speech unavailable, hide mic toggle when unsupported |
| `src/components/interview/InterviewSetup.tsx` | Enhance the speech-not-supported warning with browser recommendation |
