

# AI Credit System Audit: Bypass Vulnerabilities

## Summary

After analyzing all 32 files that call `supabase.functions.invoke` and cross-referencing with `useAIAction` / `useAICreditsMutations` usage, I found **6 AI features that bypass the credit system entirely** -- they call AI edge functions but never check or deduct credits.

---

## Findings

### BYPASSING CREDITS (no check, no deduct)

| # | File | Feature | AI Function Called | Issue |
|---|------|---------|--------------------|-------|
| 1 | `src/components/editor/tailor/QuickActions.tsx` | Quick Actions (Quantify, Projects, Reorder) | `enhance-section` | Calls AI directly with no `useAIAction`, no `checkCredits`, no `incrementUsage`. Only calls `trackGeminiUsage()` which is a local Gemini free-tier counter, not the credit system. |
| 2 | `src/pages/CareerPage.tsx` | Career Assessment (quiz) | `career-assessment` | Calls AI directly. Only has client-side rate limit (`checkAIRateLimit`) and `trackGeminiUsage()`. No credit check or deduction. |
| 3 | `src/hooks/useATSSuggestions.ts` | Deep ATS Analysis per section | `enhance-section` | Calls AI with no credit wrapper at all. No `useAIAction`, no `checkCredits`, no `incrementUsage`, no `trackGeminiUsage`. Completely free. |
| 4 | `src/hooks/useVoiceInterview.ts` | Mock Interview (each AI turn) | `interview-chat` | Each interview turn calls AI with zero credit check or deduction. A multi-turn interview could consume 10+ AI calls for free. |
| 5 | `src/components/settings/AvatarCropSheet.tsx` | AI Headshot Generation | `generate-headshot` | Calls AI with no credit system integration at all. |
| 6 | `src/components/editor/ai/RecruiterSimSheet.tsx` `handleApplyFix` | Apply Fix (after simulation) | `enhance-section` | The initial simulation correctly uses `executeAI` (line 67), but the "Apply Fix" action (line 116) calls `enhance-section` directly without any credit check or deduction. |

### CORRECTLY USING CREDITS (for reference)

These features properly use `useAIAction` which wraps `checkCredits` + `incrementUsage`:

| Feature | Hook/Component | Operation Key |
|---------|---------------|---------------|
| Section Enhance | `useAIEnhance.ts` | `enhance` |
| Job Tailoring | `TailorSheet.tsx` | `tailor` |
| Job Analysis / Score | `JobAnalysisSheet.tsx` | `analyze` |
| Gap Filler | `GapFillerSheet.tsx` | `gap-fill` |
| Gap Explainer | `GapExplainerSheet.tsx` | `gap-explain` |
| One-Page Optimizer | `OnePageWizardSheet.tsx` | `one-page` |
| LinkedIn Optimizer | `LinkedInOptimizerSheet.tsx` | `linkedin` |
| AI Detector/Humanizer | `AIDetectorSheet.tsx` (detect only) | `detect-humanize` |
| Recruiter Simulation (initial) | `RecruiterSimSheet.tsx` | `recruiter-sim` |
| Company Briefing | `useCompanyBriefing.ts` | `company_briefing` |
| Career Path Sheet | `CareerPathSheet.tsx` | `career-assessment` |
| Set Target Job | `SetTargetJobSheet.tsx` | `tailor` |
| Agentic Chat | `useAgenticChat.ts` | manual `incrementUsage` |
| AI Enhance Sheet | `AIEnhanceSheet.tsx` | manual `checkCredits` + `incrementUsage` |

### SECONDARY ISSUE: AI Detector Humanize bypass

In `AIDetectorSheet.tsx`, the **detect** action (line 263) uses `executeAI`, but the **humanize re-check** (line 294) calls `detect-and-humanize` directly without credits -- though this is a re-scan of already-humanized text, so it may be intentional as a "free verification."

---

## Fix Plan

### 1. `src/components/editor/tailor/QuickActions.tsx`
- Add `useAIAction({ operation: 'enhance' })` (cost: 1 credit per quick action)
- Wrap the `supabase.functions.invoke` call inside `executeAI(async () => { ... })`
- Remove direct `trackGeminiUsage()` call (handled by `useAIAction`)

### 2. `src/pages/CareerPage.tsx`
- Add `useAIAction({ operation: 'career-assessment' })` (cost: 2)
- Wrap the `career-assessment` invoke inside `executeAI(async () => { ... })`
- Remove direct `trackGeminiUsage()` call

### 3. `src/hooks/useATSSuggestions.ts`
- This is a hook, so it needs `useAICreditsMutations()` directly
- Add `checkCredits()` before the `enhance-section` call
- Add `incrementUsage.mutate()` after success
- Add `trackGeminiUsage()` after success

### 4. `src/hooks/useVoiceInterview.ts`
- Add `useAICreditsMutations()` to the hook
- Add `checkCredits()` before each `interview-chat` call
- Add `incrementUsage.mutate()` after each successful AI response
- The `analyzeRole` call (line 489) also needs credit deduction

### 5. `src/components/settings/AvatarCropSheet.tsx`
- Add `useAIAction({ operation: 'enhance' })` (or a new `'headshot'` operation key)
- Add `'headshot': 1` to `AI_COST_MAP` in `aiCostEstimates.ts`
- Wrap the `generate-headshot` invoke inside `executeAI`

### 6. `src/components/editor/ai/RecruiterSimSheet.tsx` (handleApplyFix)
- Wrap the `enhance-section` call in `handleApplyFix` with the existing `executeAI` wrapper (already available in the component)

### 7. `src/lib/aiCostEstimates.ts`
- Add missing operation keys: `'headshot': 1`, `'interview-turn': 1`, `'ats-deep': 1`
- Consider adding `'quick-action': 1` or reusing `'enhance'`

### 8. `src/components/editor/ai/AIDetectorSheet.tsx` (optional)
- Decide if the humanize re-check at line 294 should cost a credit
- If yes, wrap it in `executeAI` as well

---

## Files to modify

| File | Change |
|------|--------|
| `src/lib/aiCostEstimates.ts` | Add `headshot`, `interview-turn`, `ats-deep` to `AI_COST_MAP` |
| `src/components/editor/tailor/QuickActions.tsx` | Add `useAIAction`, wrap AI call |
| `src/pages/CareerPage.tsx` | Add `useAIAction`, wrap AI call |
| `src/hooks/useATSSuggestions.ts` | Add `useAICreditsMutations`, add check + deduct |
| `src/hooks/useVoiceInterview.ts` | Add `useAICreditsMutations`, add check + deduct per turn |
| `src/components/settings/AvatarCropSheet.tsx` | Add `useAIAction`, wrap AI call |
| `src/components/editor/ai/RecruiterSimSheet.tsx` | Wrap `handleApplyFix` AI call in existing `executeAI` |

