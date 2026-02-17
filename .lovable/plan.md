
## Fix: "useBlocker must be used within a data router" Error in Resume Editor

### Root Cause

The app uses `BrowserRouter` (the classic router), but `useBlocker` from react-router-dom v6 requires a **data router** created via `createBrowserRouter`. This causes the editor to crash immediately on load.

### Fix Strategy

Replace the `useBlocker` implementation in `useUnsavedChangesGuard.ts` with a custom navigation guard that works with `BrowserRouter`. The replacement will:

1. Use `useNavigate` and `useLocation` to intercept in-app navigation
2. Use `window.addEventListener('beforeunload', ...)` to catch browser/tab closes
3. Expose the same API (`isBlocked`, `proceed`, `cancel`, `saveAndProceed`) so no changes are needed in EditorPage or UnsavedChangesDialog

### Technical Details

**File: `src/hooks/useUnsavedChangesGuard.ts`**

- Remove `useBlocker` import
- Add a `useEffect` that listens to `beforeunload` events when dirty, prompting the browser's native "unsaved changes" dialog for tab closes
- Replace `useBlocker`-based blocking with a state-driven approach:
  - Track a `pendingPath` state (set when navigation is attempted while dirty)
  - Override navigation by intercepting the back button and in-app navigate calls
  - When the user confirms (proceed/saveAndProceed), navigate to the stored `pendingPath`
  - When the user cancels, clear `pendingPath`
- Export an `interceptNavigate` function that EditorPage uses instead of raw `navigate()` for any navigation away from the editor

**File: `src/pages/EditorPage.tsx`**

- Pass navigate function to the guard hook
- Use the guard's `interceptNavigate` wrapper for the back button and any other navigation triggers that should be guarded
- No changes needed to `UnsavedChangesDialog` since the guard exposes the same `isBlocked`, `proceed`, `cancel`, `saveAndProceed` interface

### Summary

| Item | Detail |
|------|--------|
| Error | `useBlocker` requires data router, app uses `BrowserRouter` |
| Fix | Replace `useBlocker` with custom state-based navigation guard |
| Files changed | `useUnsavedChangesGuard.ts`, `EditorPage.tsx` |
| Risk | Low -- same external API, no router migration needed |
