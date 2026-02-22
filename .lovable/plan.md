

# Add SpeechRecognition Availability Pre-Check with Text Input Fallback

## Problem

The current `speechSupported` check in `useVoiceInterview.ts` (line 327) is too broad:
```typescript
const speechSupported = isWebSpeechSupported() || !!navigator.mediaDevices?.getUserMedia;
```
Having `getUserMedia` does NOT mean speech recognition works. On Android WebViews without Google Play Services, `SpeechRecognition` is completely unavailable but `getUserMedia` exists, so the app incorrectly reports speech as "supported." Users then start an interview expecting voice input, only for it to silently fail.

Additionally, the existing warning banner (line 177 of InterviewSetup) shows a vague "Microphone access is required" message that doesn't explain the actual issue or guide the user.

---

## Changes

### 1. Fix `speechSupported` in `useVoiceInterview.ts` (line 327)

Split into two separate flags:
- `speechRecognitionAvailable` -- whether the Web Speech API or ElevenLabs can provide speech-to-text
- `microphoneAvailable` -- whether `getUserMedia` exists for audio capture

```typescript
const speechRecognitionAvailable = isWebSpeechSupported();
const microphoneAvailable = !!navigator.mediaDevices?.getUserMedia;
// Keep backward-compatible prop but make it accurate
const speechSupported = speechRecognitionAvailable && microphoneAvailable;
```

Also export `speechRecognitionAvailable` from the hook's return value (alongside `speechSupported`).

### 2. Update `InterviewSetupProps` and the banner in `InterviewSetup.tsx`

Add a new `speechRecognitionAvailable` prop. Replace the single vague banner with two distinct cases:

**Case A -- No SpeechRecognition API (Android WebView without Google Play Services):**
Show an amber/warning-styled banner with a Keyboard icon:
> "Voice input is not available on this device. You can type your answers during the interview using the text input button."

Hide the "Test Microphone" button entirely since it's irrelevant.

**Case B -- SpeechRecognition exists but mic not available (current banner):**
Keep the existing message about microphone access.

### 3. Hide Mic Test when speech recognition is unavailable

When `speechRecognitionAvailable` is false, hide the entire mic test button section (lines 230-274). The mic test is misleading when speech-to-text won't work regardless of mic status.

### 4. Pass new prop from `InterviewPage.tsx`

Pass `speechRecognitionAvailable` from the hook to `InterviewSetup`:
```tsx
<InterviewSetup
  speechSupported={speechSupported}
  speechRecognitionAvailable={speechRecognitionAvailable}
  ...
/>
```

---

## Technical Details

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useVoiceInterview.ts` | Split `speechSupported` into two flags, export both |
| `src/components/interview/InterviewSetup.tsx` | Add `speechRecognitionAvailable` prop, conditional banner and mic test visibility |
| `src/pages/InterviewPage.tsx` | Pass `speechRecognitionAvailable` to InterviewSetup |

### UI behavior summary

| Device | SpeechRecognition | Microphone | Banner shown | Mic test visible |
|--------|------------------|------------|-------------|-----------------|
| Chrome desktop | Yes | Yes | None | Yes |
| Chrome desktop (mic blocked) | Yes | No | Mic access warning | Yes (will fail) |
| Android WebView (no Play Services) | No | Yes | Text-input fallback banner | No |
| Android WebView (no Play Services, no mic) | No | No | Text-input fallback banner | No |

