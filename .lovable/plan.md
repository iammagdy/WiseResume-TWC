

## Create Fix Documentation File

Create a single markdown document (`docs/FIXES_2026-02-26.md`) that documents all the authentication and data-handling bugs fixed today, with root causes, solutions, and code patterns so an external AI agent can replicate the fixes locally.

### Document Contents

The file will cover these 4 fixes in order:

**Fix 1 - score-resume 401 Unauthorized**
- Root cause: `edgeFunctions` client sends anon key instead of user JWT
- File changed: `src/hooks/useResumeScore.ts`
- Solution: Replace `edgeFunctions.functions.invoke()` with direct `fetch` using `supabase.auth.getSession()` token

**Fix 2 - enhance-section 401 Unauthorized (backend)**
- Root cause: Cross-project tokens fail `supabase.auth.getUser()` validation
- File changed: `supabase/functions/enhance-section/index.ts`
- Solution: Add JWT manual decode fallback (`atob` on payload segment, extract `sub` claim)

**Fix 3 - enhance-section 401 Unauthorized (frontend)**
- Root cause: Same `edgeFunctions` client issue as Fix 1, but in `useAIEnhance.ts` and `QuickActions.tsx`
- Files changed: `src/hooks/useAIEnhance.ts`, `src/components/editor/tailor/QuickActions.tsx`
- Solution: Same direct `fetch` pattern with user's real access token

**Fix 4 - AI Enhance returns data but doesn't apply changes**
- Root cause 1: `ExperienceSection.tsx` treats `result.improved` (an array) as a single object, so `.description` is undefined
- Root cause 2: `AIEnhanceSheet.tsx` still uses broken `edgeFunctions.functions.invoke()`
- Files changed: `src/components/editor/ExperienceSection.tsx`, `src/components/editor/ai/AIEnhanceSheet.tsx`
- Solution: Extract matching entry from array by `id`; replace invoke with direct fetch

### Technical Details

The document will include:
- The reusable direct-fetch code pattern (session retrieval, headers, error handling)
- The JWT manual decode fallback pattern for edge functions
- A checklist of all files that were modified
- A "remaining audit" section listing any other files that still import from `edgeFunctions.ts` and may need the same fix

One file will be created: `docs/FIXES_2026-02-26.md`

