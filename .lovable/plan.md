

# Fix: "Backend not configured" Auth Error

## Problem
The entire app imports the Supabase client from `safeClient.ts`, which has a try/catch wrapper around `createClient`. When initialization fails (likely due to environment variable timing), it silently falls back to a **proxy object** that returns `{ error: { message: 'Backend not configured' } }` for every call -- including sign-in.

The auto-generated `client.ts` (managed by Lovable Cloud) works correctly but is never used.

## Solution
Update `safeClient.ts` to import and re-export from the auto-generated `client.ts` instead of creating its own Supabase client. This keeps all 33+ existing import paths stable while using the properly managed client.

## Technical Details

### File to modify: `src/integrations/supabase/safeClient.ts`

Replace the entire file contents with:

```typescript
// Re-export from the auto-generated client managed by Lovable Cloud
export { supabase } from './client';

// Re-export env vars for any code that needs them
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

This is a single-file change. No other files need modification since they all import from `safeClient.ts` already.

### Why This Works
- The auto-generated `client.ts` is kept in sync by Lovable Cloud with correct credentials
- All 33+ files that import from `safeClient` continue to work without changes
- The broken proxy fallback pattern is removed entirely
- Google, Apple, email, and phone sign-in will all start working

### Risk
- The proxy fallback previously prevented crashes if env vars were missing. With this change, if env vars are truly absent, the app would throw at startup. However, since this project uses Lovable Cloud, the env vars are always provided automatically, making the fallback unnecessary.

