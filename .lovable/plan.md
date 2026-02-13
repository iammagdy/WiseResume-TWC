

## Fix: Resume Tailor Timeout + Deployment Verification

### Status of Previous CORS Fix
The CORS fix has been deployed and is confirmed working. Both `parse-job-url` and `tailor-resume` edge functions were successfully redeployed and tested. The error in the screenshot ("Failed to parse job URL") was occurring before the CORS fix took effect.

**Please try the tailor feature again now -- it should work.**

### Remaining Risk: Tailor Function Timeout
The `tailor-resume` function takes approximately 30 seconds to complete, which is right at the edge function timeout boundary. This can cause intermittent failures, especially with larger resumes or complex job descriptions.

### Proposed Optimization

**File: `supabase/functions/tailor-resume/index.ts`**

1. **Switch to a faster model**: Change from `gemini-2.5-pro` (slow, heavy reasoning) to `gemini-2.5-flash` for the Lovable gateway path. This model is significantly faster while still producing high-quality results for structured JSON generation tasks like resume tailoring.

   ```
   // Line ~282: Change model for Lovable gateway
   const modelName = useGeminiDirect ? "gemini-2.5-pro-preview-05-06" : "google/gemini-2.5-flash";
   ```

2. **Reduce max_tokens**: The current `max_tokens: 8000` is excessive. The typical tailored response is 3000-4000 tokens. Reducing to `5000` speeds up generation.

3. **Add a 25-second timeout** to the AI fetch call to fail gracefully before the edge function hard-kills at 30s:

   ```typescript
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 25000);
   const response = await fetch(apiUrl, { ..., signal: controller.signal });
   clearTimeout(timeout);
   ```

### Technical Summary
- CORS fix: Already deployed and confirmed working
- Model change: `gemini-2.5-pro` to `gemini-2.5-flash` (Lovable gateway only; user's own Gemini key still uses Pro)
- Timeout safety: 25s abort to prevent hanging
- Token reduction: 8000 to 5000

These changes will make the tailor feature reliably complete within the edge function time limit.
