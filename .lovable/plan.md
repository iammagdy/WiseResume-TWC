

## Fix: Zustand Selector Instability Causing Infinite Re-render Loop

### Root Cause

The "Maximum update depth exceeded" error originates from **unstable Zustand selectors** in `src/hooks/useProofread.ts`, NOT from Radix Tooltip (the previous fixes were necessary but didn't address this deeper issue).

The stack trace confirms this: `forceStoreRerender` -> `updateStoreInstance` -> `commitHookEffectListMount` is the classic Zustand `useSyncExternalStore` infinite loop pattern.

Two problems in `useProofread.ts`:

1. **Line 58** - `useProofreadStore(selectActiveIssues)`: The `selectActiveIssues` selector uses `.filter()`, which returns a **new array reference on every call**. Zustand compares references (not deep equality), detects a "change", forces a re-render, which runs the selector again, gets another new array, and loops infinitely.

2. **Line 56-57** - `useProofreadStore()` with no selector: Subscribes to the **entire store object**, so any state change (even unrelated) triggers a re-render in every component using this hook.

### Secondary Issue

`src/components/editor/ai/AIProviderBadge.tsx` still uses Radix `Tooltip` (lines 99-115) and renders inside the editor tree via `InlineAIButton` -> `AIProviderFooter`. While not the primary crash cause, it should also be cleaned up per the architectural rule.

### Fix (2 files)

#### File 1: `src/hooks/useProofread.ts`

- Replace `useProofreadStore()` (whole-store subscription) with **individual selectors** for each needed property
- Wrap `selectActiveIssues` with `useShallow` from `zustand/react/shallow` to prevent new-reference loops
- This ensures Zustand only re-renders when the actual data values change, not just the array reference

```ts
// Before (unstable):
const { issues, score, isChecking, setIssues, ... } = useProofreadStore();
const activeIssues = useProofreadStore(selectActiveIssues);

// After (stable):
const issues = useProofreadStore(s => s.issues);
const score = useProofreadStore(s => s.score);
const isChecking = useProofreadStore(s => s.isChecking);
const setIssues = useProofreadStore(s => s.setIssues);
const setScore = useProofreadStore(s => s.setScore);
const setIsChecking = useProofreadStore(s => s.setIsChecking);
const removeIssue = useProofreadStore(s => s.removeIssue);
const ignoreIssue = useProofreadStore(s => s.ignoreIssue);
const clear = useProofreadStore(s => s.clear);
const activeIssues = useProofreadStore(useShallow(selectActiveIssues));
```

#### File 2: `src/components/editor/ai/AIProviderBadge.tsx`

- Remove the `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` wrapper from the `AIProviderBadge` component
- Replace with a plain clickable element (the badge is already a button with visible text)
- Remove the Tooltip imports

### Why This Fixes the Crash

- Stable selectors prevent Zustand from detecting false "changes" that trigger infinite re-render loops
- Individual property selectors ensure components only re-render when the specific data they consume changes
- `useShallow` performs shallow comparison on the filtered array, breaking the infinite loop cycle
- Removing the remaining Radix Popper component from the editor tree eliminates a secondary source of render instability
