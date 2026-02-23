

# Fix: AI Credits Not Reflecting Provider Change

## Problem
The `useAICredits` hook decides whether to show "Unlimited" (BYOK) or normal credits based on `isBYOK` (derived from `aiProvider` and `geminiKeyValidated` in the settings store). However, `isBYOK` is **not included in the React Query cache key**.

The query key is:
```
['ai-credits', user?.id]
```

So when the user switches between WiseResume AI and their own Gemini key, React Query serves the **stale cached result** because the key hasn't changed. This causes the inconsistent display -- sometimes showing "Unlimited / using your own API key" and sometimes showing the normal credit counter, depending on which result was cached first.

## Solution
Add `isBYOK` to the query key so the cache invalidates when the provider changes.

### File: `src/hooks/useAICredits.ts`

**Change line 28** from:
```typescript
queryKey: ['ai-credits', user?.id],
```
to:
```typescript
queryKey: ['ai-credits', user?.id, isBYOK],
```

This single change ensures that whenever the user switches AI providers (or validates/clears their Gemini key), the query re-executes and returns the correct credits shape -- either unlimited for BYOK or the actual database credits for WiseResume AI.

## Technical Details
- One file modified: `src/hooks/useAICredits.ts`
- One line changed (query key)
- No risk to other functionality -- the query simply re-fetches with the correct branch when the provider state changes

