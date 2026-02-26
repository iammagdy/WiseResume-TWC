

# Fix PDF Parsing: Edge Function URL Mismatch

## Problem
Your CV parsing returns almost no data because the app is calling edge functions on the wrong backend. The `parse-resume` AI function exists on the Lovable Cloud backend, but the app sends requests to a different (old) backend URL where no edge functions are deployed -- resulting in a 404 error and a silent fallback to a basic local parser that can barely extract anything.

This is why you see `"location": "Python, SQ"` with empty skills, experience, education, etc. The AI parser never runs.

## Root Cause
- `src/integrations/supabase/safeClient.ts` has a hardcoded URL pointing to the **old** backend (`jnsfmkzgxsviuthaqlyy`)
- `pdfParser.ts` and many other files import the URL from this file to call edge functions
- Edge functions are deployed on the **Lovable Cloud** backend (`hjnnamwgztlhzkeuufln`)
- Result: every edge function call goes to the wrong URL and fails silently

## Solution
Update `pdfParser.ts` (and all other affected files) to use the correct Lovable Cloud URL for edge function calls.

### Files to Update

| File | Change |
|------|--------|
| `src/lib/pdfParser.ts` | Use `import.meta.env.VITE_SUPABASE_URL` instead of `safeClient.supabaseConfig.url` for edge function calls |
| `src/pages/ResignationLetterNewPage.tsx` | Use `import.meta.env.VITE_SUPABASE_URL` for edge function URL |
| `src/pages/ResignationLetterEditPage.tsx` | Same fix |
| `src/pages/PortfolioEditorPage.tsx` | Same fix |
| `src/pages/PublicPortfolioPage.tsx` | Same fix |
| `src/components/applications/AddApplicationSheet.tsx` | Same fix |
| `src/components/portfolio/public/ChatWidget.tsx` | Same fix |

### Auth Handling
Since `verify_jwt = false` is set for all edge functions, the auth token validation in the edge function code itself is what matters. The edge function creates its own Supabase client with its own project credentials. Since the user is authenticated on the old project, the token won't validate on the Lovable Cloud project.

To fix this, the `parse-resume` edge function needs to either:
1. Accept the old project's token (complex), OR
2. Skip auth for parsing (since verify_jwt is already false) and rely on rate limiting instead

The simplest approach: make the edge function work without requiring auth from the caller's token -- it already has `verify_jwt = false`. We just need to adjust the edge function to not reject unauthenticated requests but still use a user identifier for rate limiting (e.g., from the forwarded token payload without cryptographic verification, or from IP).

### Detailed Changes

**1. `src/lib/pdfParser.ts`** -- Use correct URL and pass auth token as-is
- Replace `supabaseConfig.url` with `import.meta.env.VITE_SUPABASE_URL`
- Keep sending the auth token (edge function will use it if valid, ignore if not)

**2. `supabase/functions/parse-resume/index.ts`** -- Make auth optional
- If the token validates, use the user ID for rate limiting
- If the token doesn't validate, still proceed but use a fallback identifier (e.g., hash of the token) for rate limiting
- This way the function works regardless of which project issued the token

**3. All other files using `SUPABASE_URL` from safeClient for edge functions** -- Switch to `import.meta.env.VITE_SUPABASE_URL`

### Deployment
- Redeploy `parse-resume` edge function after the auth changes

## Impact
After this fix:
- PDF upload will call the correct AI parsing endpoint
- The AI will properly extract all resume sections (experience, education, skills, contact info, etc.)
- OCR will also work correctly since it uses the same `parseTextWithAI` function
- Other features using edge functions (scoring, job URL parsing, portfolio bio, etc.) will also start working

