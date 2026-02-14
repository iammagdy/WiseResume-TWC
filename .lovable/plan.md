

## Fix: "supabaseUrl is required" Crash on Editor Page

### Root Cause

The error `supabaseUrl is required` comes from `src/integrations/supabase/client.ts`, which calls `createClient()` with `import.meta.env.VITE_SUPABASE_URL` and **no fallback values**. When env vars are unavailable (e.g., in the Capacitor APK build), the URL is `undefined` and the Supabase SDK throws immediately.

The file `src/hooks/useProofread.ts` imports from this broken `client.ts` instead of the safe `safeClient.ts` (which has hardcoded fallbacks). When this hook is loaded on the Editor page, the crash propagates and the ErrorBoundary catches it.

### Fix (1 file)

**File: `src/hooks/useProofread.ts` (line 5)**

Change the import from:
```ts
import { supabase } from '@/integrations/supabase/client';
```
To:
```ts
import { supabase } from '@/integrations/supabase/safeClient';
```

This is the only file in the codebase that imports from `client.ts` instead of `safeClient.ts`. The `safeClient.ts` has hardcoded fallback values for the Supabase URL and anon key, so it never crashes even when env vars are missing.

### Why This Works

- `safeClient.ts` wraps `createClient()` in a try/catch with hardcoded fallbacks -- it can never throw "supabaseUrl is required"
- Every other file in the project already uses `safeClient.ts`
- This single import was the only path that could trigger the crash

