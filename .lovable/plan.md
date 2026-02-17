

## Fix: Activity History Showing Non-Credit Entries

### Problem

The "Today's Activity" list in the Credit Usage Sheet shows ~50 "ATS Score" entries, but the credit counter only shows 9 used. This happens because:

- **Background scoring** (automatic dashboard scoring) calls the `score-resume` backend function, which **always** logs an entry to the activity table via `recordUsage`
- But background scoring does **not** deduct credits (by design, from our previous fix)
- Result: the activity list is flooded with entries that didn't cost credits, creating confusion

### Solution

Two changes to fix this:

**1. Backend: Skip logging for background calls** (`supabase/functions/score-resume/index.ts`)

- Accept an optional `background: true` flag in the request body
- When `background` is true, skip calling `recordUsage()` so no log entry is created
- Rate limiting still applies (via `checkRateLimit`)

**2. Client: Pass the background flag** (`src/hooks/useResumeScore.ts`)

- Update `invokeScoreResume` to accept an optional `background` parameter
- When `backgroundScore` calls it, pass `background: true`
- When `scoreResume` (user-initiated) calls it, pass nothing (defaults to false)

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/score-resume/index.ts` | Line 49: extract `background` from request body; Line 126: wrap `recordUsage` in `if (!background)` |
| `src/hooks/useResumeScore.ts` | Line 37: add `background?: boolean` param to `invokeScoreResume`; Line 52-53: pass it in the body; Line 120: call with `background: true` |

### What This Fixes

- Activity history only shows entries that actually cost credits
- The number in the activity list matches the credit counter (e.g., 9 entries = 9 credits used)
- Background ATS scoring still works silently without polluting the history
- Rate limiting remains intact for both background and user-initiated calls

