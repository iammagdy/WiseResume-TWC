
# Fix 3 Critical Bugs

## BUG 1: Studio Page Crash ("supabaseUrl is required")

**Root cause**: `src/hooks/useCompanyBriefing.ts` imports from `@/integrations/supabase/client` (the auto-generated one with no fallbacks). When environment variables are unavailable at runtime, `createClient()` throws. Since `CompanyBriefingSheet` is eagerly imported in `AIStudioPage.tsx`, the entire page crashes.

**Fix**: Change line 2 of `useCompanyBriefing.ts` from:
```
import { supabase } from '@/integrations/supabase/client';
```
to:
```
import { supabase } from '@/integrations/supabase/safeClient';
```
This matches the pattern used by every other file in the app.

---

## BUG 2: Sync Conflict Modal Blocking "Add Work Experience"

**Root cause**: In `EditorPage.tsx`, the hydration `useEffect` (line 127) includes `currentResume` in its dependency array. Every time the user edits the resume (including clicking "+ Add"), `currentResume` changes and the effect re-runs. The stale-detection logic at line 152 then compares `serverUpdatedAt > localLoadedAt`. Because `lastSavedResumeRef` is initialized to an empty string `''`, the `isClean` check always returns `false`, which triggers `setConflict()` -- showing the modal on any edit, not just real conflicts.

**Fix** (2 changes in `EditorPage.tsx`):

1. During initial hydration (around line 145), also initialize `lastSavedResumeRef` so future dirty-checks have a valid baseline:
```
localLoadedAtRef.current = resumeFromDb.updated_at ?? null;
lastSavedResumeRef.current = JSON.stringify(dbToResumeData(resumeFromDb));
```

2. In the stale-detection block (line 152), add a guard to skip when `localLoadedAt` is null (meaning we haven't finished initial hydration yet):
```
if (serverUpdatedAt && localLoadedAt && serverUpdatedAt > localLoadedAt) {
```
This is already present in the code, but the issue is that `localLoadedAt` gets set during hydration on the same render cycle, and on the next `currentResume` change the comparison fires. The real missing piece is point 1 above -- `lastSavedResumeRef` not being initialized.

---

## BUG 3: `/activity` Returns 404

**Root cause**: No route for `/activity` exists in `App.tsx`. The nav links work because they route to `/applications` internally, but direct URL access to `/activity` hits the catch-all 404.

**Fix**: Add a redirect route inside the protected routes block in `App.tsx`:
```tsx
import { Navigate } from 'react-router-dom';
// Inside the protected Routes:
<Route path="/activity" element={<Navigate to="/applications" replace />} />
```

---

## Summary of file changes

| File | Change |
|------|--------|
| `src/hooks/useCompanyBriefing.ts` | Line 2: change import to `safeClient` |
| `src/pages/EditorPage.tsx` | Line 145: add `lastSavedResumeRef.current = JSON.stringify(dbToResumeData(resumeFromDb));` after `localLoadedAtRef` initialization |
| `src/App.tsx` | Add `<Route path="/activity" element={<Navigate to="/applications" replace />} />` inside protected routes |

No UI, layout, styling, database, or dependency changes.
