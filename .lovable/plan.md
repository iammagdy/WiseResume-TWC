

# AI Mock Interview - Voice Chat Feature

## Overview

Add a new "Interview" page with an interactive AI voice interview experience. The AI acts as an interviewer, asking questions based on the user's resume and/or a target job description. The UI features a central animated toggle button, a live transcript area, and session controls.

---

## Architecture

The feature uses **Lovable AI** (already configured with `LOVABLE_API_KEY`) for generating interview questions and evaluating answers, plus the **Web Speech API** (built into browsers) for speech-to-text and text-to-speech -- no additional API keys needed.

```text
+------------------+       +---------------------+       +------------------+
|   Browser STT    | ----> |  Edge Function      | ----> |  Lovable AI      |
| (Web Speech API) |       | (interview-chat)    |       | (Gemini Flash)   |
+------------------+       +---------------------+       +------------------+
        ^                          |
        |                          v
+------------------+       +---------------------+
|   Browser TTS    | <---- |  React Interview    |
| (speechSynthesis)|       |  Page Component     |
+------------------+       +---------------------+
```

---

## New Files

### 1. Edge Function: `supabase/functions/interview-chat/index.ts`

- Accepts: `messages` array, `resumeData` (user's CV), optional `jobDescription`
- System prompt instructs AI to act as a professional interviewer
- Uses Lovable AI gateway (non-streaming for simpler turn-based conversation)
- Returns the interviewer's next question/response as JSON

### 2. Page: `src/pages/InterviewPage.tsx`

- Full-screen mobile layout with header "AI Interview"
- Central animated microphone toggle (large, pulsing when active)
- Transcript area showing conversation history (scrollable)
- Mode selector: "General" (based on CV) or "Job-Targeted" (paste job description)
- End interview button that shows a summary/feedback

### 3. Hook: `src/hooks/useVoiceInterview.ts`

- Manages Web Speech API (`SpeechRecognition` for STT, `speechSynthesis` for TTS)
- Handles conversation state (messages array)
- Calls the edge function for AI responses
- Manages recording state, speaking state, errors

### 4. Component: `src/components/interview/InterviewToggle.tsx`

- Large circular button in center of screen
- Animated states: idle, listening (pulsing rings), AI thinking (spinner), AI speaking (waveform)
- Tap to start/stop listening

### 5. Component: `src/components/interview/TranscriptBubble.tsx`

- Chat-style bubbles for user (right) and interviewer (left)
- Displays speaker label and text

### 6. Component: `src/components/interview/InterviewSetup.tsx`

- Pre-interview screen to choose mode
- Option to paste a job description for targeted questions
- Start button

---

## Changes to Existing Files

### `src/App.tsx`
- Add route: `/interview` pointing to `InterviewPage`

### `src/components/layout/BottomTabBar.tsx`
- Add "Interview" tab with `Mic` icon between Editor and New tabs

---

## UI Design (Mobile-First)

### Interview Setup Screen
- Card with two options: "General Interview" / "Job-Targeted Interview"
- If job-targeted: text area for job description
- "Start Interview" button

### Active Interview Screen
- Top: Timer showing interview duration
- Middle: Large pulsing microphone toggle button (the centerpiece)
  - Gray ring = idle
  - Blue pulsing rings = listening to user
  - Spinning dots = AI thinking
  - Green waves = AI speaking
- Below toggle: Scrollable transcript with chat bubbles
- Bottom: "End Interview" button

### Post-Interview Summary
- Overall performance score
- Strengths identified
- Areas to improve
- Option to save or share

---

## Technical Details

### Web Speech API (no extra dependencies)
- `SpeechRecognition` / `webkitSpeechRecognition` for voice input
- `window.speechSynthesis` for AI voice output
- Fallback: text-only mode if speech APIs unavailable

### Edge Function System Prompt
The AI interviewer will:
- Ask one question at a time
- Start with an introduction
- Cover behavioral, technical, and situational questions
- Adapt questions based on the resume content
- If job-targeted, focus on job-specific requirements
- Provide brief feedback after each answer
- End with a summary when requested

### Conversation Flow
1. User taps "Start Interview"
2. AI introduces itself and asks first question (spoken via TTS)
3. User taps microphone, speaks answer (captured via STT)
4. User taps again to stop, answer sent to AI
5. AI responds with feedback + next question
6. Repeat until user taps "End Interview"
7. AI provides final summary/score

