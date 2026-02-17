import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { haptics } from '@/lib/haptics';

export function SyncConflictDialog() {
  const conflict = useOfflineSyncStore(s => s.conflictingChange);
  const { forceSync, discardLocal } = useOfflineSync();

  if (!conflict) return null;

  const serverDate = format(new Date(conflict.serverUpdatedAt), 'MMM d, yyyy h:mm a');
  const localDate = format(new Date(conflict.change.timestamp), 'MMM d, yyyy h:mm a');

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sync Conflict Detected</AlertDialogTitle>
          <AlertDialogDescription>
            This resume was updated on another device on{' '}
            <span className="font-medium text-foreground">{serverDate}</span>. Your offline
            changes are from{' '}
            <span className="font-medium text-foreground">{localDate}</span>. Which version
            do you want to keep?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel
            onClick={() => {
              haptics.light();
              discardLocal(conflict.change.resumeId);
            }}
          >
            Keep Server Version
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95"
            onClick={() => {
              haptics.light();
              forceSync(conflict.change.resumeId);
            }}
          >
            Overwrite with My Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
