

## Real AI Health Status Indicator

### How It Works (No Faking)

The indicator performs an actual lightweight request to the AI gateway to verify it responds. This is a real health check -- if the gateway is down or rate-limited, the indicator shows degraded/down status. If it responds normally, it shows healthy.

---

### Architecture

The system has three layers:

1. **Edge Function (`ai-health`)**: Sends a minimal AI completion request (single token, cheapest model) to the Lovable AI gateway and measures response time. Returns real status: `healthy`, `degraded`, or `down`, plus latency in milliseconds.

2. **Client Hook (`useAIHealth`)**: Polls the edge function every 60 seconds (configurable). Caches the result in a Zustand-like React state. Skips polling when the browser tab is hidden (via `visibilitychange`). If using a custom Gemini key, also pings the Gemini endpoint separately.

3. **UI Component (`AIHealthBadge`)**: A small pill/dot shown in the AppShell header area and on any AI-powered sheet. Shows:
   - Green dot + "AI Online" when healthy (latency < 5s)
   - Yellow dot + "AI Slow" when degraded (latency 5-15s or intermittent errors)
   - Red dot + "AI Unavailable" when down (gateway returns error or timeout)
   - Tapping it opens a popover with details: latency, provider name, last checked time, and a "Use Your Own Key" link if on WiseResume AI

---

### New Files

#### 1. `supabase/functions/ai-health/index.ts`

Edge function that:
- Accepts GET requests (no body needed)
- Optionally accepts `userGeminiKey` in query params for custom key health check
- Sends a minimal request to the gateway: `{ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }`
- Measures round-trip time
- Returns JSON: `{ status: "healthy" | "degraded" | "down", latencyMs: number, timestamp: string, provider: "wiseresume" | "gemini" }`
- Catches 429/402/timeout errors and returns appropriate status (not throwing -- this is a health check)
- Uses the cheapest, fastest model (`gemini-2.5-flash-lite`) with `max_tokens: 1` to minimize cost (essentially free)

#### 2. `src/hooks/useAIHealth.ts`

Custom hook that:
- Calls the `ai-health` edge function on mount and every 60 seconds
- Pauses polling when tab is hidden
- Stores: `status`, `latencyMs`, `lastChecked`, `provider`
- Exposes `refetch()` for manual refresh
- Uses the user's Gemini key from settings store when applicable

#### 3. `src/components/ai/AIHealthBadge.tsx`

Small badge component:
- Renders a colored dot (green/yellow/red) + short label
- On tap: opens a Popover with full details
- Shows "Checking..." skeleton on first load
- When status is `degraded` or `down`, shows a brief warning toast on first detection (once per session, not on every poll)
- Includes "Use Your Own Key" button when on WiseResume AI and status is not healthy

---

### Integration Points

#### `src/components/layout/AppShell.tsx`
- Add `AIHealthBadge` as a small floating indicator in the top-right corner, only visible on pages with AI features (editor, ai-studio, interview, cover-letter, career)

#### `supabase/config.toml`
- Add `[functions.ai-health]` with `verify_jwt = false` (health checks should work for everyone)

---

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/ai-health/index.ts` | New -- real health check edge function |
| `supabase/config.toml` | Add ai-health function config |
| `src/hooks/useAIHealth.ts` | New -- polling hook with visibility awareness |
| `src/components/ai/AIHealthBadge.tsx` | New -- visual status indicator with popover |
| `src/components/layout/AppShell.tsx` | Add AIHealthBadge to AI-related pages |

### Cost Impact

Each health check uses `gemini-2.5-flash-lite` with `max_tokens: 1`. This is the cheapest possible AI call -- effectively free. At 1 poll per minute per active user, cost is negligible.

### What Makes This Real

- The edge function makes an actual AI gateway request, not a simple HTTP ping to a static endpoint
- If the AI gateway is down, the health check fails and the indicator turns red
- If the gateway is slow (high load), latency is measured and the indicator turns yellow
- If the gateway returns 429 (rate limited) or 402 (credits exhausted), the indicator accurately reflects this
- When using a custom Gemini key, it checks that specific key's health against Google's API
