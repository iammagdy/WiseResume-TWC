

# Integrate ElevenLabs Real-Time Speech-to-Text (Scribe)

## Overview
Replace the browser's Web Speech API with ElevenLabs Scribe (`scribe_v2_realtime`) for reliable, cross-browser speech-to-text during interviews. Users will also be able to configure their own ElevenLabs API key in Settings.

## Changes

### 1. Install dependency
- Add `@elevenlabs/react` package

### 2. Store the default ElevenLabs API key as a backend secret
- Use the secret management tool to store `ELEVENLABS_API_KEY` with the provided key `sk_580720e0ed82f3fc3e77f407a7aa8e8df856fd8b0158c674`

### 3. Create edge function: `supabase/functions/elevenlabs-scribe-token/index.ts`
- Accepts optional `customApiKey` in the request body
- If `customApiKey` is provided, uses that; otherwise falls back to the server-side `ELEVENLABS_API_KEY` secret
- Calls `https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` to generate a single-use token
- Returns `{ token }` to the client
- Update `supabase/config.toml` to register the function with `verify_jwt = false`

### 4. Add ElevenLabs API key to settings store (`src/store/settingsStore.ts`)
- Add `elevenlabsApiKey: string` (default: `''`) and `setElevenlabsApiKey` action
- Persisted in localStorage so users keep their key across sessions

### 5. Add API key input to Settings page (`src/pages/SettingsPage.tsx`)
- Add an "INTEGRATIONS" section with a row for "ElevenLabs API Key"
- Tapping opens a sheet/dialog with a password input field to enter/clear the key
- Show a checkmark if a key is configured

### 6. Create new component: `src/components/settings/ElevenLabsKeySheet.tsx`
- Bottom sheet with a password input for the API key
- Save/Clear buttons

### 7. Rewrite speech recognition in `src/hooks/useVoiceInterview.ts`
- Import `useScribe` from `@elevenlabs/react` is not possible in a non-component hook, so instead use the ElevenLabs WebSocket API directly or create a custom hook
- Actually, since `useScribe` is a React hook, we'll create a new custom hook `src/hooks/useElevenLabsScribe.ts` that:
  - Fetches a scribe token from the edge function (passing custom API key if set)
  - Opens a WebSocket to ElevenLabs realtime scribe endpoint
  - Captures microphone audio via `MediaRecorder` / `AudioWorklet`
  - Sends audio chunks over WebSocket
  - Receives partial and committed transcripts
  - Exposes: `connect()`, `disconnect()`, `isConnected`, `partialTranscript`, `committedText`
- Update `useVoiceInterview.ts`:
  - Remove all `SpeechRecognition` / `webkitSpeechRecognition` code
  - Set `speechSupported` to `true` always (Scribe works everywhere with mic access)
  - In `startListening`: call scribe `connect()`, stream mic audio
  - On committed transcript: accumulate text in `finalTextRef`, apply silence timeout logic
  - In `stopListening`: call scribe `disconnect()`, process accumulated text
  - Remove the browser compatibility warning since Scribe is cross-browser

### 8. Update `InterviewSetup.tsx`
- Remove the "Voice transcription is not available" warning (no longer needed)
- Keep the text input fallback for users who simply prefer typing

### 9. Update `InterviewPage.tsx`
- Remove the speech-unsupported alert banner
- Keep text input toggle as an optional convenience

## Technical Details

### ElevenLabs Scribe WebSocket Protocol
- Connect to: `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en`
- Auth: Send token in initial message or via query param
- Audio format: PCM 16-bit, 16kHz mono
- Commit strategy: VAD (voice activity detection) for automatic segmentation
- Events: `partial_transcript`, `committed_transcript`

### File Summary

| File | Action |
|------|--------|
| `package.json` | Add `@elevenlabs/react` |
| `supabase/functions/elevenlabs-scribe-token/index.ts` | New edge function for token generation |
| `supabase/config.toml` | Register new function |
| `src/hooks/useElevenLabsScribe.ts` | New hook wrapping ElevenLabs Scribe WebSocket |
| `src/hooks/useVoiceInterview.ts` | Replace Web Speech API with ElevenLabs Scribe |
| `src/store/settingsStore.ts` | Add `elevenlabsApiKey` setting |
| `src/components/settings/ElevenLabsKeySheet.tsx` | New settings sheet for API key |
| `src/pages/SettingsPage.tsx` | Add Integrations section with ElevenLabs key row |
| `src/components/interview/InterviewSetup.tsx` | Remove browser compatibility warning |
| `src/pages/InterviewPage.tsx` | Remove speech-unsupported banner |

