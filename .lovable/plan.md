
## Fix: enhance-section 401 Unauthorized

### Root Cause
The `useAIEnhance` hook calls `edgeFunctions.functions.invoke('enhance-section', ...)`. The `edgeFunctions` client is a separate Supabase client with `persistSession: false`, so it sends the **anon key** as the Bearer token -- not the user's JWT. The anon key has no `sub` claim, so the backend rejects it with 401.

This is the exact same issue that was fixed for `score-resume` by switching to a direct `fetch` with the user's real access token.

### Fix

**File: `src/hooks/useAIEnhance.ts`**

Replace `edgeFunctions.functions.invoke(...)` with a direct `fetch` call that:
1. Gets the user's session from `safeClient` (`supabase.auth.getSession()`)
2. Constructs the full Edge Function URL using the Lovable Cloud base URL
3. Passes the user's real `access_token` in the `Authorization` header
4. Passes the Lovable Cloud anon key in the `apikey` header

### Technical Details

```text
Before:
  edgeFunctions.functions.invoke('enhance-section', { body: {...} })
  --> sends anon key as Bearer token --> 401

After:
  const session = await supabase.auth.getSession()
  fetch(`${CLOUD_URL}/functions/v1/enhance-section`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: CLOUD_KEY,
    },
    body: JSON.stringify({...})
  })
  --> sends real JWT with sub claim --> 200
```

Only one file needs to change: `src/hooks/useAIEnhance.ts`. The edge function itself already has the JWT fallback decoder from the previous fix.
