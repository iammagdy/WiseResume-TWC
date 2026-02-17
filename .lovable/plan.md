

## Offline Sync Conflict Detection

### Problem

When syncing offline changes back to the server, the current code blindly overwrites whatever is on the server. If the user edited the same resume on another device while offline, the sync silently discards the newer server version.

### Solution

Add a timestamp-based conflict check to the sync loop. Before pushing each offline change, fetch the server's `updated_at` for that resume. If the server version is newer than the local change's timestamp, pause and show a "Conflict Detected" dialog. Non-conflicting updates sync silently as before.

---

### Changes

**1. Modified: `src/store/offlineSyncStore.ts`**

- Add a `conflictingChange` field to the store state (holds the single change that conflicted, or `null`)
- Add a `serverUpdatedAt` field on the conflict object so the dialog can show when the server was last updated
- Add actions: `setConflict(change, serverUpdatedAt)`, `clearConflict()`
- The `PendingChange` interface already has `timestamp` which records when the local edit was made -- this is the comparison point

**2. Modified: `src/hooks/useOfflineSync.ts`**

- Before calling `updateResume.mutateAsync`, fetch the server's `updated_at` for the resume:
  ```
  const { data } = await supabase
    .from('resumes')
    .select('updated_at')
    .eq('id', change.resumeId)
    .maybeSingle();
  ```
- Compare: if `serverUpdatedAt > change.timestamp`, set the conflict in the store and skip this change (break out of the sync loop)
- If no conflict, proceed with the update as normal
- Add a `forceSync(resumeId)` function that pushes the local version regardless (called when user picks "Force Overwrite")
- Add a `discardLocal(resumeId)` function that removes the pending change without syncing (called when user picks "Keep Server Version")
- After force or discard, clear the conflict and resume syncing remaining changes

**3. New: `src/components/editor/SyncConflictDialog.tsx`**

An AlertDialog that renders when `offlineSyncStore.conflictingChange` is not null:

- Title: "Sync Conflict Detected"
- Description: "This resume was updated on another device on [date]. Your offline changes are from [date]. Which version do you want to keep?"
- Two actions:
  - "Keep Server Version" -- calls `discardLocal`, clears conflict, invalidates query cache to refetch
  - "Overwrite with My Changes" (destructive) -- calls `forceSync`, clears conflict
- Uses the existing AlertDialog + glass-elevated styling
- Minimum 44x44px touch targets, `active:scale-95` on buttons

**4. Modified: `src/components/layout/AppShell.tsx`**

- Render `<SyncConflictDialog />` at the app shell level so it appears regardless of which page the user is on when sync runs

### Technical Details

**Conflict detection logic in `useOfflineSync`:**

```text
for (const change of changes) {
  // 1. Fetch server timestamp
  const { data: serverResume } = await supabase
    .from('resumes')
    .select('updated_at')
    .eq('id', change.resumeId)
    .maybeSingle();

  // 2. If resume was deleted on server, discard local change
  if (!serverResume) {
    removePendingChange(change.resumeId);
    continue;
  }

  // 3. Check for conflict
  const serverTime = new Date(serverResume.updated_at).getTime();
  if (serverTime > change.timestamp) {
    // Conflict! Server is newer than our offline edit
    setConflict(change, serverResume.updated_at);
    break; // Stop syncing, wait for user decision
  }

  // 4. No conflict -- sync normally
  await updateResume.mutateAsync({ ... });
  removePendingChange(change.resumeId);
}
```

**Force overwrite flow:**

```text
forceSync(resumeId):
  1. Get pending change from store
  2. Call updateResume.mutateAsync (no timestamp check)
  3. removePendingChange(resumeId)
  4. clearConflict()
  5. Resume syncPending() for remaining items
```

**Discard local flow:**

```text
discardLocal(resumeId):
  1. removePendingChange(resumeId)
  2. clearConflict()
  3. Invalidate query cache for ['resume', resumeId] to refetch server version
  4. Resume syncPending() for remaining items
```

**Edge cases handled:**
- Resume deleted on server while offline: auto-discard local change, no dialog
- Multiple conflicting resumes: handled one at a time (sync pauses at first conflict, resumes after resolution)
- Guest users: no offline sync runs for guests (no `user`), so no conflict possible

### Files Changed

- `src/store/offlineSyncStore.ts` -- add conflict state + actions
- `src/hooks/useOfflineSync.ts` -- add timestamp check, forceSync, discardLocal
- `src/components/editor/SyncConflictDialog.tsx` (new) -- conflict resolution AlertDialog
- `src/components/layout/AppShell.tsx` -- render SyncConflictDialog globally

