

## Fix: Persist AI Enhancements to Database + Block Re-optimization Abuse

### Root Cause

When you click "Improve Score" and apply enhancements, the improved content is saved **only in memory** (Zustand store). It is never written to the database. So:

1. After applying improvements, the immediate re-score uses the in-memory data -- shows 69%
2. When you click "Re-score", the page reads from the **database** (which still has the old data) -- drops back to 64%

### What Will Be Fixed

**Fix 1: Save enhanced data to the database immediately after applying**

When the AI Enhance sheet closes after improvements were applied:
- Read the updated resume from the in-memory store
- Save it to the database using the existing `updateResume` mutation
- Invalidate the data cache so the page refreshes with the new data
- Now "Re-score" reads the same improved data from the database -- score stays at 69%

**Fix 2: Block repeated optimization of the same section**

Track which sections have been improved in the current session. Already-improved sections show an "Already optimized" badge and are disabled. The user must go to the Editor and manually edit the section before they can re-optimize it. This prevents API abuse.

### Files Changed

| File | What Changes |
|------|-------------|
| `src/pages/ResumeDetailPage.tsx` | After the enhance sheet closes with applied changes, save the updated resume to the database using `updateResume.mutate()` and invalidate the React Query cache. Add state to track which sections were improved and pass it to the sheet. |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Accept an optional `disabledSections` prop. Sections in this set are shown as disabled with an "Already optimized" badge, preventing repeated API calls on the same content. |

### How It Works After the Fix

```text
User clicks "Improve Score" -> selects Summary -> AI enhances it
  -> User clicks "Apply" -> Zustand store updated
  -> User closes sheet -> Page detects changes were applied
  -> Page saves updated resume to database (UPDATE resumes SET summary = ...)
  -> React Query cache invalidated -> page re-fetches fresh data
  -> Re-score button now reads the improved data -> score stays 69%

User tries to improve Summary again -> section is disabled ("Already optimized")
User edits Summary manually in Editor -> section tracking resets -> can re-optimize
```

### Technical Details

In `ResumeDetailPage.tsx`, the `onOpenChange` callback (when the sheet closes and `enhancedRef.current` is true) will:

1. Get the updated resume from `useResumeStore.getState().currentResume`
2. Call `updateResume.mutate({ resumeId: dbResume.id, updates: updatedResume })`
3. On success, invalidate the `['resume', id]` query key
4. Then trigger the re-score (which will now use the fresh database data)

In `AIEnhanceSheet.tsx`, the `disabledSections` prop (a `Set<string>`) will:

1. Filter out disabled sections from the selectable list
2. Show them separately with an "Already optimized" badge
3. Prevent the user from selecting them for enhancement

