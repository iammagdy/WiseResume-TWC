

## Fix Three Issues: Score Resume Crash, `e.filter` Error, and AI Enhance UX

### Issue 1: Score Resume and `e.filter` Crashes (Same Root Cause)

The edge function `score-resume` crashes with `resume.skills?.join is not a function` because the AI Enhance feature can return skills as objects instead of plain strings. This same data corruption causes the `e.filter is not a function` crash on pages that call `experience.filter()` or `skills.filter()` from the Zustand store -- if AI enhancement returns non-array data, it gets merged into the store raw.

**Fix A: Edge function -- make `skills` handling defensive**

File: `supabase/functions/score-resume/index.ts`

- Change line that does `resume.skills?.join(', ')` to handle both `string[]` and object formats:
  ```
  Skills: ${Array.isArray(resume.skills) ? resume.skills.map(s => typeof s === 'string' ? s : s.name || String(s)).join(', ') : 'Not provided'}
  ```

**Fix B: AI Enhance sheet -- sanitize results before applying**

File: `src/components/editor/ai/AIEnhanceSheet.tsx`

- In `applyResult`, add a sanitization step that ensures arrays remain arrays and skills remain `string[]` before calling `updateResume`.

**Fix C: Resume store -- defensive array coercion on `updateResume`**

File: `src/store/resumeStore.ts`

- In the `updateResume` action, ensure `experience`, `education`, `skills` are always arrays before merging.

### Issue 2: AI Enhance Sheet Missing "Apply All" and "Done" Buttons

File: `src/components/editor/ai/AIEnhanceSheet.tsx`

- Add an "Apply All" button at the top of the results section that applies all unapplied enhancements at once.
- Add a sticky "Done" button at the bottom of the sheet that closes it, visible after results are shown.

### Issue 3: Jobs "Mark as Applied" Shows Nothing

The `createApplication` mutation in `ApplicationsPage.tsx` correctly creates the entry with status `'applied'`. However, the "My Applications" tab filters by `statusFilter` which defaults to `'all'`, and the query correctly fetches all. The issue is likely that the `job_applications` query cache isn't being invalidated when switching tabs. 

Fix: After `createApplication.mutate` succeeds, also invalidate the `job-activity-stats` query and switch to the Applications tab to show immediate feedback.

### Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/score-resume/index.ts` | Defensive skills handling for `.join()` |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Add "Apply All" + "Done" buttons; sanitize AI results before applying |
| `src/store/resumeStore.ts` | Defensive array coercion in `updateResume` |
| `src/pages/ApplicationsPage.tsx` | Switch to Applications tab after "Mark as Applied"; invalidate stats |
