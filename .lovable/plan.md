
# Interview Tool Analysis and Improvement Recommendations

## Current Architecture Overview

The interview tool is a well-structured multi-component system:
- **Edge Function** (`interview-chat/index.ts`): Handles AI calls for role analysis, interview turns, and end-of-interview summaries
- **Client Hook** (`useVoiceInterview.ts`): Manages STT (ElevenLabs + Web Speech fallback), TTS, transcript, scoring, and AI communication
- **Page** (`InterviewPage.tsx`): Orchestrates phases (setup, preview, active, summary)
- **Supporting Components**: Setup, Toggle, TranscriptBubble, AnswerScoreSheet, InterviewSummary, InterviewHistory

## Issues Found

### 1. Message Role Validation Missing (Security - Edge Function)
The edge function validates message `content` type and length but never validates `msg.role`. A malicious client could inject messages with `role: "system"` to override the system prompt, potentially bypassing grounding rules or manipulating scoring.

**Fix**: Validate that each message role is strictly `"user"` or `"assistant"`.

### 2. Resume Context Not Sanitized (Prompt Injection Risk)
The `resumeContext` string is built by directly interpolating `resumeData` fields into the system prompt. A crafted resume with text like `"Ignore all previous instructions..."` in the summary or experience fields could manipulate the AI's behavior.

**Fix**: Apply `sanitizeInputText()` (already available in `_shared/aiClient.ts`) to resume fields before interpolation, and add a prompt fence.

### 3. Job Description Not Sanitized
Same prompt injection risk as resume -- `jobDescription` is injected raw into the system prompt. The existing `sanitizeInputText()` utility is not used.

**Fix**: Apply `sanitizeInputText()` to the job description before embedding in the prompt.

### 4. Score Parsing Fragility
`parseScoreBlock()` uses a regex for `---SCORE---\s*(\{[\s\S]*?\})\s*---END_SCORE---`. The `\{[\s\S]*?\}` is non-greedy which works for simple JSON but can fail if the AI includes nested objects or extra whitespace. Also, if the AI omits the score block entirely (which happens), the client silently gets `null` -- no fallback scoring occurs.

**Fix**: Use the existing `parseAIJSON` from the shared client for more robust parsing; add a fallback that attempts to extract a score from the feedback text itself.

### 5. Conversation History Grows Unbounded on Client
`messagesRef.current` accumulates every message during the interview with no trimming. For long interviews (20+ exchanges), the payload sent to the edge function grows large, increasing latency and token consumption. The edge function caps at 50 messages but doesn't trim -- it just rejects.

**Fix**: Implement a sliding window on the client side (e.g., keep the first 2 messages + last 16) to manage context size without hitting the 50-message hard limit.

### 6. `endInterview` Summary Lacks Resume/Job Context
When `endInterview` is true, the system prompt includes formatting instructions and grounding rules referencing "the candidate's resume above" -- but `resumeContext` and `jobContext` are never inserted into the end-interview prompt. The AI has the conversation history, but not the original resume/job context explicitly.

**Fix**: Append `resumeContext` and `jobContext` to the end-interview system prompt.

### 7. `recordUsage` Called for All Paths but `analyzeRole`
The `recordUsage(user.id, 'interview')` call at line 177 only runs for the regular interview path. The `analyzeRole` path returns early at line 118 without calling `recordUsage`. Server-side usage tracking is inconsistent.

**Fix**: Add `recordUsage(user.id, 'interview')` to the `analyzeRole` success path.

### 8. Quick Practice Auto-End Not Enforced Server-Side
The "ask exactly 5 questions" rule for Quick Practice mode is only in the prompt instruction. The AI can ignore it. There's no server-side enforcement to auto-trigger the summary after 5 user messages.

**Fix**: Count user messages server-side; if `quickPractice` is true and user messages >= 5, auto-append the end-interview instruction.

### 9. No `temperature` Control
The edge function uses the default `temperature: 0.7` from `callAI`. Interview questions benefit from moderate creativity, but scoring/analysis benefits from low temperature for consistency.

**Fix**: Use `temperature: 0.3` for `analyzeRole` (structured JSON output) and `temperature: 0.5` for end-interview summaries to ensure consistent scoring.

### 10. TTS `onend` Reliability Issue
The `speak()` function relies on `utterance.onend` to trigger the countdown and auto-start listening. On some mobile browsers (especially Android WebView/Capacitor), `onend` fires unreliably or not at all for long utterances. This can leave the user stuck in "speaking" status.

**Fix**: Add a safety timeout based on estimated speech duration (word count / ~2.5 words per second) that auto-resolves if `onend` doesn't fire within the expected window.

### 11. No Streaming Support
Each AI response waits for the full completion before showing anything. For longer responses (especially end-interview summaries at 1500 tokens), this creates a noticeable wait.

**Recommendation** (future): Consider implementing SSE streaming for the interview-chat function to show AI responses progressively. This is a larger architectural change.

## Summary of Changes

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `interview-chat/index.ts` | Validate message roles (reject `system`) | High (Security) |
| 2 | `interview-chat/index.ts` | Sanitize resume fields with `sanitizeInputText()` | High (Security) |
| 3 | `interview-chat/index.ts` | Sanitize job description | High (Security) |
| 4 | `useVoiceInterview.ts` | Improve score parsing robustness + fallback | Medium |
| 5 | `useVoiceInterview.ts` | Add sliding window for message history | Medium |
| 6 | `interview-chat/index.ts` | Add resumeContext + jobContext to end-interview prompt | Medium |
| 7 | `interview-chat/index.ts` | Add `recordUsage` to analyzeRole path | Medium |
| 8 | `interview-chat/index.ts` | Server-side Quick Practice 5-question enforcement | Medium |
| 9 | `interview-chat/index.ts` | Set explicit temperature per mode | Low |
| 10 | `useVoiceInterview.ts` | Add TTS `onend` safety timeout | Medium |
| 11 | Future | SSE streaming for progressive responses | Low (Enhancement) |
