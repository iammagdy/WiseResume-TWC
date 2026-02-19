
# Fix "supabaseUrl is required" Error on Portfolio Page

## Root Cause

Three files import from `@/integrations/supabase/client` (the auto-generated file with no fallbacks) instead of `@/integrations/supabase/safeClient` (which has hardcoded fallback values). When environment variables are unavailable, the auto-generated client throws "supabaseUrl is required."

The Portfolio tab crashes because it uses the `usePortfolioAnalytics` hook, which is one of the affected files.

## Fix

Change the import in all three files from:
```
import { supabase } from '@/integrations/supabase/client';
```
to:
```
import { supabase } from '@/integrations/supabase/safeClient';
```

## Files to Change

| File | Change |
|---|---|
| `src/hooks/usePortfolioAnalytics.ts` | Switch import to safeClient (this is the one causing the Portfolio crash) |
| `src/pages/ShortLinkPage.tsx` | Switch import to safeClient |
| `src/pages/OnboardingPage.tsx` | Switch import to safeClient |

This is a one-line fix per file. No logic changes needed.
