

## AI Features Audit -- Remaining Issues

### What's Working Correctly

All 5 core AI functions use the shared `callAI()` helper with `userGeminiKey` properly wired:
- `score-resume`, `analyze-resume`, `tailor-resume`, `enhance-section`, `proofread-resume`

These client-side callers correctly pass `userGeminiKey` via `getUserGeminiKey()`:
- `aiAnalysis.ts`, `aiTailor.ts`, `careerPath.ts`, `agenticChat.ts`, `useAIEnhance.ts`, `QuickActions.tsx`, `AIEnhanceSheet.tsx`, `AIDetectorSheet.tsx`, `RecruiterSimSheet.tsx` (first call), `LinkedInOptimizerSheet.tsx`, `GapExplainerSheet.tsx`, `GapFillerSheet.tsx`, `LinkedInImportSheet.tsx`, `pdfParser.ts`, `ResignationLetterNewPage.tsx`, `ResignationLetterEditPage.tsx`, `useProofread.ts`, `CareerPage.tsx`

The following edge functions correctly use `callAI()`:
- `analyze-resume`, `tailor-resume`, `enhance-section`, `score-resume`, `proofread-resume`, `recruiter-simulation`, `optimize-for-linkedin`, `detect-and-humanize`, `explain-gap`, `fill-gap`, `generate-resignation-letter`, `generate-cover-letter`, `career-assessment`, `career-path-advisor`, `one-page-optimizer`, `parse-linkedin`, `parse-resume`, `interview-chat`, `agentic-chat`

Non-AI functions are fine as-is: `elevenlabs-scribe-token` (ElevenLabs API, not Gemini), `send-push-notification` (no AI), `generate-headshot` (image generation, gateway-only model).

### Database Tables -- All Present

All required tables exist and have proper RLS:
- `ai_credits` -- tracks daily/total usage with server-side RPC
- `ai_usage_logs` -- logs AI actions per user
- `resumes`, `cover_letters`, `interview_sessions`, `tailor_history`, `career_assessments` -- all AI feature data stores
- `user_preferences` -- stores `ai_provider` setting

No missing tables for any AI feature.

---

### Issue 1: `useVoiceInterview.ts` -- Missing `userGeminiKey` (2 calls)

The voice interview hook calls `interview-chat` twice (regular chat + role analysis) but never passes `userGeminiKey`. The edge function supports it but receives `undefined`.

**Fix**: Import `getUserGeminiKey` and pass `userGeminiKey` in both `callAI` and `analyzeRole` request bodies.

### Issue 2: `OnePageWizardSheet.tsx` -- Missing `userGeminiKey`

Calls `one-page-optimizer` without passing `userGeminiKey`. The edge function supports it but gets `undefined`.

**Fix**: Import `getUserGeminiKey` and pass `userGeminiKey` in the request body.

### Issue 3: `RecruiterSimSheet.tsx` -- Second call missing `userGeminiKey`

The first call to `recruiter-simulation` correctly passes `getUserGeminiKey()`, but the second call to `enhance-section` (for applying fixes) does not pass `userGeminiKey`.

**Fix**: Pass `userGeminiKey: getUserGeminiKey()` in the `enhance-section` call body.

### Issue 4: `parse-job-url` -- Uses manual `fetch` instead of `callAI()`

This edge function still uses manual `fetch()` to the AI gateway (line 237) without timeout protection and ignores `userGeminiKey` entirely (the client passes it via `aiTailor.ts` line 149, but the function never reads it from the body).

**Fix**: Refactor to use `callAI()` and read `userGeminiKey` from request body.

### Issue 5: `generate-headshot` -- No `callAI()` (Acceptable)

This function uses `google/gemini-2.5-flash-image` with multimodal `image_url` input and `modalities: ["image", "text"]`. The shared `callAI()` helper doesn't support these parameters. This is an intentional exception -- the function has its own timeout-less manual fetch, but the image generation model is gateway-only anyway (no direct Gemini equivalent).

**Recommendation**: Add a 30-second timeout via `AbortController` for reliability, but keep the manual fetch since the shared helper doesn't support image modalities.

---

### Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `src/hooks/useVoiceInterview.ts` | Missing `userGeminiKey` in 2 calls | Add import + pass key |
| `src/components/editor/ai/OnePageWizardSheet.tsx` | Missing `userGeminiKey` | Add import + pass key |
| `src/components/editor/ai/RecruiterSimSheet.tsx` | 2nd call missing key | Pass `userGeminiKey` in enhance-section body |
| `supabase/functions/parse-job-url/index.ts` | Manual fetch, ignores user key | Refactor to `callAI()` |
| `supabase/functions/generate-headshot/index.ts` | No timeout | Add 30s AbortController |

### Technical Details

**File 1: `src/hooks/useVoiceInterview.ts`**
- Add `import { getUserGeminiKey } from '@/lib/aiProvider';`
- Line 321 body: add `userGeminiKey: getUserGeminiKey(),`
- Line 447 body: add `userGeminiKey: getUserGeminiKey(),`

**File 2: `src/components/editor/ai/OnePageWizardSheet.tsx`**
- Add `import { getUserGeminiKey } from '@/lib/aiProvider';`
- Line 86 body: add `userGeminiKey: getUserGeminiKey(),`

**File 3: `src/components/editor/ai/RecruiterSimSheet.tsx`**
- Line 105 body (enhance-section call): add `userGeminiKey: getUserGeminiKey(),`

**File 4: `supabase/functions/parse-job-url/index.ts`**
- Add `import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";`
- Read `userGeminiKey` from request body
- Replace manual fetch (lines 237-284) with `callAI()` using existing system/user messages
- Replace manual JSON extraction with `parseAIJSON()`
- Error handling: use `isAIError` pattern

**File 5: `supabase/functions/generate-headshot/index.ts`**
- Add 30-second `AbortController` timeout around the fetch call (line 71)
- Keep manual fetch since `callAI()` doesn't support image modalities

