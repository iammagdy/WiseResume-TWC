

# Enhanced AI Interview: Human Voice, Per-Answer Scoring, and Smart Flow

## Overview

Five improvements to make the interview feel professional and AI-powered:

1. **Better TTS voice** with male/female toggle (use browser's best available voices instead of default robotic one)
2. **Beep + instruction flow** so users know exactly when to speak and when to stop
3. **Per-answer scoring** with tips shown in a bottom sheet after each answer
4. **AI researches the role** and shows question categories before starting
5. **Question preview** so the user can prepare

---

## 1. Human Voice + Gender Toggle

### Problem
The default `SpeechSynthesisUtterance` uses the browser's first available voice, which is often robotic.

### Solution
- In `useVoiceInterview.ts`, after voices load (`speechSynthesis.onvoiceschanged`), pick the best English voice by filtering for natural/premium voices (Google, Microsoft voices tend to sound better)
- Add a `voiceGender` state (`'male' | 'female'`) and expose a setter
- Filter voices by name keywords: female voices often contain "Female", "Samantha", "Zira", "Google UK English Female"; male voices contain "Male", "Daniel", "David", "Google UK English Male"
- Set `utterance.voice` to the selected voice before speaking
- Adjust `rate` to 0.95 and `pitch` slightly based on gender for more natural delivery

### UI Change (`InterviewSetup.tsx`)
- Add a "Voice" toggle row with Male/Female options (pill-style toggle) below the mode selector

---

## 2. Beep + Instruction Flow

### Problem
After the AI finishes speaking, the user doesn't know when to start talking or that they need to tap the mic.

### Solution

**In `useVoiceInterview.ts`:**
- After AI finishes speaking (TTS `onend`), play a short beep sound using `AudioContext` (no external files needed -- generate a 440Hz tone for 200ms)
- After the beep, set status to `'ready'` (new status) briefly showing "Your turn -- tap the mic to answer"
- Add a `playBeep()` helper function using Web Audio API

**New status:** Add `'ready'` to `InterviewStatus` type

**In `InterviewToggle.tsx`:**
- Add `ready` state visual: pulsing mic icon with "Tap to answer" label, bright highlight to draw attention

**In `InterviewPage.tsx`:**
- When status is `'ready'`, show a subtle prompt text: "Tap the mic when you're ready to answer"
- When status is `'listening'`, show: "Tap the mic again when you're done"

---

## 3. Per-Answer Scoring with Tips Sheet

### Problem
Users only get feedback at the end. They want real-time scoring per answer.

### Solution

**Edge function change (`interview-chat/index.ts`):**
- Update the system prompt to instruct the AI to include a structured scoring block after each answer evaluation, in this format:
```
[Your conversational feedback and next question]

---SCORE---
{"score": 7, "tip": "Try using the STAR method to structure your answer", "improved_answer": "A stronger version would be: 'In my role at X, I identified the problem (Situation), took ownership (Task), implemented Y (Action), which resulted in Z (Result).'"}
---END_SCORE---
```

**In `useVoiceInterview.ts`:**
- Parse the AI response to extract the `---SCORE---` block
- Store per-answer scores in a `scores` array state: `{ questionIndex: number; score: number; tip: string; improvedAnswer: string }[]`
- Strip the score block from the displayed transcript text
- Expose `scores` and `latestScore` from the hook

**New component: `src/components/interview/AnswerScoreSheet.tsx`**
- Bottom sheet (using Vaul drawer) that auto-opens after each AI response
- Shows: score out of 10 (with a colored ring/gauge), the tip, and a collapsible "Better answer" section
- "Got it" button to dismiss
- Glassmorphism styling matching the theme

**In `InterviewPage.tsx`:**
- Render `AnswerScoreSheet` with `latestScore` data
- Auto-open when a new score arrives, auto-close after 5 seconds or user dismissal

---

## 4. AI Researches the Role (Smarter Questions)

### Problem
The AI asks generic questions without market context.

### Solution

**Edge function change (`interview-chat/index.ts`):**
- When `jobDescription` is provided, enhance the system prompt with instructions to:
  - Analyze the job description for key requirements, skills, and industry trends
  - Ask questions that real interviewers for this type of role would ask
  - Reference industry-specific scenarios and challenges
  - Evaluate answers against what hiring managers in this field look for
- Add a new request type `analyzeRole: true` that returns a role analysis before the interview starts

**New edge function request mode:**
- When `analyzeRole: true` is sent, the AI returns a structured analysis:
```json
{
  "reply": "...",
  "roleAnalysis": {
    "title": "Senior Frontend Developer",
    "keySkills": ["React", "TypeScript", "System Design"],
    "questionCategories": ["Technical", "Behavioral", "System Design", "Culture Fit"],
    "industryInsights": "Companies hiring for this role typically value..."
  }
}
```

---

## 5. Question Preview / Preparation Screen

### Problem
Users want to know what kinds of questions to expect.

### Solution

**New component: `src/components/interview/InterviewPreview.tsx`**
- Shown after setup, before the actual interview starts
- Displays the role analysis from the AI (question categories, key skills being tested)
- Each category shown as a glassmorphism card with icon and description
- "I'm Ready" button to proceed to the actual interview
- Loading state while AI analyzes the role

**In `InterviewPage.tsx`:**
- Add a new phase: `setup` -> `preview` -> `active` -> `summary`
- After user clicks "Launch Interview" in setup, show the preview screen
- Preview screen calls the edge function with `analyzeRole: true`
- When user clicks "I'm Ready", start the actual interview

---

## Updated Summary Screen

**In `InterviewSummary.tsx`:**
- Add a per-question score breakdown section below the overall summary
- Each answer shown as a row: question snippet, score badge, expandable tip
- Use the `scores` array from the hook
- Collapsible "How to improve" sections for each answer

---

## Files Changed (8 total)

| File | Changes |
|------|---------|
| `src/hooks/useVoiceInterview.ts` | Voice selection with gender, beep sound, `ready` status, per-answer score parsing, role analysis call |
| `supabase/functions/interview-chat/index.ts` | Per-answer scoring format in prompt, `analyzeRole` mode, market-aware questions |
| `src/components/interview/InterviewSetup.tsx` | Male/female voice toggle |
| `src/components/interview/InterviewToggle.tsx` | `ready` status visual state |
| `src/components/interview/AnswerScoreSheet.tsx` | **New** -- bottom sheet for per-answer score + tip + improved answer |
| `src/components/interview/InterviewPreview.tsx` | **New** -- pre-interview role analysis and question category preview |
| `src/components/interview/InterviewSummary.tsx` | Per-question score breakdown section |
| `src/pages/InterviewPage.tsx` | Preview phase, beep instruction text, score sheet integration, voice gender prop |

