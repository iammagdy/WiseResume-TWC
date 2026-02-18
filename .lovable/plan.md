## AI Edge Function Error Handling Audit

### Audit Summary

i want when there is a error indicated when showing the user the error msg it should add a button to report a bug for the user

After reviewing all 18 AI edge functions and their ~28 client-side callers, the error handling is **generally solid** -- most functions already return structured `{ error: "..." }` JSON with proper HTTP status codes (401, 400, 429, 500, 502). However, there are specific gaps on both the server and client side that need fixing.

---

### Gap 1: Server-side catch blocks return raw `error.message` instead of user-friendly messages

**Affected edge functions** (9 functions use the "bare catch" pattern):


| Function                      | Current catch output     | Problem                                                        |
| ----------------------------- | ------------------------ | -------------------------------------------------------------- |
| `career-assessment`           | `error.message` verbatim | Leaks internal errors like "Failed to parse career assessment" |
| `career-path-advisor`         | `error.message` verbatim | Same issue                                                     |
| `explain-gap`                 | `error.message` verbatim | Same                                                           |
| `fill-gap`                    | `error.message` verbatim | Same                                                           |
| `generate-cover-letter`       | `error.message` verbatim | Same                                                           |
| `generate-resignation-letter` | `error.message` verbatim | Same                                                           |
| `detect-and-humanize`         | `error.message` verbatim | Same                                                           |
| `agentic-chat`                | `error.message` verbatim | Same                                                           |
| `parse-linkedin`              | `error.message` verbatim | Same                                                           |


These all use the pattern:

```
const message = error instanceof Error ? error.message : "Unknown error";
return new Response(JSON.stringify({ error: message }), { status })
```

While `isAIError` maps to proper status codes, the non-AI errors (JSON parse failures, network issues in callAI, etc.) leak raw technical messages. Some AI errors also lack the structured `{ error: code, message: string }` format that `enhance-section` uses.

**Fix**: Standardize these to return `{ error: "<error_code>", message: "<user-friendly message>" }` like `enhance-section` does, with a helper function.

---

### Gap 2: Client callers override server error messages with generic strings

**Affected callers** (7 callers that discard server messages):


| Caller                                      | Server returns   | Client shows                                       |
| ------------------------------------------- | ---------------- | -------------------------------------------------- |
| `src/lib/careerPath.ts`                     | Specific message | Always `"Failed to analyze career path"`           |
| `src/lib/aiAnalysis.ts`                     | Specific message | Always `"Failed to analyze resume"`                |
| `src/lib/agenticChat.ts`                    | Specific message | Always `"Chat request failed"`                     |
| `src/lib/aiTailor.ts` (simple)              | Specific message | Always `"Failed to tailor resume"`                 |
| `src/lib/aiTailor.ts` (parseJobUrl)         | Specific message | Always `"Failed to parse job URL"`                 |
| `src/lib/aiTailor.ts` (generateCoverLetter) | Specific message | Always `"Failed to generate cover letter"`         |
| `GapFillerSheet.tsx`                        | Specific message | Always `"Something went wrong. Please try again."` |


These callers check for `error` from `supabase.functions.invoke()` but then throw a hardcoded string, discarding the server's actual message. The server may return "Rate limit exceeded. Try again in 30s." but the user sees "Failed to analyze resume".

**Fix**: Propagate the server error message. When `supabase.functions.invoke` returns an error, check `error.message` or `data?.error` for the server's message and use that in the thrown Error.

---

### Gap 3: Some callers silently swallow errors without any toast


| Caller                 | Behavior                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| `useProofread.ts`      | Errors logged to console only, no toast                                      |
| `useATSSuggestions.ts` | Shows `toast.error(msg)` but msg may be generic "Deep analysis failed"       |
| `QuickActions.tsx`     | Shows generic `"Action failed. Please try again."` -- discards server detail |


**Fix**: Add toast for proofread errors. Surface server messages in the others.

---

### Gap 4: `generate-headshot` doesn't use shared `isAIError` pattern for non-gateway errors

The `generate-headshot` function doesn't use `callAI`/`isAIError` since it calls the gateway directly. Its catch block returns raw `error.message` which could leak internal details.

**Fix**: Wrap with a user-friendly fallback message.

---

### Gap 5: Missing `data?.error` check in some client callers

Some callers check `error` from `supabase.functions.invoke()` but forget to check `data?.error` (which is how many edge functions communicate failures within a 200 response):


| Caller                 | Missing check                        |
| ---------------------- | ------------------------------------ |
| `QuickActions.tsx`     | Checks `error` but not `data?.error` |
| `useATSSuggestions.ts` | Checks `error` but not `data?.error` |


**Fix**: Add `if (data?.error) throw new Error(data.message || data.error)` after the invoke call.

---

### Files to Modify

**Server-side (edge functions)** -- 9 functions:


| File                                                      | Change                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `supabase/functions/_shared/aiClient.ts`                  | Add `userFriendlyMessage(error)` helper that maps internal errors to safe messages |
| `supabase/functions/career-assessment/index.ts`           | Use friendly error messages in catch                                               |
| `supabase/functions/explain-gap/index.ts`                 | Same                                                                               |
| `supabase/functions/fill-gap/index.ts`                    | Same                                                                               |
| `supabase/functions/generate-cover-letter/index.ts`       | Same                                                                               |
| `supabase/functions/generate-resignation-letter/index.ts` | Same                                                                               |
| `supabase/functions/detect-and-humanize/index.ts`         | Same                                                                               |
| `supabase/functions/agentic-chat/index.ts`                | Same                                                                               |
| `supabase/functions/parse-linkedin/index.ts`              | Same                                                                               |
| `supabase/functions/generate-headshot/index.ts`           | Wrap catch with safe message                                                       |


**Client-side** -- 7 files:


| File                                            | Change                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/careerPath.ts`                         | Propagate `error.message` or `data?.error` instead of generic fallback |
| `src/lib/aiAnalysis.ts`                         | Same                                                                   |
| `src/lib/agenticChat.ts`                        | Same                                                                   |
| `src/lib/aiTailor.ts`                           | Same (for `tailorResume`, `parseJobUrl`, `generateCoverLetter`)        |
| `src/hooks/useProofread.ts`                     | Add `toast.error` when proofread edge function fails                   |
| `src/hooks/useATSSuggestions.ts`                | Add `data?.error` check                                                |
| `src/components/editor/tailor/QuickActions.tsx` | Add `data?.error` check and propagate server message                   |


---

### Technical Approach

**Shared server helper** (in `_shared/aiClient.ts`):

Add a `toUserError(error)` function that:

- If `isAIError`, maps to structured `{ error: type, message: friendly }` using the same map as `enhance-section`
- For generic errors, returns `{ error: "internal", message: "Something went wrong. Please try again." }` to avoid leaking internals
- Preserves the HTTP status code

**Client pattern** (standardized across callers):

```typescript
const { data, error } = await supabase.functions.invoke('fn-name', { body });
if (error) {
  const msg = error.message || 'Request failed';
  // check for known status patterns
  if (msg.includes('429')) throw new Error('Rate limit reached. Try again shortly.');
  if (msg.includes('401')) throw new Error('Session expired. Please sign in again.');
  throw new Error(msg);
}
if (data?.error) {
  throw new Error(data.message || data.error);
}
```

This ensures the server's specific error (rate limit, credits, validation) always reaches the user as a toast instead of being replaced with a generic string.