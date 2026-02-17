
## Fix: "Rendered more hooks than during the previous render" in ResumeDetailPage

### Root Cause

On line 78 of `ResumeDetailPage.tsx`, the `useATSScoreHistoryStore` hook is called **after** early returns (loading state on line 57, not-found state on line 65). When the component returns early, fewer hooks run than on a full render, causing React's "Rendered more hooks than during the previous render" error.

### Fix

**File: `src/pages/ResumeDetailPage.tsx`**

Move the `useATSScoreHistoryStore` call (line 78) up to join the other hooks at the top of the component (before line 57), alongside the other store/hook calls. Since `getHistory` needs `dbResume.id`, use a conditional call pattern:

```typescript
const scoreHistory = useATSScoreHistoryStore(s => id ? s.getHistory(id) : []);
```

This ensures the hook is always called on every render, regardless of whether `dbResume` has loaded yet.

### Summary

| Item | Detail |
|------|--------|
| Error | Hooks called after early return violates Rules of Hooks |
| Fix | Move `useATSScoreHistoryStore` above the early returns |
| Files changed | `ResumeDetailPage.tsx` |
| Risk | None -- same behavior, just correct hook ordering |
