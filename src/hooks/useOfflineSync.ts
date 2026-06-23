import { useEffect, useRef, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { useResumeMutations } from './useResumes';
import { useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

/**
 * Exported for tests. A sync conflict means the server's current `$updatedAt`
 * is newer than the baseline `$updatedAt` the offline edit started from — i.e.
 * someone saved elsewhere after we loaded. Comparing against the baseline (not
 * the client wall-clock queue time) makes this immune to device clock skew.
 * Legacy pending entries without a baseline fall back to the queue timestamp.
 */
export function isOfflineSyncConflict(
  serverUpdatedAt: string,
  change: { timestamp: number; baseUpdatedAt?: string | null },
): boolean {
  const serverTime = new Date(serverUpdatedAt).getTime();
  const baseTime = change.baseUpdatedAt ? new Date(change.baseUpdatedAt).getTime() : null;
  return baseTime != null && !Number.isNaN(baseTime)
    ? serverTime > baseTime
    : serverTime > change.timestamp;
}

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const prevOnline = useRef(isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const { pendingChanges, removePendingChange } = useOfflineSyncStore();
  const { updateResume } = useResumeMutations();
  const queryClient = useQueryClient();
  const pendingCount = pendingChanges.length;

  const syncPending = useCallback(async () => {
    const changes = useOfflineSyncStore.getState().pendingChanges;
    if (changes.length === 0) return;

    setIsSyncing(true);
    toast.info(`Syncing ${changes.length} offline change${changes.length > 1 ? 's' : ''}...`);

    let synced = 0;
    for (const change of changes) {
      // 1. Fetch server document to get $updatedAt
      let serverDoc: Record<string, unknown> | null = null;
      try {
        serverDoc = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.resumes,
          change.resumeId,
        ) as unknown as Record<string, unknown>;
      } catch {
        // 404 — resume was deleted on server; discard local change
        removePendingChange(change.resumeId);
        continue;
      }

      // 2. Conflict detection: a real conflict means the server advanced PAST the
      //    baseline this offline edit started from (someone saved elsewhere). We
      //    compare the server's current $updatedAt against the baseline $updatedAt
      //    captured when the edit was made — NOT the client wall-clock queue time,
      //    which device clock skew could make wrongly look "older" and silently
      //    discard valid offline work. Legacy entries without a baseline fall back
      //    to the previous comparison.
      const isConflict = isOfflineSyncConflict(serverDoc.$updatedAt as string, change);
      if (isConflict) {
        removePendingChange(change.resumeId);
        queryClient.invalidateQueries({ queryKey: ['resume', change.resumeId] });
        toast.warning(
          'A conflict was detected: your offline edits were overridden by a newer version saved elsewhere. Please review your resume.',
          { duration: 8000 },
        );
        continue;
      }

      // 3. No conflict — sync normally
      try {
        await updateResume.mutateAsync({
          resumeId: change.resumeId,
          updates: change.updates,
        });
        removePendingChange(change.resumeId);
        synced++;
      } catch (error) {
        console.error('Failed to sync change for', change.resumeId, error);
      }
    }

    setIsSyncing(false);

    if (synced > 0) {
      haptics.success();
      toast.success('All changes synced');
    }
  }, [updateResume, removePendingChange, queryClient]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      syncPending();
    }
    prevOnline.current = isOnline;
  }, [isOnline, syncPending]);

  return { pendingCount, isSyncing };
}
