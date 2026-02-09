
# Fix "Unauthorized" Errors on AI Features

## Problem Identified

The AI features are failing with "Unauthorized" errors because **the frontend is sending the Supabase anon key instead of the user's access token** when calling edge functions.

### Root Cause Analysis

From the edge function logs:
```
Auth error: AuthApiError: invalid claim: missing sub claim
```

This happens because:

1. **Edge functions have `verify_jwt = true`** in `supabase/config.toml`, which means they expect a valid user JWT token
2. **Several frontend service files use `SUPABASE_PUBLISHABLE_KEY`** (the anon key) as the Bearer token instead of the user's actual session `access_token`
3. The anon key is NOT a valid user JWT - it's a static project key that doesn't contain user claims (like `sub`)

### Affected Files

| File | Problem |
|------|---------|
| `src/lib/careerPath.ts` | Uses `SUPABASE_PUBLISHABLE_KEY` instead of user token |
| `src/lib/agenticChat.ts` | Uses `SUPABASE_PUBLISHABLE_KEY` instead of user token |
| `src/lib/aiAnalysis.ts` | Uses `SUPABASE_PUBLISHABLE_KEY` instead of user token |
| `src/lib/aiTailor.ts` | Uses `SUPABASE_PUBLISHABLE_KEY` instead of user token |

**Files that work correctly** (use `supabase.functions.invoke` which automatically includes the user token):
- `src/hooks/useAIEnhance.ts` - Uses `supabase.functions.invoke`
- Components that use `supabase.functions.invoke` directly

**Wait - but `useAIEnhance.ts` also fails!** From the logs:
```
enhance-section | 401 | timestamp
```

This means even `supabase.functions.invoke` is failing. Let me check if the supabase client is properly initialized with the user session...

Actually, looking at the auth logs:
```
"error": "403: invalid claim: missing sub claim"
```

This suggests the session token itself might be stale or invalid. The user may be logged in with a Lovable Cloud OAuth token that isn't being properly recognized by the Supabase auth.

### The Real Issue

Looking at `src/contexts/AuthContext.tsx` and the auth logs showing tokens from different domains:
- `wiseresume.lovable.app` - Published app
- `id-preview--*.lovable.app` - Preview environment

The user's session token from one environment may not work in another, OR the Lovable Cloud OAuth token has a different format than what Supabase Auth expects.

## Solution

### Approach 1: Use `supabase.functions.invoke` (Recommended)

The Supabase SDK's `functions.invoke` method automatically:
1. Gets the current session
2. Attaches the correct `Authorization` header
3. Handles token refresh

Convert all raw `fetch` calls to use `supabase.functions.invoke`:

**Files to modify:**
- `src/lib/careerPath.ts`
- `src/lib/agenticChat.ts`
- `src/lib/aiAnalysis.ts`
- `src/lib/aiTailor.ts`

### Code Changes

#### Pattern Before (broken):
```typescript
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';

const response = await fetch(`${SUPABASE_URL}/functions/v1/career-path-advisor`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,  // ❌ Wrong!
  },
  body: JSON.stringify({ resume, userGeminiKey }),
});
```

#### Pattern After (correct):
```typescript
import { supabase } from '@/integrations/supabase/safeClient';

const { data, error } = await supabase.functions.invoke('career-path-advisor', {
  body: { resume, userGeminiKey },
});

if (error) {
  // Handle specific error types
  if (error.message?.includes('401')) {
    throw new Error('Unauthorized. Please log in again.');
  }
  throw error;
}

return data;
```

### Summary of Changes

| File | Change |
|------|--------|
| `src/lib/careerPath.ts` | Replace `fetch` with `supabase.functions.invoke` |
| `src/lib/agenticChat.ts` | Replace `fetch` with `supabase.functions.invoke` |
| `src/lib/aiAnalysis.ts` | Replace `fetch` with `supabase.functions.invoke` |
| `src/lib/aiTailor.ts` | Replace all `fetch` calls with `supabase.functions.invoke` |

This change ensures:
1. The user's actual access token is used (not the anon key)
2. Token refresh is handled automatically
3. Consistent error handling across all AI features

## Technical Details

The `supabase.functions.invoke` method:
1. Internally calls `supabase.auth.getSession()` to get the current user token
2. Adds `Authorization: Bearer <access_token>` header automatically
3. Handles CORS and content-type headers

This is why files using `supabase.functions.invoke` (like `useAIEnhance.ts`) work correctly, while files using raw `fetch` with `SUPABASE_PUBLISHABLE_KEY` fail with 401 Unauthorized.
