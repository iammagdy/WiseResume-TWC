

## Client-Side Security Refactor: Remove API Key Transmission

### Overview
The server-side infrastructure is already complete (the `user_api_keys` table, `manage-api-keys` edge function, and `getUserKeyFromDB` in `_shared/aiClient.ts` are all deployed). This phase removes `userGeminiKey` from all client-side request bodies, updates `AISettingsSheet` to save keys server-side, and cleans up the settings store.

---

### Step 1: Update `AISettingsSheet` to save keys server-side

Modify `src/components/settings/AISettingsSheet.tsx`:
- On "Validate Key" success, call the `manage-api-keys` edge function (POST) to save the encrypted key server-side.
- On "Clear Key", call the edge function (DELETE) to remove it server-side.
- Import `supabase` from `safeClient` for the edge function calls.
- The local `keyInput` stays for the UI form, but the key is no longer persisted in Zustand/localStorage.

### Step 2: Clean up `settingsStore.ts`

Modify `src/store/settingsStore.ts`:
- Remove `geminiApiKey` from persisted state entirely (keep `aiProvider`, `geminiKeyTier`, `geminiKeyValidated`, `geminiDailyUsage` as non-sensitive metadata).
- Remove `elevenlabsApiKey` from persisted state (it's already stored as a Supabase secret; local storage is unnecessary).
- Exclude these fields from the persist config using `partialize` so they never touch localStorage.
- Keep the setter functions for backward compat but have them only update in-memory state (no persistence).

### Step 3: Update `aiProvider.ts`

Modify `src/lib/aiProvider.ts`:
- `getUserGeminiKey()` should return `undefined` always -- keys are now fetched server-side by edge functions using the JWT userId. This function becomes a no-op but is kept to avoid breaking imports across 22 files.
- Alternatively, the function can just check `aiProvider === 'gemini' && geminiKeyValidated` and return a truthy sentinel (not the actual key) so callers know Gemini is active without exposing the key. But since callers no longer need the key value, returning `undefined` is cleanest.

### Step 4: Remove `userGeminiKey` from all 22 client-side call sites

For each file, the change is mechanical: remove the `getUserGeminiKey()` import/call and remove `userGeminiKey` from the request body.

**Library files (4 files):**
1. `src/lib/agenticChat.ts` -- remove import, remove `userGeminiKey` variable and body property
2. `src/lib/aiAnalysis.ts` -- same pattern
3. `src/lib/aiTailor.ts` -- 4 functions: `tailorResumeWithProgress`, `tailorResume`, `parseJobUrl`, `generateCoverLetter`
4. `src/lib/pdfParser.ts` -- remove from the `fetch` body JSON

**Hook files (6 files):**
5. `src/hooks/useAIEnhance.ts` -- remove import, variable, body property
6. `src/hooks/useProofread.ts` -- remove conditional `userGeminiKey` addition to body
7. `src/hooks/useResumeScore.ts` -- remove from `invokeScoreResume` parameter and both call sites (SDK + fallback fetch)
8. `src/hooks/useVoiceInterview.ts` -- remove from 2 edge function calls (interview-chat)
9. `src/hooks/useCareerAssessment.ts` -- no direct `userGeminiKey` usage (uses `careerPath.ts`), skip
10. `src/hooks/useCoverLetters.ts` -- no direct `userGeminiKey` usage (uses `aiTailor.ts`), skip
11. `src/hooks/useResignationLetters.ts` -- no direct usage, skip

**Page files (3 files):**
12. `src/pages/CareerPage.tsx` -- remove import, variable, body property from career-assessment invoke
13. `src/pages/ResignationLetterNewPage.tsx` -- remove from fetch body
14. `src/pages/CoverLetterNewPage.tsx` -- no direct usage (delegates to `generateCoverLetter`), skip

**Component files (8 files):**
15. `src/components/editor/ai/AIEnhanceSheet.tsx` -- remove import, variable, body property
16. `src/components/editor/ai/RecruiterSimSheet.tsx` -- remove import, body property
17. `src/components/editor/ai/AIDetectorSheet.tsx` -- remove from 2 invoke calls
18. `src/components/editor/ai/OnePageWizardSheet.tsx` -- remove import, body property
19. `src/components/editor/ai/LinkedInOptimizerSheet.tsx` -- remove import, body property
20. `src/components/editor/GapExplainerSheet.tsx` -- remove import, body property
21. `src/components/editor/GapFillerSheet.tsx` -- remove import, body property
22. `src/components/editor/tailor/CoverLetterGenerator.tsx` -- no direct usage (delegates to `aiTailor.ts`), skip
23. `src/components/editor/tailor/QuickActions.tsx` -- remove import, variable, body property
24. `src/components/settings/LinkedInImportSheet.tsx` -- remove import, 2 body properties

### Step 5: Clean up `trackGeminiUsage` calls

These remain as-is. They track local daily usage counters for the free tier UI display and don't involve key transmission.

---

### Technical Notes

- The `getUserGeminiKey()` function will be updated to always return `undefined` since keys are now server-side. It's kept as a stub to avoid mass-deleting imports in one shot (can be cleaned up later).
- The `manage-api-keys` edge function already exists and handles encryption/decryption.
- Edge functions already support `userId`-based key lookup via `getUserKeyFromDB()` in `_shared/aiClient.ts`.
- The `@deprecated userGeminiKey` field in `AICallOptions` provides backward compatibility during transition; edge functions that still receive it in the body will simply ignore it since `userId` takes precedence.

### Files Changed Summary
- **Modified**: ~18 files (removing `getUserGeminiKey` imports and `userGeminiKey` body params)
- **Modified**: `src/lib/aiProvider.ts` (stub out `getUserGeminiKey`)
- **Modified**: `src/store/settingsStore.ts` (stop persisting API keys)
- **Modified**: `src/components/settings/AISettingsSheet.tsx` (save keys server-side)

