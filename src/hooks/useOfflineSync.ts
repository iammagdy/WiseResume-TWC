import { useEffect, useRef, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { useResumeMutations } from './useResumes';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const prevOnline = useRef(isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const { pendingChanges, removePendingChange } = useOfflineSyncStore();
  const { updateResume } = useResumeMutations();
  const pendingCount = pendingChanges.length;

  const syncPending = useCallback(async () => {
    const changes = useOfflineSyncStore.getState().pendingChanges;
    if (changes.length === 0) return;

    setIsSyncing(true);
    toast.info(`Syncing ${changes.length} offline change${changes.length > 1 ? 's' : ''}...`);

    let synced = 0;
    for (const change of changes) {
      try {
        await updateResume.mutateAsync({
          resumeId: change.resumeId,
          updates: change.updates,
        });
        removePendingChange(change.resumeId);
        synced++;
      } catch (error) {
        console.error('Failed to sync change for', change.resumeId, error);
        // Leave in queue for next retry
      }
    }

    setIsSyncing(false);

    if (synced > 0) {
      haptics.success();
      toast.success(`All changes synced`);
    }
  }, [updateResume, removePendingChange]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      syncPending();
    }
    prevOnline.current = isOnline;
  }, [isOnline, syncPending]);

  return { pendingCount, isSyncing };
}
