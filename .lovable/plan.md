

## Fix AI Health Indicator -- Make It Real

### Root Cause

The health check is fundamentally flawed: the edge function (`ai-health`) makes a **real AI API call** (sends "hi" to the Lovable gateway) to determine if the AI is healthy. This is circular -- you're using the AI to check if the AI works. If the health check's own AI call fails (cold start, timeout, transient error), it reports "down" even though the AI service is perfectly functional for real requests.

I verified this by calling the edge function directly -- it returned `healthy` with 495ms latency. But from the user's browser, the call can fail intermittently (cold start, network timing), triggering the false "AI Unavailable" state.

### Solution: Lightweight Ping Instead of AI Call

Replace the edge function's AI API call with a simple connectivity check. The edge function should:
1. Verify the `LOVABLE_API_KEY` env var exists (proves config is valid)
2. For Gemini users: do a lightweight model list call (`GET /v1beta/models`) instead of a chat completion
3. For default users: just return `healthy` -- the edge function itself being reachable proves the backend is alive. The real AI calls already have their own error handling in each feature.

This eliminates the circular dependency and stops burning AI credits on health checks.

### Changes

**1. `supabase/functions/ai-health/index.ts` -- Rewrite to lightweight check**

- Remove the chat completion call entirely for the default (WiseResume) path
- For Gemini key users, use `GET /v1beta/models/{model}` which is free and doesn't consume tokens
- Return `healthy` if the edge function is reachable and config is valid
- Return `degraded` only if the Gemini key validation fails with a 429
- Return `down` only if no API key is configured at all

**2. `src/hooks/useAIHealth.ts` -- Simplify and fix timing**

- Increase initial poll interval: first check on mount, then 5 min when healthy
- On the very first check, if it fails, set `degraded` (not `down`) regardless of threshold
- This prevents the false "AI Unavailable" on cold start

**3. `src/components/ai/AIHealthBadge.tsx` -- Remove toast entirely for initial loads**

- Only show toasts if a *transition* from healthy to degraded/down happens (not on mount)
- Track previous status to detect transitions

### Files

| File | Change |
|------|--------|
| `supabase/functions/ai-health/index.ts` | Replace AI chat call with lightweight connectivity check |
| `src/hooks/useAIHealth.ts` | Fix initial status logic; ensure first failure never shows "down" |
| `src/components/ai/AIHealthBadge.tsx` | Toast only on status transitions, not initial load |

