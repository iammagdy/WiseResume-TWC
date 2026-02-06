

# Overhaul AI Interview: "Wise AI" Branding, Futuristic UI, and Speech Fix

## Overview

Three major improvements to the interview feature:
1. Rename the AI interviewer to **"Wise AI"** everywhere
2. Redesign the entire interview UI with a **futuristic, space-themed glassmorphism** look
3. Fix the **speech recognition bug** where user speech is lost on stop

---

## 1. Speech Recognition Bug Fix

### Root Cause
In `useVoiceInterview.ts`, `stopListening` reads `interimText` from a stale closure. When the browser promotes interim text to a final result, `interimText` becomes empty, so `userText` is always empty and the AI is never called.

### Fix
- Add `finalTextRef` (useRef) to accumulate all final transcript segments from `onresult`
- Add `isListeningRef` to track listening intent and auto-restart recognition on browser silence timeout (`onend`)
- In `stopListening`, use `finalTextRef.current` instead of stale `interimText`
- Clear `finalTextRef` after collecting the text

---

## 2. Branding: Rename to "Wise AI"

| File | Change |
|------|--------|
| `supabase/functions/interview-chat/index.ts` | System prompt: "You are **Wise AI**, the intelligent interview coach powered by WiseResume..." |
| `src/components/interview/TranscriptBubble.tsx` | Label: "Interviewer" -> "Wise AI" |
| `src/components/interview/InterviewSetup.tsx` | Title: "AI Mock Interview" -> "Wise AI Interview", description references Wise AI |
| `src/pages/InterviewPage.tsx` | Headers: "AI Interview" / "Mock Interview" -> "Wise AI Interview" |
| `src/components/interview/InterviewSummary.tsx` | Title: "Interview Complete" -> "Wise AI Summary", add "Powered by Wise AI" footer |

---

## 3. Futuristic UI Redesign

### InterviewSetup.tsx
- Dark gradient background with subtle cosmic radial gradients
- Glassmorphism cards (backdrop-blur, semi-transparent borders with glow)
- Animated glowing orb icon instead of plain mic circle
- "Powered by Wise AI" badge with cyan glow
- Gradient "Launch Interview" button

### InterviewToggle.tsx
- Multi-layered glowing orb with rotating gradient ring
- State-dependent effects:
  - **Idle**: Subtle breathing glow (cyan/purple)
  - **Listening**: Expanding pulsing cyan rings with inner glow
  - **Thinking**: Rotating gradient ring with spinner
  - **Speaking**: Green/teal wave rings
- Larger size, glassmorphism inner circle

### InterviewPage.tsx (Active Interview)
- Dark space gradient background instead of plain white
- Glassmorphism header bar with frosted effect
- Glowing timer display
- Frosted glass control bar at bottom
- Subtle background gradient on transcript area

### TranscriptBubble.tsx
- Wise AI bubbles: dark glass with cyan border glow, "Wise AI" label with small icon indicator
- User bubbles: gradient primary with subtle glow effect

### InterviewSummary.tsx
- Glowing score/award display with gradient text
- Glassmorphism feedback card
- "Powered by Wise AI" footer with glow
- Space-themed gradient background

---

## Files Changed (7 total)

1. `src/hooks/useVoiceInterview.ts` -- Speech bug fix (finalTextRef, isListeningRef, auto-restart)
2. `supabase/functions/interview-chat/index.ts` -- "Wise AI" system prompt
3. `src/components/interview/InterviewSetup.tsx` -- Full redesign + branding
4. `src/components/interview/InterviewToggle.tsx` -- Futuristic glowing orb
5. `src/components/interview/TranscriptBubble.tsx` -- Glass bubbles + "Wise AI" label
6. `src/components/interview/InterviewSummary.tsx` -- Redesign + branding
7. `src/pages/InterviewPage.tsx` -- Space background, glass header/controls, branding
