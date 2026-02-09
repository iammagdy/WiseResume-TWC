
# Fix Wise AI Chat UI and Resume Save Error

## Issues Identified

### Issue 1: Cramped UI in AgenticChatSheet Header

From the screenshot, the header shows multiple elements competing for horizontal space:
- Bot icon + "Wise AI" title
- AIProviderBadge (shows "WiseResume AI" with settings icon)
- Brain icon + Switch toggle + "Pro" label
- Clear button (when messages exist)
- Sheet's built-in close button (X)

All these elements are trying to fit on one line, causing overlap on smaller screens.

### Issue 2: "Failed to save resume" Error

**Root Cause:** The resume ID `c201e295-f6d7-47ed-b558-e27b87b73f38` stored in zustand's localStorage doesn't exist in the database. The user's actual resume has ID `ede8e10d-1aef-4e1d-a728-d2a50e2901a8`.

This happens because:
1. zustand persists `currentResumeId` to localStorage
2. If a resume is deleted server-side or the database is reset, the local ID becomes stale
3. Auto-save attempts to PATCH a non-existent row, returning 406 error
4. The error toast appears every 2 seconds (the debounce interval)

---

## Solution

### Fix 1: Redesign AgenticChatSheet Header

Restructure the header to be responsive and avoid overlap:

**Current Layout (cramped on mobile):**
```text
[Bot][Wise AI][Badge]........[Brain][Switch][Pro][Clear][X]
```

**New Layout (two rows when needed):**
```text
[Bot] Wise AI                              [Clear][X]
[Badge]        [Brain][Switch] Pro
```

**Changes:**
1. Move AIProviderBadge to a second row or make it smaller on mobile
2. Remove duplicate elements (the Sheet already has a close button)
3. Use responsive classes to hide less critical elements on mobile
4. Improve spacing and alignment

### Fix 2: Handle Stale Resume IDs

Add validation in EditorPage to detect when `currentResumeId` points to a non-existent resume:

1. Check if the resume exists in database when loading
2. If it doesn't exist, clear the stale ID and redirect to dashboard
3. Add better error handling in the update mutation to detect 406 errors
4. Clear stale ID on 406 error to stop the error loop

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/editor/AgenticChatSheet.tsx` | Redesign header layout for mobile responsiveness |
| `src/pages/EditorPage.tsx` | Add validation for stale resume IDs |
| `src/hooks/useResumes.ts` | Better error handling for 406 errors |
| `src/store/resumeStore.ts` | Add action to clear stale resume ID |

---

## Implementation Details

### AgenticChatSheet Header Redesign

```tsx
<SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-border">
  {/* Row 1: Title and actions */}
  <div className="flex items-center justify-between gap-2">
    <SheetTitle className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary-foreground" />
      </div>
      <span className="font-semibold">Wise AI</span>
    </SheetTitle>
    
    {/* Right actions - simplified */}
    <div className="flex items-center gap-1">
      {messages.length > 0 && (
        <Button variant="ghost" size="icon" onClick={clearChat}>
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
  
  {/* Row 2: Badge and Thinking Mode */}
  <div className="flex items-center justify-between mt-2">
    <AIProviderBadge size="xs" showSettingsLink />
    <div className="flex items-center gap-1.5">
      <Brain className={cn('w-4 h-4', thinkingMode ? 'text-primary' : 'text-muted-foreground')} />
      <Switch checked={thinkingMode} onCheckedChange={toggleThinkingMode} className="scale-90" />
      <span className="text-xs text-muted-foreground">Pro</span>
    </div>
  </div>
</SheetHeader>
```

### EditorPage Stale ID Handling

```tsx
// Add to EditorPage
const { data: resumeFromDb, isLoading, error } = useResume(currentResumeId);

useEffect(() => {
  // If we have a currentResumeId but it doesn't exist in DB
  if (currentResumeId && !isLoading && !resumeFromDb && error) {
    console.warn('Stale resume ID detected, clearing...');
    setCurrentResumeId(null);
    toast.error('Resume not found. Please select a resume from the dashboard.');
    navigate('/dashboard');
  }
}, [currentResumeId, isLoading, resumeFromDb, error]);
```

### Better Error Handling in useResumes

```tsx
// In updateResume mutation
onError: (error: any) => {
  // Check for 406 error (no rows found)
  if (error?.message?.includes('PGRST116') || error?.code === 'PGRST116') {
    toast.error('Resume not found. It may have been deleted.');
    // Clear the stale ID
    useResumeStore.getState().setCurrentResumeId(null);
  } else {
    toast.error('Failed to save resume');
  }
  console.error(error);
},
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Cramped header UI | Too many elements on one row | Split into two rows, improve responsive layout |
| "Failed to save" loop | Stale resume ID in localStorage | Validate ID on load, handle 406 errors, clear stale IDs |
