

## Fix: AI Features Still Failing in APK (CORS Null Origin)

### Root Cause
Capacitor Android's WebView sends requests with a **`null`** or empty `Origin` header (not `http://localhost` as expected). The current CORS logic falls through to returning `http://localhost:8080` as the allowed origin, which doesn't match `null`, so the browser blocks the response.

### The Fix (1 file)

**`supabase/functions/_shared/cors.ts`** -- Also treat null/empty origins as allowed (typical of native app WebViews):

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost',
  'capacitor://localhost',
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [...ALLOWED_ORIGINS];

  if (allowedOrigin) {
    origins.push(allowedOrigin);
  }

  const isLovablePreview = origin?.endsWith('.lovable.app') || origin?.endsWith('.lovableproject.com');
  const isNativeApp = !origin || origin === 'null';
  const isAllowed = isNativeApp || (origin && (origins.includes(origin) || isLovablePreview));

  return {
    'Access-Control-Allow-Origin': isNativeApp ? '*' : (isAllowed ? origin! : origins[0]),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};
```

Key change: When the origin is `null` or empty (native app), return `Access-Control-Allow-Origin: *` so the response is not blocked.

### What Happens After
- The backend functions redeploy automatically
- You then rebuild the APK via GitHub Actions
- All AI features (scoring, tailoring, chat, etc.) will work in the APK

### No Other Changes Needed
- No frontend code changes
- No Capacitor config changes
- Web version continues working as before
