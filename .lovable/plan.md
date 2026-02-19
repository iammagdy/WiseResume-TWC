

# Interview Tool: Deep Fix and Power-Up

## Root Cause: "Not Replying"

The interview tool fails silently due to multiple compounding issues:

1. **No retry/fallback**: The edge function uses `callAI()` (single attempt, 30s timeout) instead of `callAIWithRetry()` which has 3 attempts with escalating timeouts and a fallback model. If the first AI call times out or hits a transient 5xx, the interview just dies.

2. **No maxTokens cap**: Without a token limit, the AI can generate very long responses that exceed the edge function execution time, causing a silent timeout.

3. **Fragile error surfacing**: When `supabase.functions.invoke` receives a non-2xx HTTP response, the error details are in the `error` object but the `.message` may just say "Edge Function returned a non-2xx status code". The actual error body (rate limit, timeout, etc.) is lost, so the user sees a generic "Failed to get AI response" toast.

4. **System prompt bloat**: The full system prompt (with resume context and instructions) is sent as the first message on EVERY call. As the conversation grows, this wastes tokens and increases latency, eventually causing timeouts in longer interviews.

## Plan

### 1. Edge Function: Use `callAIWithRetry` + Add `maxTokens`

**File: `supabase/functions/interview-chat/index.ts`**

- Replace `callAI` with `callAIWithRetry` for both the main interview loop AND role analysis
- Add `maxTokens: 1024` for regular interview turns (keeps responses focused and fast)
- Add `maxTokens: 512` for role analysis (it only needs structured JSON)
- Add `maxTokens: 1500` for end-of-interview summaries (needs more space)

### 2. Edge Function: Improve System Prompt for Better Interviews

Upgrade the interview system prompt to produce higher-quality, more realistic interviews:

- Add interviewer persona with name and style
- Add structured STAR method guidance for behavioral questions
- Add difficulty progression (start easy, increase)
- Differentiate question types more clearly
- Make feedback more actionable with specific improvement suggestions
- For Quick Practice: explicitly track question count and auto-end after 5

### 3. Client: Fix Error Surfacing

**File: `src/hooks/useVoiceInterview.ts`**

The `supabase.functions.invoke` error handling needs to extract the actual error message from the response body. When the function returns 4xx/5xx, the Supabase client puts the parsed body in `error.context` or `error.message` may be generic. Fix:

```
// Current (broken):
if (fnError) throw fnError;

// Fixed: extract actual message
if (fnError) {
  const msg = data?.error || data?.message || fnError.message || 'Interview request failed';
  throw new Error(msg);
}
```

Note: When `supabase.functions.invoke` returns a non-2xx, `data` still contains the parsed response body (the error JSON), and `error` is an `FunctionsHttpError` with a generic message. So we need to check `data` first.

### 4. Client: Add "Taking longer..." Toast

If the AI call takes more than 8 seconds, show an informational toast so the user knows it's working. This prevents the "is it broken?" feeling.

### 5. Edge Function: Upgrade Model for Role Analysis

Use `google/gemini-2.5-pro` (stronger reasoning) for role analysis since it only happens once per session and quality matters. Keep `google/gemini-2.5-flash` for the conversational turns where speed matters.

---

## Summary of File Changes

| File | Changes |
|---|---|
| `supabase/functions/interview-chat/index.ts` | Switch to `callAIWithRetry`; add `maxTokens`; upgrade system prompts for quality; use pro model for role analysis |
| `src/hooks/useVoiceInterview.ts` | Fix error extraction from `supabase.functions.invoke`; add "taking longer" toast for slow responses |

## Technical Details

### Upgraded System Prompt (interview turns)

The new prompt will:
- Give the AI a name ("Sarah" or "Michael" based on voice gender -- passed as a field)
- Instruct it to follow STAR method for behavioral questions
- Progress difficulty: Q1-2 easy warmup, Q3-5 medium, Q6+ challenging
- Keep feedback to 2-3 sentences max before next question
- Ensure the SCORE block is always present after user answers

### Error Extraction Pattern

```typescript
const { data, error: fnError } = await Promise.race([aiPromise, timeoutPromise]);

if (fnError) {
  // data may still contain the JSON error body even on non-2xx
  const errorMessage = data?.error || data?.message || fnError?.message || 'Interview request failed';
  throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Interview request failed');
}
if (data?.error) throw new Error(data.error);
```

### Slow Response Toast

```typescript
const slowTimer = setTimeout(() => {
  toast.info('Taking longer than usual...', {
    description: 'Wise AI is thinking hard. Hang tight!',
    duration: 3000,
  });
}, 8000);

try {
  // ... await AI call
} finally {
  clearTimeout(slowTimer);
}
```

