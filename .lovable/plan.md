

## Make All AI Scores Real and Trustworthy

### Problems Found

1. **Fake fallback score**: In the `score-resume` edge function (line 116), if AI JSON parsing fails, a hardcoded score of 50/100 is returned silently. The user sees what looks like a real score but is actually fake data.

2. **Non-deterministic scoring**: The `score-resume` edge function uses `temperature: 0.2`, causing the same resume to receive different scores on consecutive calls (e.g., 78% then 85%). This makes users distrust the app.

3. **Client-side Job Match is not AI-powered**: The `scoreJobMatch()` function in `src/lib/jobMatchScorer.ts` uses a simple keyword-matching heuristic with no AI involvement. While labeled as a "Match Score," it's a basic text comparison that can be misleading.

4. **Two conflicting score systems**: The editor's real-time ATS widget uses `calcOverallScore()` from `resumeCompletionRules.ts` (a local rules-based calculation), while the resume detail page uses the AI-powered `score-resume` edge function. These return different numbers for the same resume, confusing users.

---

### Changes

**1. Fix Fake Fallback in score-resume Edge Function**

File: `supabase/functions/score-resume/index.ts`

- Change `temperature` from `0.2` to `0` for deterministic, reproducible results
- Remove the silent fallback that returns a hardcoded score of 50 when JSON parsing fails
- Instead, return a clear error response so the client knows the scoring failed and can show an appropriate message (e.g., "Scoring failed, tap to retry")
- Add the instruction "Be consistent -- identical resume content must always receive the same score" to the system prompt

**2. Handle Score Failures Gracefully on the Client**

File: `src/hooks/useResumeScore.ts`

- Check if the response from `score-resume` contains an `error` field
- If scoring failed (no valid score returned), show a toast: "Scoring failed. Tap Re-score to try again." instead of silently showing nothing
- Do NOT cache failed results -- only cache successful AI scores

**3. Clearly Label the Client-Side Job Match**

File: `src/components/applications/JobMatchScore.tsx`

- Add a subtle label like "Keyword Match" or an info tooltip explaining this score is based on keyword overlap, not AI analysis
- This sets honest expectations -- users know it's a quick heuristic, not a deep AI evaluation

**4. Distinguish Editor Completion Score from AI ATS Score**

File: `src/pages/EditorPage.tsx` (or wherever the real-time ATS widget is rendered)

- Rename the editor widget label from "ATS Score" to "Completion" or "Resume Completeness" 
- This prevents confusion between the local rules-based percentage and the real AI-powered ATS score on the detail page
- The AI-powered score on the resume detail page keeps the "ATS Score" label since it's the real one

---

### Summary Table

| Area | Current State | After Fix |
|------|--------------|-----------|
| Score-resume fallback | Silently returns fake 50/100 | Returns error, client shows "Retry" |
| Score consistency | temperature: 0.2 (varies per call) | temperature: 0 (deterministic) |
| Job Match label | Shows as "Match Score" (misleading) | Shows as "Keyword Match" with tooltip |
| Editor widget | Labeled "ATS Score" (rules-based) | Labeled "Completeness" (honest) |

