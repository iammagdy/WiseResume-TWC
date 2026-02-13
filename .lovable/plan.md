

## Fix: Resume Tailoring Broken Due to CORS Configuration

### Root Cause

The shared CORS utility (`supabase/functions/_shared/cors.ts`) only allows requests from `localhost:8080` and `localhost:3000`. The production domains (`wiseresume.lovable.app`, `wiseresume.magdysaber.com`) are **not included**, and no `ALLOWED_ORIGIN` environment variable is configured.

This means every edge function call (parse-job-url, tailor-resume, score-resume, etc.) from the published app is silently blocked by the browser's CORS policy. The browser sends the OPTIONS preflight, gets back `Access-Control-Allow-Origin: http://localhost:8080`, sees it doesn't match the actual origin, and refuses to send the real POST request.

### Fix (1 file change)

**File: `supabase/functions/_shared/cors.ts`**

Update the CORS utility to allow all production origins:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];
```

Also add a wildcard fallback for Lovable preview URLs (which use dynamic subdomains):

```typescript
// Also allow Lovable preview subdomains
const isLovablePreview = origin?.endsWith('.lovable.app');
const isAllowed = origin && (origins.includes(origin) || isLovablePreview);
```

This single change will fix all edge function calls across the entire app -- tailor-resume, parse-job-url, score-resume, agentic-chat, and every other function that uses the shared CORS helper.

### What this fixes

- "Failed to parse job URL" error when pasting a job URL
- "Failed to tailor resume" when running the AI tailor
- Any other edge function failures from the published app (score-resume, agentic-chat, cover letter generation, etc.)

### What about "Failed to save resume"?

This error comes from the regular database save (not an edge function), so it's unrelated to CORS. It's likely triggered when the editor tries to auto-save while the user isn't properly authenticated, or the resume ID is stale. This is handled gracefully by the existing error handler in `useResumes.ts` (line 219-225) and should resolve once the user re-opens the resume from the dashboard.

