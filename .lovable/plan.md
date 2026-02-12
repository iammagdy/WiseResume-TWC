

## Offline-First Resume Editing: Change Queue and Sync

### Overview

Enable full offline editing during commutes by adding a change queue that captures failed cloud saves, automatically syncs when the connection returns, and provides clear visual feedback throughout. The resume data is already cached locally via zustand persist -- this plan adds the missing sync layer.

### What Already Exists

- **Local cache**: `useResumeStore` uses zustand `persist` middleware, so resume data is always in localStorage and survives page reloads
- **Offline banner**: `OfflineBanner` component shows "You're offline" / "Back online" messages
- **Network hook**: `useNetworkStatus` tracks `isOnline` and `wasOffline`
- **Auto-save**: `EditorPage` debounces saves to cloud every 3 seconds via `saveToCloud()`

### What's Missing

1. When `saveToCloud()` fails due to network issues, changes are lost (no retry)
2. No queued sync when coming back online
3. Dashboard doesn't show cached resumes when offline
4. No "Working Offline" indicator in the editor itself

### Changes

**1. `src/store/offlineSyncStore.ts` -- New file: Offline change queue**

A small zustand store (persisted to localStorage) that tracks pending changes:
- `pendingChanges`: array of `{ resumeId, updates, timestamp }` entries
- `addPendingChange(resumeId, updates)`: pushes a new entry, deduplicates by resumeId (keeps latest)
- `removePendingChange(resumeId)`: clears after successful sync
- `getPendingCount()`: returns number of queued items
- `clearAll()`: wipe queue

This store persists so even if the user closes the browser during a commute, changes are still queued when they reopen.

**2. `src/hooks/useOfflineSync.ts` -- New file: Sync engine**

A hook that:
- Subscribes to `useNetworkStatus` for `isOnline`
- When `isOnline` transitions from false to true, processes all pending changes from the queue
- Calls `updateResume.mutateAsync()` for each pending entry
- Shows a toast: "Syncing 2 offline changes..." then "All changes synced" on completion
- Provides haptic feedback on successful sync
- Returns `{ pendingCount, isSyncing }` for UI indicators

**3. `src/pages/EditorPage.tsx` -- Integrate offline queue into save flow**

Modify `saveToCloud()`:
- Wrap the existing try/catch: on network error, instead of just logging, call `addPendingChange(currentResumeId, resume)` from the offline sync store
- Show a subtle toast: "Saved locally -- will sync when online"
- Skip showing the generic "Failed to save" error for network failures

Add the `useOfflineSync` hook so syncing happens automatically when the editor is open and connection returns.

**4. `src/components/editor/OfflineIndicator.tsx` -- New file: Editor status chip**

A small component shown in the editor header area:
- When offline: amber chip with "Working Offline" and a cloud-off icon
- When syncing: blue chip with "Syncing..." and a spinning loader
- When online with pending changes: shows count "2 changes pending"
- Fades out when fully synced and online

**5. `src/pages/EditorPage.tsx` -- Render OfflineIndicator in header**

Place the `OfflineIndicator` next to the existing save status area (near the Cloud/CloudOff icons that are already imported).

**6. `src/pages/DashboardPage.tsx` -- Show cached resumes when offline**

Currently `useResumes()` is disabled when there's no user, and fails when offline. Add:
- Use react-query's `staleTime` and `gcTime` (cache time) so previously fetched resumes remain available
- When offline and query fails, show the stale/cached data with a subtle "(offline)" badge
- The zustand store already has `currentResume` cached -- for the full resume list, rely on react-query's built-in cache

**7. `src/components/layout/OfflineBanner.tsx` -- Add pending count**

When showing "Back online! Syncing changes...", include the count from the offline sync store (e.g., "Back online! Syncing 3 changes...").

### Technical Details

**Offline sync store structure:**
```
pendingChanges: [
  { resumeId: "abc-123", updates: { ...resumeData }, timestamp: 1234567890 }
]
```

Deduplication: if a change for the same resumeId already exists in the queue, replace it with the newer version (last-write-wins).

**Network error detection in saveToCloud:**
```
catch (error) {
  const isNetworkError = !navigator.onLine || 
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError');
    
  if (isNetworkError) {
    addPendingChange(currentResumeId, resume);
    // Don't show error toast -- save indicator handles it
  } else {
    // Existing error handling for non-network errors
  }
}
```

**Sync on reconnect flow:**
```
1. useNetworkStatus detects isOnline = true
2. useOfflineSync reads pendingChanges from store
3. For each entry, call updateResume.mutateAsync()
4. On success: removePendingChange(resumeId), invalidate queries
5. On failure: leave in queue for next retry
6. Show summary toast when all done
```

**React Query offline resilience (useResumes):**
```
- Add staleTime: 5 * 60 * 1000 (5 minutes)
- Add gcTime: 30 * 60 * 1000 (30 minutes) 
- Add networkMode: 'offlineFirst'
These settings let react-query serve cached data when offline
```

### Files Modified
- `src/store/offlineSyncStore.ts` -- new: pending change queue (persisted)
- `src/hooks/useOfflineSync.ts` -- new: sync engine hook
- `src/components/editor/OfflineIndicator.tsx` -- new: editor status chip
- `src/pages/EditorPage.tsx` -- integrate offline queue in saveToCloud, render OfflineIndicator
- `src/pages/DashboardPage.tsx` -- react-query cache settings for offline viewing
- `src/hooks/useResumes.ts` -- add staleTime/gcTime/networkMode for offline resilience
- `src/components/layout/OfflineBanner.tsx` -- show pending count during sync

