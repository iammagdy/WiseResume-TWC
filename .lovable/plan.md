

# Fix: Two Root Causes of Editor Page Crash

## Issue 1: InlineAIButton's Radix DropdownMenu (Primary Crash)

The console stack trace explicitly points to `InlineAIButton` -> `DropdownMenu` -> `Popper` as the source of the "Maximum update depth exceeded" error. Radix's `Popper` component (used internally by DropdownMenu) has the same ref-management conflict with React 18 that caused the previous Tabs crashes.

`InlineAIButton` is rendered inside every section (Contact, Summary, Experience, Education, Skills), so it fires on every tab.

**Fix:** Replace Radix `DropdownMenu` in `InlineAIButton.tsx` with a simple state-controlled popover using a plain `div` + `useState` for open/close. This eliminates Radix's Popper from the editor tree entirely.

## Issue 2: Save-on-Unmount Infinite Loop (Secondary Crash)

The runtime error stack trace shows:
```
setIsSaving (resumeStore.ts:45:32)
  at EditorPage.tsx:179:9
```

In `EditorPage.tsx` lines 170-181, the "save on unmount" effect calls `saveToCloud()`, which calls `setIsSaving(true)`. This updates the zustand store, triggering a re-render, which re-runs effect cleanup, which calls `saveToCloud()` again -- infinite loop.

**Fix:** In the unmount effect, call `updateResume.mutateAsync()` directly as a fire-and-forget without updating `isSaving` state. Alternatively, use a ref to track saving status instead of zustand state in the unmount path.

## Changes

### File 1: `src/components/editor/InlineAIButton.tsx`
- Remove Radix `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` imports
- Add `useState` and `useRef`/`useEffect` for click-outside handling
- Replace with a button that toggles a positioned `div` dropdown
- Keep the same visual appearance and action items
- Keep `AIProviderFooter` at the bottom of the menu

### File 2: `src/pages/EditorPage.tsx`
- Remove the save-on-unmount effect (lines 170-181) that calls `saveToCloud()` during cleanup
- Replace with a simpler unmount handler that directly calls the mutation without `setIsSaving`:

```text
BEFORE (lines 170-181):
  useEffect(() => {
    return () => {
      clearTimeout(...)
      if (user && currentResumeId && currentResume) {
        saveToCloud();  // <-- calls setIsSaving, triggers infinite loop
      }
    };
  }, [user, currentResumeId, currentResume, saveToCloud]);

AFTER:
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);
  // Save-on-unmount removed -- the 2s debounce already covers normal edits
  // and calling setIsSaving in cleanup triggers the infinite loop
```

## Summary

| File | Change | Fixes |
|------|--------|-------|
| `src/components/editor/InlineAIButton.tsx` | Replace Radix DropdownMenu with plain div dropdown | Primary crash: DropdownMenu Popper infinite setState |
| `src/pages/EditorPage.tsx` | Remove save-on-unmount effect that calls setIsSaving | Secondary crash: zustand setState in cleanup loop |

