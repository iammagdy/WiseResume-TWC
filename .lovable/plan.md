

# Fix Edge Function Client Crash and CV Parsing

## Problem
The app crashes immediately with `supabaseUrl is required` at `edgeFunctions.ts:4` because `import.meta.env.VITE_SUPABASE_URL` is undefined. The `.env` file that should provide these values is missing. This prevents the entire app from loading, so no parsing can happen at all.

## Root Cause
- `edgeFunctions.ts` was created to use env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- The `.env` file is auto-managed by Lovable Cloud but is currently missing
- Unlike `safeClient.ts` which hardcodes its URL, `edgeFunctions.ts` has no fallback

## Fix

### 1. Add hardcoded fallback in `edgeFunctions.ts`
Add the known Lovable Cloud project URL and key as fallback constants, matching the pattern used by `safeClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

export const edgeFunctions = createClient(CLOUD_URL, CLOUD_KEY, {
  auth: { persistSession: false },
});
```

### 2. Add same fallback in `pdfParser.ts`
The `parseTextWithAI` function also reads `import.meta.env.VITE_SUPABASE_URL` directly for its `fetch` call. Add the same fallback:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
```

### 3. Apply same pattern to other direct-fetch files
The previous fix updated 6 other files to use `import.meta.env.VITE_SUPABASE_URL` for direct `fetch` calls. These also need the fallback:
- `src/pages/ResignationLetterNewPage.tsx`
- `src/pages/ResignationLetterEditPage.tsx`
- `src/pages/PortfolioEditorPage.tsx`
- `src/pages/PublicPortfolioPage.tsx`
- `src/components/portfolio/public/ChatWidget.tsx`
- `src/components/applications/AddApplicationSheet.tsx`

Each gets the same one-line change: append `|| 'https://hjnnamwgztlhzkeuufln.supabase.co'` to their `VITE_SUPABASE_URL` usage.

## Impact
- App will stop crashing on load
- All edge function calls (parsing, scoring, tailoring, etc.) will reach the correct backend
- CV parsing via AI will work since `parse-resume` edge function is already properly configured with retry logic, quality assessment, and multi-pass extraction

## Files Changed
- `src/integrations/supabase/edgeFunctions.ts` -- add URL/key fallbacks
- `src/lib/pdfParser.ts` -- add URL fallback
- 6 page/component files -- add URL fallback to direct fetch calls

