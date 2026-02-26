
Goal: stop the recurring “Sync Conflict Detected” loop that blocks editing, while keeping real multi-device conflict protection intact.

What is actually causing your loop
1) False conflict race in the editor:
- The editor compares server `updated_at` vs a local baseline (`localLoadedAtRef`).
- After a successful save, that baseline is set from stale query data (not the mutation response timestamp).
- When query refetch returns your own newer save while you’re still typing, it looks like “another device changed it” and opens the conflict dialog.

2) Conflict action mismatch:
- Editor-created conflicts are set directly with `setConflict(...)`.
- Dialog actions (`forceSync` / `discardLocal`) are built around pending queue entries.
- In some editor conflict cases, “Overwrite with My Changes” can become effectively a no-op, so the issue reappears.

Implementation plan

1) Fix timestamp baseline race in `src/pages/EditorPage.tsx`
- In `saveToCloud`, capture the return value from `updateResume.mutateAsync(...)`.
- Set `localLoadedAtRef.current` from the mutation result’s `updated_at` (authoritative server value), not from possibly stale `resumeFromDb`.
- Keep `lastSavedResumeRef.current` update as-is.
- Use normalized numeric timestamp comparison (`Date.parse`) in conflict checks for consistency.

2) Track real local edit time (not “now at dialog open”) in `src/pages/EditorPage.tsx`
- Add `lastLocalEditAtRef` updated whenever resume content changes (post-initial hydration).
- Use that timestamp when constructing conflict payloads instead of raw `Date.now()` at detection time.
- This prevents misleading “local change is newer than server” wording artifacts and improves decision clarity.

3) Unify editor conflicts with conflict resolution path
- Update editor conflict branches (both hydration stale check + pre-save guard) to provide a resolvable local snapshot path:
  - Either enqueue pending change before setting conflict, or
  - Make `useOfflineSync.forceSync` fallback to `conflictingChange.change` when queue lookup misses.
- Preferred minimal-risk path: add fallback in `useOfflineSync.ts` so dialog actions always work, even if queue entry is absent.

4) Add loop guard for identical conflict in `src/pages/EditorPage.tsx`
- Prevent reopening the exact same conflict repeatedly (`resumeId + serverUpdatedAt` key) unless local content changes again.
- This preserves protection for genuine new conflicts but stops modal spam.

5) Improve dialog recovery behavior in `src/components/editor/SyncConflictDialog.tsx`
- Keep current two primary actions, but ensure both always resolve state:
  - “Keep Server Version” should clear local conflicting draft state and refresh from server.
  - “Overwrite with My Changes” should always execute a concrete write path (not just clear modal).
- Keep mobile-first usability (xs): stacked actions remain tappable and non-overlapping.

Files to update
- `src/pages/EditorPage.tsx` (main race + conflict creation logic)
- `src/hooks/useOfflineSync.ts` (reliable overwrite/discard conflict resolution fallback)
- `src/store/offlineSyncStore.ts` (only if optional metadata needed for conflict dedupe/source typing)
- `src/components/editor/SyncConflictDialog.tsx` (small behavior/wording hardening)

No backend/database changes required
- This is a client-side state/timing/conflict-resolution fix only.
- No schema migrations, auth changes, or backend function changes needed.

Validation plan
1) Reproduce prior failure path:
- Open editor, type continuously for >1 autosave cycle (3s debounce), keep typing while save/refetch happens.
- Expected: no false conflict modal.

2) Real conflict scenario:
- Simulate server-side newer update while local has unsaved edits.
- Expected: one conflict modal appears once, actions actually resolve.

3) Action correctness:
- “Keep Server Version” loads server state.
- “Overwrite with My Changes” writes local snapshot and clears conflict.

4) Mobile-first check (xs 375):
- Verify dialog layout, button tap targets, and no blocked UI loop.

5) Regression sweep:
- Offline queue sync still works when reconnecting.
- Offline indicator still reflects pending/syncing states correctly.
