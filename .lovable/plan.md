

# Fix Edge Function URL Mismatch Across All AI Features

## Problem
All 29 files that call `supabase.functions.invoke()` import `supabase` from `safeClient.ts`, which points to the old backend (`jnsfmkzgxsviuthaqlyy`). Edge functions are deployed on Lovable Cloud (`hjnnamwgztlhzkeuufln`). Every AI feature (scoring, tailoring, enhancing, cover letters, career path, etc.) silently fails or 404s.

## Solution
Create a dedicated edge function client that points to Lovable Cloud, then update all 29 files to use it for edge function calls while keeping `safeClient` for database/auth operations.

### Step 1: Create Edge Function Client
**New file: `src/integrations/supabase/edgeFunctions.ts`**

A small module exporting a Supabase client configured with the Lovable Cloud URL (`import.meta.env.VITE_SUPABASE_URL`) specifically for `functions.invoke()` calls. This client inherits the auth session from the main client so tokens are forwarded.

### Step 2: Update 29 Files

Each file that calls `supabase.functions.invoke()` gets a new import for the edge function client, replacing only the edge function calls. Database/auth calls remain on `safeClient`.

**Files that ONLY use edge functions (simple import swap):**

| # | File | Edge Functions Called |
|---|------|---------------------|
| 1 | `src/lib/aiAnalysis.ts` | analyze-resume |
| 2 | `src/lib/aiTailor.ts` | tailor-resume, parse-job-url, parse-job-text, generate-cover-letter |
| 3 | `src/lib/careerPath.ts` | career-path-advisor |
| 4 | `src/lib/agenticChat.ts` | agentic-chat |
| 5 | `src/hooks/useAIEnhance.ts` | enhance-section |
| 6 | `src/hooks/useCompanyBriefing.ts` | company-briefing |
| 7 | `src/hooks/useElevenLabsScribe.ts` | elevenlabs-scribe-token |
| 8 | `src/components/editor/ai/AIEnhanceSheet.tsx` | enhance-section |
| 9 | `src/components/editor/ai/AIDetectorSheet.tsx` | detect-and-humanize |
| 10 | `src/components/editor/ai/RecruiterSimSheet.tsx` | recruiter-simulation, enhance-section |
| 11 | `src/components/editor/ai/OnePageWizardSheet.tsx` | one-page-optimizer |
| 12 | `src/components/editor/ai/LinkedInOptimizerSheet.tsx` | optimize-for-linkedin |
| 13 | `src/components/editor/GapExplainerSheet.tsx` | explain-gap |
| 14 | `src/components/editor/GapFillerSheet.tsx` | fill-gap |
| 15 | `src/components/editor/tailor/QuickActions.tsx` | enhance-section |
| 16 | `src/components/ai-studio/ResumeABCompareSheet.tsx` | score-resume, analyze-resume |
| 17 | `src/components/settings/ElevenLabsKeySheet.tsx` | manage-api-keys |
| 18 | `src/components/settings/FeatureRequestDialog.tsx` | send-feature-request |
| 19 | `src/components/settings/LinkedInImportSheet.tsx` | parse-linkedin, parse-resume |
| 20 | `src/components/BugReportDialog.tsx` | send-bug-report |
| 21 | `src/pages/CareerPage.tsx` | career-assessment |
| 22 | `src/hooks/useATSSuggestions.ts` | enhance-section |
| 23 | `src/hooks/useSalaryEstimate.ts` | salary-estimate (if exists) |

**Files that use BOTH edge functions AND database/auth (need both imports):**

| # | File | Edge + DB Usage |
|---|------|-----------------|
| 24 | `src/hooks/useResumeScore.ts` | score-resume + `supabase.auth.getSession()` |
| 25 | `src/hooks/useVoiceInterview.ts` | interview-chat + possibly auth |
| 26 | `src/hooks/usePushNotifications.ts` | send-push-notification + `supabase.from('push_subscriptions')` |
| 27 | `src/components/settings/AISettingsSheet.tsx` | manage-api-keys + auth/DB |
| 28 | `src/components/dashboard/SetTargetJobSheet.tsx` | tailor functions + `supabase.from('resumes')` |
| 29 | `src/pages/EditorPage.tsx` | possible edge calls + DB |

For these mixed files, both clients are imported:
- `import { supabase } from '@/integrations/supabase/safeClient'` -- for DB/auth
- `import { edgeFunctions } from '@/integrations/supabase/edgeFunctions'` -- for `.functions.invoke()`

### Step 3: Verify remaining files
A few more files may also call edge functions indirectly (e.g., `src/hooks/useSalaryEstimate.ts`, `src/components/editor/AgenticChatSheet.tsx`). These will be checked and updated as well.

## Technical Details

**`edgeFunctions.ts` implementation:**
```typescript
import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const edgeFunctions = createClient(CLOUD_URL, CLOUD_KEY, {
  auth: { persistSession: false },
});
```

The edge function client uses `persistSession: false` since it only needs to forward auth tokens for rate limiting (edge functions have `verify_jwt = false`). The auth token from `safeClient` is not needed since the edge functions already handle cross-project auth gracefully.

**Example change pattern:**
```typescript
// Before (in aiAnalysis.ts):
import { supabase } from '@/integrations/supabase/safeClient';
const { data, error } = await supabase.functions.invoke('analyze-resume', ...);

// After:
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
const { data, error } = await edgeFunctions.functions.invoke('analyze-resume', ...);
```

## Impact
- All AI features will start working: scoring, tailoring, enhancing, cover letters, career path analysis, interview prep, company briefing, LinkedIn optimization, gap explanation, recruiter simulation, A/B comparison, one-page optimizer, AI detection, and more.
- Database operations (auth, resume CRUD, profiles, applications) remain unaffected on the personal backend.
- No edge function redeployment needed.

## Files Changed
- 1 new file created
- ~29 files updated (import swap only)
