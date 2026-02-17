

## Unsaved Changes Navigation Guard

### Problem

The editor has a `beforeunload` handler for browser refresh, but no protection against in-app navigation. Tapping "Home" in the BottomTabBar or pressing Android back while editing navigates away immediately, potentially losing unsaved work.

### Solution

Add a navigation blocker using react-router-dom's `useBlocker` hook, integrated with the Android hardware back button and a confirmation AlertDialog offering three choices.

### Changes

**1. New: `src/hooks/useUnsavedChangesGuard.ts`**

A custom hook that encapsulates dirty-state detection and navigation blocking:

- Accepts `resumeRef` and `lastSavedResumeRef` (the existing refs from EditorPage)
- Uses `useBlocker` from react-router-dom to intercept in-app route changes when state is dirty
- Exposes `isDirty`, `blocker` state, and `proceed` / `cancel` / `saveAndProceed` callbacks
- `saveAndProceed` calls the provided `saveToCloud` function, then proceeds with navigation
- `proceed` discards changes and proceeds
- `cancel` stays on the page

**2. New: `src/components/editor/UnsavedChangesDialog.tsx`**

An AlertDialog component rendered in EditorPage:

- Shows when `blocker.state === 'blocked'`
- Title: "You have unsaved changes"
- Description: "Your changes haven't been saved yet. What would you like to do?"
- Three actions:
  - "Save & Leave" (primary) -- calls `saveAndProceed`
  - "Discard" (destructive outline) -- calls `proceed`
  - "Cancel" (outline) -- calls `cancel`
- Uses existing AlertDialog components with glass-elevated styling

**3. Modified: `src/pages/EditorPage.tsx`**

- Import and call `useUnsavedChangesGuard({ resumeRef, lastSavedResumeRef, saveToCloud })`
- Render `<UnsavedChangesDialog>` component with the guard's state
- The existing `beforeunload` handler remains unchanged (covers browser refresh/tab close)

**4. Modified: `src/hooks/useBackButton.ts`**

- Accept an optional `onBeforeBack` callback parameter
- When on `/editor` route and `onBeforeBack` is provided, call it instead of navigating
- `onBeforeBack` returns `true` if navigation should be blocked (dirty state), `false` to proceed normally
- This allows EditorPage to intercept the hardware back button and show the dialog instead of navigating away

**5. Modified: `src/components/layout/BottomTabBar.tsx`**

- No changes needed. The `useBlocker` hook from react-router-dom automatically intercepts `navigate()` calls from any component, including BottomTabBar. When blocked, the navigation is paused and the dialog appears in EditorPage.

### Technical Details

**Dirty state detection (reuses existing logic):**

```text
const isDirty = () => {
  const current = JSON.stringify(resumeRef.current);
  return current !== lastSavedResumeRef.current && lastSavedResumeRef.current !== '';
};
```

**useBlocker integration:**

```text
// react-router-dom v6.30 supports useBlocker
const blocker = useBlocker(({ currentLocation, nextLocation }) => {
  return isDirty() && currentLocation.pathname !== nextLocation.pathname;
});
```

**Hardware back button integration in useBackButton:**

```text
// useBackButton accepts optional guard
export function useBackButton(onBeforeBack?: () => boolean) {
  // ...
  const handleBackButton = async () => {
    if (onBeforeBack && onBeforeBack()) {
      return; // blocked -- dialog will show
    }
    // existing logic...
  };
}
```

EditorPage passes a callback that checks dirty state and triggers the blocker dialog if dirty.

**Guest users:** For guests (no `user`), `lastSavedResumeRef` stays empty string, so `isDirty()` returns false. Guest data is persisted in Zustand/localStorage automatically, so no data loss risk. The guard only activates for authenticated users with cloud saves.

### Files Changed

- `src/hooks/useUnsavedChangesGuard.ts` (new) -- dirty state + useBlocker logic
- `src/components/editor/UnsavedChangesDialog.tsx` (new) -- confirmation AlertDialog
- `src/pages/EditorPage.tsx` (modified) -- integrate guard hook + render dialog
- `src/hooks/useBackButton.ts` (modified) -- accept optional guard callback

