

# Add Resume Editing Session Start/End Events to Audit Logs

## What Changes

### File: `src/pages/EditorPage.tsx`

1. **Import** `logAudit` from `@/lib/auditLogger`

2. **Session start**: Inside the existing hydration `useEffect` (line ~130), after the initial hydration branch (line ~150, where `lastSavedResumeRef.current` is set), add:
   ```typescript
   logAudit('account', 'editor_session_started', {
     resumeId: currentResumeId,
     resumeTitle: resumeFromDb.title,
   });
   ```

3. **Session end**: Add a new `useEffect` that fires a cleanup function on unmount, logging the session end with duration:
   ```typescript
   const sessionStartRef = useRef<number | null>(null);

   useEffect(() => {
     if (!currentResumeId || !currentResume) return;
     sessionStartRef.current = Date.now();
     return () => {
       if (sessionStartRef.current) {
         const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
         logAudit('account', 'editor_session_ended', {
           resumeId: currentResumeId,
           durationSeconds,
         });
       }
     };
   }, [currentResumeId]);
   ```
   This tracks how long the user spent editing and logs it when they leave the page.

## Summary

| Change | Detail |
|--------|--------|
| Import | `logAudit` from `@/lib/auditLogger` |
| Session start log | Fires once on initial resume hydration with `resumeId` and `resumeTitle` |
| Session end log | Fires on component unmount with `resumeId` and `durationSeconds` |
| Files changed | 1 (`src/pages/EditorPage.tsx`) |

No new dependencies, no database changes.
