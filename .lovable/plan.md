
## Fix: AI Enhance Returns Data But Doesn't Apply Changes

### Root Cause

There are **two separate bugs** preventing AI enhancements from taking effect:

**Bug 1 (Main Issue) - ExperienceSection response format mismatch:**
When you click "Enhance" on a single experience entry, the client sends just that entry's data (`{ description, position, company }`), but the edge function always returns `improved` as an **array** of experience objects. The client code then tries to read `result.improved.description` on an array, which returns `undefined`. The dialog shows empty improved text, and clicking Apply updates nothing.

**Bug 2 - AIEnhanceSheet still uses broken auth client:**
The bulk "AI Enhance" sheet (`AIEnhanceSheet.tsx`) still uses `edgeFunctions.functions.invoke()` which sends the anon key instead of the user's real JWT. This is the same auth issue previously fixed in other files but not applied here.

### Fix

**File 1: `src/components/editor/ExperienceSection.tsx`**

- In `handleAIAction`: After receiving the enhance result, extract the matching experience entry from the returned array (by matching `id`) instead of treating the whole array as a single object.
- In the `AIEnhanceDialog` props: Display the extracted single entry's description instead of trying to read `.description` on an array.
- In `onApply`: Handle the improved content correctly as a single experience entry extracted from the array.

**File 2: `src/components/editor/ai/AIEnhanceSheet.tsx`**

- Replace `edgeFunctions.functions.invoke('enhance-section', ...)` with a direct `fetch` call using the user's real `access_token` from `supabase.auth.getSession()` (same pattern used in `useAIEnhance.ts` and `useResumeScore.ts`).

### Technical Details

```text
ExperienceSection - Before:
  result.improved → array of experiences
  dialog shows: (result?.improved as { description? })?.description → undefined
  onApply receives: array → cast as single object → nothing updates

ExperienceSection - After:
  handleAIAction extracts: result.improved[matchingIndex] → single experience object
  dialog shows: extractedEntry.description → correct text
  onApply receives: single experience object → updates the specific entry

AIEnhanceSheet - Before:
  edgeFunctions.functions.invoke('enhance-section', { body }) → sends anon key → 401

AIEnhanceSheet - After:
  fetch(CLOUD_URL/functions/v1/enhance-section, { Authorization: Bearer user_token }) → 200
```

Two files need changes: `ExperienceSection.tsx` and `AIEnhanceSheet.tsx`.
