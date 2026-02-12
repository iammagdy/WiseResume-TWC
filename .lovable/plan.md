

# Fix: Authentication Completely Broken (Google + Email)

## Root Cause

There are **two separate issues** preventing sign-in:

### Issue 1: Supabase Client Connecting to `placeholder.supabase.co`
The network logs prove it -- all auth requests go to `https://placeholder.supabase.co` with `apikey: placeholder`. This means the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are evaluating to empty strings at module load time, triggering the fallback.

Previous edits in this conversation accidentally "created .env" twice, which likely overwrote the auto-managed environment file. Since env vars are now empty, the safe client falls back to a placeholder that can never authenticate anyone.

**Fix**: Use the known project credentials (which are public/publishable, not secrets) as hardcoded fallback values in `safeClient.ts`. The anon key is designed to be embedded in client-side code -- it is not a secret.

### Issue 2: PWA Service Worker Intercepting OAuth Redirect
Google OAuth redirects back to `/~oauth` after authentication. The current PWA config has no `navigateFallbackDenylist`, so the service worker can intercept and cache this route instead of letting it reach the network. This breaks Google sign-in.

**Fix**: Add `navigateFallbackDenylist: [/^\/~oauth/]` to the VitePWA config.

## Changes

### File 1: `src/integrations/supabase/safeClient.ts`

Replace with a version that uses the project's known credentials as fallback values:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use env vars with hardcoded fallbacks from project config
// (anon key is a publishable key, not a secret)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://hjnnamwgztlhzkeuufln.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

let supabaseInstance: SupabaseClient<Database>;

try {
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
} catch (e) {
  console.error('Supabase init failed:', e);
  supabaseInstance = createClient<Database>(
    'https://hjnnamwgztlhzkeuufln.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso',
    { auth: { storage: localStorage, persistSession: true, autoRefreshToken: true } }
  );
}

export const supabase = supabaseInstance;
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

This guarantees the client always connects to the real backend regardless of whether env vars are injected.

### File 2: `vite.config.ts`

Add `navigateFallbackDenylist` to the VitePWA config so OAuth redirects are never intercepted by the service worker:

```typescript
VitePWA({
  // ... existing config ...
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    // ... rest of runtimeCaching stays the same
  },
}),
```

### File 3: `src/integrations/supabase/safeClient.test.ts`

Update the test to match the new behavior (the client no longer throws on missing env vars since it has hardcoded fallbacks):

```typescript
it("should use fallback URL when env vars are missing", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", undefined);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", undefined);

  const { supabaseConfig } = await import("./safeClient");
  expect(supabaseConfig.url).toContain("supabase.co");
});
```

## Summary

| What | Why |
|------|-----|
| Hardcoded fallback credentials | Env vars are empty due to previous .env file corruption |
| PWA denylist for `/~oauth` | Service worker can block Google OAuth redirect |
| Updated test | Reflects new fallback behavior |

These 3 file changes will fix both Google and email/password sign-in.

