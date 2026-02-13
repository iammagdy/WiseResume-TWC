

## Fix: CORS Blocking Preview Domain (.lovableproject.com)

### Root Cause
The edge functions work perfectly (confirmed by direct testing), but the browser is blocked by CORS. The user's preview runs on `https://xxx.lovableproject.com`, but the CORS configuration in `supabase/functions/_shared/cors.ts` only allows origins ending with `.lovable.app`:

```
const isLovablePreview = origin?.endsWith('.lovable.app');
```

When the origin doesn't match, the response returns `Access-Control-Allow-Origin: http://localhost:8080` instead of the actual origin, causing the browser to reject the response.

### Fix
**File: `supabase/functions/_shared/cors.ts` (line 16)**

Add `.lovableproject.com` to the preview origin check:

```typescript
const isLovablePreview = origin?.endsWith('.lovable.app') || origin?.endsWith('.lovableproject.com');
```

This single-line change will fix all edge functions (parse-job-url, tailor-resume, and every other function using the shared CORS utility) for both the preview environment and the published app.

### Deployment
Redeploy all affected edge functions after the change. Since all functions import from `_shared/cors.ts`, they all need redeployment: `parse-job-url` and `tailor-resume` at minimum.

