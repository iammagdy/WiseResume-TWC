

## AI Timeout, Retry, and Input Protection Hardening

### Problem

1. **No retry logic**: The shared `callAI` helper makes a single attempt with a 30-second timeout. Complex tasks (tailor-resume with 8000 tokens of output) regularly time out or hit transient 5xx errors, especially on mobile connections.
2. **No slow-request UX**: If a request takes >25 seconds, users see nothing until a generic error appears. No "taking longer than usual" feedback.
3. **No input truncation**: Job descriptions and resume data are validated for max byte size but not for safe token count. A 50KB job description (~12,500 words) can overflow model context windows or cause the edge function to OOM, resulting in silent crashes.

### Solution

Server-side: Add retry-with-backoff and model fallback to `callAI`. Client-side: Add timeout-aware UX to `useAIEnhance` and `aiTailor`. Edge functions: Add input sanitization (whitespace normalization, smart truncation).

---

### Changes

**1. Modified: `supabase/functions/_shared/aiClient.ts`**

Add a `callAIWithRetry` wrapper around the existing `callAI` function:

- Retry up to 3 attempts for retryable errors (5xx status codes, network/timeout errors)
- Exponential backoff: 1s, 2s, 4s delays between retries
- Do NOT retry 4xx errors (400, 401, 402, 429 rate_limit) -- these are deterministic failures
- On timeout (AbortError), retry with a fresh AbortController and extended timeout (30s, 45s, 55s)
- After all retries exhausted on the primary model, attempt one final call with a lighter fallback model (`google/gemini-2.5-flash-lite`) and log the fallback event
- Export `callAIWithRetry` as the new recommended entry point; keep `callAI` exported for backward compatibility

Add an `sanitizeInputText` utility:
- Normalize excessive whitespace (collapse multiple newlines/spaces)
- Strip non-printable characters
- Truncate to a configurable character limit with a clean sentence boundary

```text
callAIWithRetry flow:

  Attempt 1 (model: original, timeout: 30s)
    -> Success? Return result
    -> 5xx / timeout? Wait 1s, continue
    -> 4xx? Throw immediately (no retry)

  Attempt 2 (model: original, timeout: 45s)
    -> Success? Return result
    -> 5xx / timeout? Wait 2s, continue

  Attempt 3 (model: original, timeout: 55s)
    -> Success? Return result
    -> Fail? Try fallback

  Fallback (model: gemini-2.5-flash-lite, timeout: 55s)
    -> Success? Return result + log "[AI] Fallback model used"
    -> Fail? Throw final error
```

**2. Modified: `supabase/functions/tailor-resume/index.ts`**

- Replace `callAI` with `callAIWithRetry` import
- Use `sanitizeInputText` on `jobDescription` before building the prompt, truncating to 15,000 characters with a message about truncation in the log
- Call `callAIWithRetry` instead of `callAI` at line 313

**3. Modified: `supabase/functions/analyze-resume/index.ts`**

- Replace `callAI` with `callAIWithRetry`
- Add `sanitizeInputText` on `jobDescription`, truncating to 15,000 characters
- If input exceeds limit, return a specific 400 error: `"Job description is too long. Please shorten it to under 15,000 characters for best results."`

**4. Modified: `supabase/functions/generate-cover-letter/index.ts`**

- Replace `callAI` with `callAIWithRetry`
- Add `sanitizeInputText` on `jobDescription` (truncate to 15,000 chars)

**5. Modified: `supabase/functions/enhance-section/index.ts`**

- Replace `callAI` with `callAIWithRetry`

**6. Modified: `src/hooks/useAIEnhance.ts`**

- Add a timeout timer: if the request takes >20 seconds, show `toast.info('This is taking longer than usual. Hang tight...')` -- only once per request
- If the request takes >50 seconds (network timeout), show `toast.warning('The request timed out. Please try again.')` instead of generic error
- Detect timeout errors specifically (check for "timed out" or "abort" in error message)

**7. Modified: `src/lib/aiTailor.ts`**

- In `tailorResumeWithProgress`: add a slow-request toast at 25 seconds elapsed ("This is taking longer than usual...") using a `setTimeout`
- Detect timeout errors and show specific message: "The request timed out. Please try again -- or try a shorter job description."
- Clear the slow-request timeout on completion or error

---

### Technical Details

**Retry logic in `callAIWithRetry`:**

```text
const RETRY_DELAYS = [1000, 2000, 4000];
const TIMEOUTS = [30_000, 45_000, 55_000];
const FALLBACK_MODEL = 'google/gemini-2.5-flash-lite';

function isRetryable(error):
  - AbortError (timeout) -> yes
  - AIError with status >= 500 -> yes
  - AIError with type 'network' -> yes
  - Everything else (400, 401, 402, 429) -> no

async function callAIWithRetry(options):
  for i in 0..2:
    try:
      return callAI({ ...options, timeout: TIMEOUTS[i] })
    catch error:
      if !isRetryable(error): throw error
      if i < 2: await sleep(RETRY_DELAYS[i])

  // All retries failed, try fallback model
  console.warn("[AI] Primary model failed after 3 attempts, trying fallback")
  return callAI({ ...options, model: FALLBACK_MODEL, timeout: 55_000 })
```

**Input sanitization in `sanitizeInputText`:**

```text
function sanitizeInputText(text: string, maxChars = 15_000): string
  1. Replace \r\n with \n
  2. Collapse 3+ consecutive newlines to 2
  3. Collapse 2+ consecutive spaces to 1
  4. Strip non-printable chars (keep newlines, tabs)
  5. Trim
  6. If length > maxChars: truncate at last sentence boundary (. ! ?) before limit
  7. Return cleaned text
```

**Client-side timeout UX in `useAIEnhance`:**

```text
const slowTimer = setTimeout(() => {
  toast.info('This is taking longer than usual. Hang tight...');
}, 20_000);

try {
  const result = await supabase.functions.invoke(...)
  clearTimeout(slowTimer);
  // ...process result
} catch (error) {
  clearTimeout(slowTimer);
  if (isTimeoutError(error)) {
    toast.warning('The request timed out. Please try again.');
  } else {
    toast.error('Failed to enhance content. Please try again.');
  }
}
```

**Why these specific limits:**

- 15,000 characters for job descriptions: approximately 3,750 tokens, safely within Gemini Flash's 1M context but prevents excessive prompt size that slows inference
- 30s/45s/55s escalating timeouts: edge functions have a 60s hard limit; 55s is the safe ceiling
- Fallback to `gemini-2.5-flash-lite`: fastest/cheapest model, handles simpler completions even when the primary model is overloaded

---

### Files Changed

- `supabase/functions/_shared/aiClient.ts` -- add `callAIWithRetry`, `sanitizeInputText`, retry + fallback logic
- `supabase/functions/tailor-resume/index.ts` -- use `callAIWithRetry`, sanitize job description input
- `supabase/functions/analyze-resume/index.ts` -- use `callAIWithRetry`, sanitize + truncation guard
- `supabase/functions/generate-cover-letter/index.ts` -- use `callAIWithRetry`, sanitize input
- `supabase/functions/enhance-section/index.ts` -- use `callAIWithRetry`
- `src/hooks/useAIEnhance.ts` -- slow-request toast, timeout-specific error message
- `src/lib/aiTailor.ts` -- slow-request toast at 25s, timeout-specific error message
