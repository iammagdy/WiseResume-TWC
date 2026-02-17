

## Fix: Eliminate Phantom Score Changes from Client-Side Cache Bugs

### What's Actually Happening

I tested the scoring function directly -- calling it twice with the exact same data produces **identical results** (score: 60 both times). The function is working correctly and is 100% deterministic.

The problem is on the **client side** -- three bugs cause the app to show different scores even when the user hasn't intentionally changed anything:

1. **Background scoring uses a random cache key**: In the Editor, every auto-save triggers a background score with `new Date().toISOString()` as the cache key. This means the cache NEVER works for background scores, and each one creates a new history entry with potentially stale data.

2. **Score history pollution**: Every background score adds a new entry to the ATS Score History chart. If the editor auto-saved tiny formatting changes (whitespace, field ordering), each background score may produce a slightly different result, creating a false "trend."

3. **Data source mismatch**: The ResumeDetailPage reads resume data from the database via `dbToResumeData()`, but the Editor's background scorer reads from the Zustand store. These can differ slightly (e.g., after AI enhancements are applied to the store but not yet saved).

### The Fix (3 Changes)

#### 1. Fix background scoring cache key (`src/pages/EditorPage.tsx`)

Replace `new Date().toISOString()` with a **content hash** of the resume data. This way:
- If the resume content hasn't changed, the cache hits and no network call is made
- If it HAS changed, a new score is correctly computed
- No more phantom history entries

Use a simple JSON string hash to generate a stable cache key from the actual resume content.

#### 2. Add content-based deduplication to score history (`src/store/atsScoreHistoryStore.ts`)

Before adding a new score entry, check if the most recent entry has the **same overall score and same category scores**. If so, skip the duplicate. This prevents the history chart from showing fake "changes."

#### 3. Normalize resume data before sending to scorer (`src/hooks/useResumeScore.ts`)

Add a `normalizeForScoring()` function that strips fields irrelevant to scoring (like `id`, `createdAt`, `updatedAt`, `templateId`) and ensures consistent field ordering. This guarantees that two resumes with the same content always produce the same request body, regardless of which page triggered the scoring.

### Technical Details

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Replace `new Date().toISOString()` cache key with a stable content hash derived from `JSON.stringify(resume)` |
| `src/store/atsScoreHistoryStore.ts` | Add deduplication check in `addScore()` -- skip if latest entry has identical scores |
| `src/hooks/useResumeScore.ts` | Add `normalizeForScoring()` to strip non-content fields and ensure consistent data shape before sending to the backend |

### What This Guarantees

- Re-scoring the same CV will always show the exact same number
- The score history chart will only show real changes, not noise
- Background scoring in the editor will not pollute the history with duplicate entries
- The scoring function remains 100% deterministic (already working correctly)

