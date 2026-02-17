

## Remaining Security Refactor: Session Cache Cleanup + Server-Side Rate Limiting

### Task 1: Remove Redundant Manual Session Cache from AuthContext

The Supabase SDK already persists sessions via `persistSession: true` (the default). The manual `sb-auth-session-cache` in `AuthContext.tsx` duplicates this, creating a stale-session risk.

**Changes to `src/contexts/AuthContext.tsx`:**
- Delete `SESSION_CACHE_KEY` constant
- Delete `getCachedSession()` function
- Delete `cacheSession()` function
- Remove all `cacheSession()` calls (lines 80, 134)
- Remove cached pre-hydration in `useState` initializer -- start with `{ user: null, session: null, loading: true }` always
- Remove `getCachedSession()` call in `activeUserIdRef` initializer -- start with `null`
- Remove `localStorage.removeItem(SESSION_CACHE_KEY)` from `signOut`

The Supabase SDK handles session restoration automatically before firing `INITIAL_SESSION`, so the loading state will resolve quickly without the manual cache.

---

### Task 2: Add Server-Side Rate Limiting to All AI Edge Functions

Currently only `score-resume` and `enhance-section` use the shared `checkRateLimit`/`recordUsage` helpers. All other AI-calling edge functions need them added.

**Pattern (already established in `score-resume`):**
```typescript
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

// After auth check, before processing:
const rateCheck = await checkRateLimit(user.id, { maxRequests: N, windowSeconds: 60, actionType: 'action_name' });
if (!rateCheck.allowed) {
  return new Response(
    JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// After successful AI response, before returning:
await recordUsage(user.id, 'action_name');
```

**Functions to update (16 files) with rate limits:**

| Function | actionType | maxRequests/min | Rationale |
|---|---|---|---|
| `analyze-resume` | `analyze` | 10 | Heavy analysis |
| `tailor-resume` | `tailor` | 10 | Heavy processing |
| `agentic-chat` | `chat` | 30 | Conversational, higher volume |
| `interview-chat` | `interview` | 30 | Conversational |
| `proofread-resume` | `proofread` | 15 | Medium complexity |
| `fill-gap` | `fill_gap` | 20 | Quick operation |
| `explain-gap` | `explain_gap` | 20 | Quick operation |
| `generate-cover-letter` | `cover_letter` | 10 | Heavy generation |
| `generate-resignation-letter` | `resignation` | 10 | Heavy generation |
| `career-assessment` | `career_assess` | 10 | Heavy analysis |
| `career-path-advisor` | `career_path` | 10 | Heavy analysis |
| `detect-and-humanize` | `detect_humanize` | 15 | Medium |
| `one-page-optimizer` | `one_page` | 10 | Heavy |
| `optimize-for-linkedin` | `linkedin_opt` | 10 | Heavy |
| `parse-job-url` | `parse_job` | 20 | Quick parsing |
| `parse-linkedin` | `parse_linkedin` | 10 | Medium |
| `parse-resume` | `parse_resume` | 10 | Heavy parsing |
| `recruiter-simulation` | `recruiter_sim` | 10 | Heavy |

**Functions NOT rate-limited (non-AI or utility):**
- `ai-health` (health check, no AI call)
- `elevenlabs-scribe-token` (token generation, no AI call)
- `manage-api-keys` (key CRUD, no AI call)
- `send-bug-report` (email, no AI call)
- `send-push-notification` (push, no AI call)
- `generate-headshot` (external API, separate billing)

---

### Summary

- **Modified**: 1 file (`AuthContext.tsx`) for session cache removal
- **Modified**: 16 edge function files to add rate limiting imports and checks
- All changes follow existing patterns already established in the codebase
