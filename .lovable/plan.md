

# Fix: App Crash from Supabase Client Initialization

## Problem
The auto-generated `client.ts` calls `createClient(VITE_SUPABASE_URL, ...)` at module load time. When the environment variable is undefined (timing issue in preview/build), it throws `"supabaseUrl is required"` which crashes the entire app -- showing only a stuck "Loading..." spinner.

The current `safeClient.ts` does `export { supabase } from './client'`, which means the crash in `client.ts` propagates with no recovery.

## Solution
Revert `safeClient.ts` to create its own Supabase client with a try-catch guard. If initialization fails, use a placeholder URL so the app boots and API calls fail gracefully (returning errors) instead of crashing the whole page.

## Technical Details

### File: `src/integrations/supabase/safeClient.ts`

Replace with:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let supabaseInstance: SupabaseClient<Database>;

try {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing env vars');
  }
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
} catch (e) {
  console.error('Supabase init failed, using fallback:', e);
  supabaseInstance = createClient<Database>(
    'https://placeholder.supabase.co',
    'placeholder',
    { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
  );
}

export const supabase = supabaseInstance;
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

### Why This Works
- The app always boots -- no crash on missing env vars
- When env vars are present (normal case), the real client is used
- When env vars are missing (edge case), a placeholder client is created that lets the app render but API calls return network errors
- No proxy pattern -- uses a real Supabase client instance in both paths
- All 33+ imports from `safeClient` continue working unchanged

### Single file change -- no other files affected.

