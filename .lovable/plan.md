

# Apply Back Button Fallback Fix

## Findings

After searching the entire codebase, `navigate(-1)` is only used in two places:

1. **`src/pages/InterviewPage.tsx`** -- still didnt work
2. **`src/hooks/useBackButton.ts`** -- The Android hardware back button handler (line 30)

All other pages with back arrows already navigate to specific routes (e.g., `/editor`, `/`), so they don't need this fix.

## Change

**`src/hooks/useBackButton.ts`** (line 30): Apply the same `window.history.length` check so the hardware back button navigates to `/dashboard` instead of doing nothing when there's no history.

```typescript
// Before
navigate(-1);

// After
window.history.length > 1 ? navigate(-1) : navigate('/dashboard');
```

This is a single one-line change affecting only this file.

