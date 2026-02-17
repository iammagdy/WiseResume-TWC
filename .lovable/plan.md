

## Fix: Score Reverts After Re-score + Unlimited Improve Abuse

### Problem 1: Enhanced Data Not Saved to Database

When the user clicks "Improve Score" on the Resume Detail Page and applies AI enhancements:

1. The enhanced data is written to the **Zustand store** (in-memory only)
2. The immediate re-score after closing the sheet uses the Zustand store data -- so it correctly shows 69%
3. But when the user clicks **"Re-score"** manually, the page reads `resumeData` from `dbToResumeData(dbResume)` -- the **database**, which still has the old un-enhanced data
4. Result: score drops back to 64%

The root cause is that the Resume Detail Page has no database save logic. The `saveToCloud` function only exists in the Editor Page.

### Problem 2: Unlimited Section Improvement

Users can select the same section (e.g., Summary) for "Improve Score" over and over, each time getting new "improvements" that consume AI credits and server resources. There is no tracking of which sections have already been optimized.

### Fix Plan

#### 1. Save enhanced data to the database after applying (`src/pages/ResumeDetailPage.tsx`)

After the AI Enhance Sheet closes and the user has applied changes:
- Read the updated resume from the Zustand store
- Call `supabase.from('resumes').update(...)` to persist the enhanced content to the database
- Invalidate the React Query cache so the page re-fetches the latest data from the database
- This ensures "Re-score" reads the same enhanced data

#### 2. Use the updated (saved) data for Re-score (`src/pages/ResumeDetailPage.tsx`)

After saving to the database, the re-score button will naturally use the refreshed `dbResume` data since React Query will refetch it.

#### 3. Track improved sections and block re-improvement (`src/components/editor/ai/AIEnhanceSheet.tsx`)

- Add a `recentlyImprovedSections` prop (a `Set<SectionType>`) to the AIEnhanceSheet
- Sections that were already improved in the current session are shown as disabled with a "Already optimized" badge
- The user must actually edit the section content in the Editor before they can re-optimize it
- This prevents API abuse while still allowing legitimate re-optimization after real edits

#### 4. Track improved sections in ResumeDetailPage state (`src/pages/ResumeDetailPage.tsx`)

- Add a `useState<Set<SectionType>>` to track which sections have been improved
- When the AIEnhanceSheet reports `onEnhanced`, record the improved sections
- Pass this set to AIEnhanceSheet as `recentlyImprovedSections`
- Reset when the user navigates away or edits in the Editor

### Technical Details

| File | Change |
|------|--------|
| `src/pages/ResumeDetailPage.tsx` | Add database save after enhancement is applied; add improved-sections tracking state; pass it to AIEnhanceSheet; invalidate React Query cache after save |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Accept `recentlyImprovedSections` prop; disable already-improved sections in the section selector; show "Already optimized" badge |
| `src/hooks/useResumes.ts` | Verify that `useResume` query key allows invalidation (likely already works) |

### What This Guarantees

- After applying AI improvements, the data is saved to the database immediately
- "Re-score" will always read the latest saved data, so scores remain consistent
- Users cannot repeatedly optimize the same section without making real edits first
- AI credits and server resources are protected from abuse
- The score only changes when actual content changes -- no more phantom drops

