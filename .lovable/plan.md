

## New Approach: Client-Side Health Tracking (No Edge Function Polling)

### Root Cause

The `ai-health` fetch **never actually fires** from the browser. The `new URL(import.meta.env.VITE_SUPABASE_URL + ...)` call throws because the env var is undefined in preview, and the error is silently caught. So every "check" immediately hits the catch block, incrementing the fail counter: first call = "AI Slow", second call (refresh) = "AI Unavailable". It never recovers because every attempt crashes the same way.

### New Strategy: Observe Real AI Calls Instead of Polling

Instead of polling a separate edge function, **track the outcomes of actual AI calls** the app already makes (score-resume, enhance-section, tailor-resume, etc.). This is more accurate than any synthetic health check because it reflects what the user is actually experiencing.

```text
Before (broken):
  Browser --poll every 60s--> ai-health edge function --AI call--> Gateway
  (URL construction fails, always shows "degraded/down")

After (reliable):
  Browser uses score-resume, enhance-section, etc. normally
  Each call reports success/failure to a shared store
  AIHealthBadge reads from the store -- no polling needed
```

### How It Works

1. **Optimistic default**: Badge shows "AI Online" on first load (no checking state, no skeleton)
2. **Real calls report outcomes**: When any AI feature (score-resume, enhance, tailor, etc.) completes, it calls `aiHealthStore.recordSuccess(latencyMs)` or `aiHealthStore.recordFailure(errorCode)`
3. **Health derived from last 5 calls**: All succeeded = healthy, some failed = degraded, all failed = down
4. **No polling, no edge function call, no env var dependency**

### Files to Change

**1. New file: `src/store/aiHealthStore.ts`**

A small Zustand store that tracks the last 5 AI call outcomes:
- `recordSuccess(latencyMs)` -- pushes a success entry
- `recordFailure(errorCode)` -- pushes a failure entry  
- `status` -- derived: if no data yet = "healthy" (optimistic), if >60% success = "healthy", if >0% success = "degraded", if 0% = "down"
- `latencyMs` -- average of recent successful calls
- `lastChecked` -- timestamp of most recent call
- `provider` -- read from settingsStore

**2. Rewrite: `src/hooks/useAIHealth.ts`**

Remove all fetch/polling logic. Instead, just read from `aiHealthStore` and return the same interface. The hook becomes a thin wrapper:
- No fetch calls, no intervals, no fail counters
- Returns `{ status, latencyMs, lastChecked, provider, errorCode, refetch }` where `refetch` is a no-op (or triggers a manual score-resume ping)

**3. Simplify: `src/components/ai/AIHealthBadge.tsx`**

- Remove toast logic entirely (no more false alerts)
- Remove `hasSeenHealthyRef` and `prevStatusRef` complexity
- Just display the status from the store
- Keep the popover with latency/provider info
- Keep the "Use Your Own API Key" link

**4. Add reporting to existing AI hooks**

Add a single line to hooks that call AI edge functions. The pattern:

```typescript
// In any AI-calling hook, after the fetch:
import { useAIHealthStore } from '@/store/aiHealthStore';

const start = Date.now();
const resp = await supabase.functions.invoke('score-resume', { body });
const latency = Date.now() - start;

if (resp.error) {
  useAIHealthStore.getState().recordFailure(resp.error.status || 0);
} else {
  useAIHealthStore.getState().recordSuccess(latency);
}
```

The hooks that need this one-liner added (high-traffic ones only):
- `src/hooks/useResumeScore.ts` (score-resume -- called on every dashboard load)
- `src/hooks/useAIEnhance.ts` (enhance-section)
- `src/hooks/useProofread.ts` (proofread-resume)

These 3 hooks cover the most common AI calls. Since score-resume runs on every dashboard visit, the health store will have data within seconds of app load.

**5. No changes to edge functions**

The `ai-health` edge function stays as-is but is no longer called. It can be removed later.

### Technical Details

The store keeps a sliding window of the last 5 results:

```typescript
interface AICallResult {
  success: boolean;
  latencyMs: number;
  errorCode: number | null;
  timestamp: number;
}

// Derive status:
const successes = results.filter(r => r.success).length;
if (results.length === 0) return 'healthy'; // optimistic default
if (successes === results.length) return 'healthy';
if (successes > 0) return 'degraded';
return 'down';
```

### What This Fixes

- No more "AI Slow" on load (optimistic default)
- No more "AI Unavailable" on refresh click (no synthetic check to fail)
- No more env var dependency for URL construction
- No more wasted edge function calls for health checks
- Status reflects **actual** AI performance the user is experiencing
- Zero network overhead for health monitoring

