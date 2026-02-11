

# Fix: App Crashing on Boot (Supabase createClient with Empty URL)

## Root Cause

The previous fix replaced our `throw` with `console.error`, but the Supabase SDK's `createClient('')` itself throws `"supabaseUrl is required."` internally. This still crashes the module at import time, preventing React from mounting.

The `.env` file keeps getting recreated during edits, temporarily losing the environment variables.

## Fix: `src/integrations/supabase/safeClient.ts`

Wrap the `createClient` call in a try-catch so even if the SDK throws, a fallback null-like client is provided. The app boots, shows the UI, and backend calls fail gracefully at runtime.

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration - backend features will not work');
}

let supabaseInstance: SupabaseClient<Database>;

try {
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (e) {
  console.error('Failed to create Supabase client:', e);
  // Create a minimal proxy that won't crash the app
  // All calls will fail gracefully at runtime
  supabaseInstance = new Proxy({} as SupabaseClient<Database>, {
    get(_, prop) {
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: () => Promise.resolve({ error: null }),
          signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Backend not configured' } }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Backend not configured' } }),
        };
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({ data: null, error: { message: 'Backend not configured' } }),
          insert: () => ({ data: null, error: { message: 'Backend not configured' } }),
          update: () => ({ data: null, error: { message: 'Backend not configured' } }),
          delete: () => ({ data: null, error: { message: 'Backend not configured' } }),
          upsert: () => ({ data: null, error: { message: 'Backend not configured' } }),
        });
      }
      if (prop === 'functions') {
        return { invoke: () => Promise.resolve({ data: null, error: { message: 'Backend not configured' } }) };
      }
      return undefined;
    },
  });
}

export const supabase = supabaseInstance;

export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

This ensures:
- The app **always** boots and shows the UI
- Auth context resolves with `session: null` (no infinite loading)
- Database queries return `{ data: null, error }` (no crashes)
- Edge function calls return errors (no crashes)
- Once the `.env` is properly loaded on next hot-reload, everything works normally

## Only One File Changed

| File | Change |
|------|--------|
| `src/integrations/supabase/safeClient.ts` | Wrap `createClient` in try-catch with Proxy fallback |

