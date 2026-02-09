
# Fix All AI Features - Complete Auth & CORS Resolution

## Problem Summary

All AI features are failing due to TWO critical issues discovered:

1. **CORS Header Mismatch** in 2 edge functions (`agentic-chat`, `career-path-advisor`)
2. **Missing JWT Config** for 3 edge functions not listed in config.toml
3. **Potential Deployment Sync** - functions need redeployment to ensure latest code is live

## Root Causes

### Issue 1: CORS Headers Missing Required Supabase Client Headers

Two functions use incomplete CORS headers:

| Function | Current Headers | Status |
|----------|----------------|--------|
| `agentic-chat` | `Content-Type, Authorization, X-Client-Info, Apikey` | MISSING Supabase platform headers |
| `career-path-advisor` | `Content-Type, Authorization, X-Client-Info, Apikey` | MISSING Supabase platform headers |

The Supabase JavaScript client sends these additional headers that get blocked:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

### Issue 2: Missing Config Entries

Three functions are missing from `config.toml`:
- `agentic-chat`
- `career-path-advisor`
- No `verify_jwt` setting means default behavior (may cause issues)

## Implementation Plan

### Part A: Fix CORS Headers (2 functions)

**File: `supabase/functions/agentic-chat/index.ts`**

Replace lines 4-8:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

**File: `supabase/functions/career-path-advisor/index.ts`**

Replace lines 4-8:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### Part B: Update Config.toml

Add missing function entries:

```toml
[functions.agentic-chat]
verify_jwt = true

[functions.career-path-advisor]
verify_jwt = true
```

### Part C: Deploy All Edge Functions

After fixing the code, deploy all 18 edge functions to ensure the latest code is running:

1. enhance-section
2. analyze-resume
3. tailor-resume
4. parse-resume
5. parse-linkedin
6. parse-job-url
7. generate-cover-letter
8. generate-headshot
9. recruiter-simulation
10. detect-and-humanize
11. optimize-for-linkedin
12. one-page-optimizer
13. explain-gap
14. interview-chat
15. elevenlabs-scribe-token
16. agentic-chat
17. career-path-advisor

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/agentic-chat/index.ts` | Fix CORS headers |
| `supabase/functions/career-path-advisor/index.ts` | Fix CORS headers |
| `supabase/config.toml` | Add missing function entries |

## Technical Notes

- The CORS issue causes preflight (OPTIONS) requests to fail
- When OPTIONS fails, the actual POST request never happens
- This explains why auth appears to fail - the request is blocked before reaching auth code
- All 18 functions need deployment to ensure code matches repository

## Verification

After deployment, test these features in order:
1. AI Enhance button on Summary section (enhance-section)
2. Resume import/upload (parse-resume)
3. Wise AI Chat (agentic-chat)
4. Career Path Advisor (career-path-advisor)
5. Resume Tailoring (tailor-resume)
