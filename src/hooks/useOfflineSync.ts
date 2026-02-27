import { useEffect, useRef, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { useResumeMutations } from './useResumes';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

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

      // 3. If server is newer, silently discard local change (keep server version)
      const serverTime = new Date(serverResume.updated_at!).getTime();
      if (serverTime > change.timestamp) {
        removePendingChange(change.resumeId);
        queryClient.invalidateQueries({ queryKey: ['resume', change.resumeId] });
        continue;
      }

      // 4. No conflict -- sync normally
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
      toast.success(`All changes synced`);
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
