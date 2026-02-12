import { CloudOff, Loader2, Cloud } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  isSyncing: boolean;
}

export function OfflineIndicator({ isSyncing }: OfflineIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const pendingCount = useOfflineSyncStore(s => s.pendingChanges.length);

  const showIndicator = !isOnline || isSyncing || pendingCount > 0;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {!isOnline ? (
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30 text-xs">
              <CloudOff className="w-3 h-3" />
              Offline
            </Badge>
          ) : isSyncing ? (
            <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing...
            </Badge>
          ) : pendingCount > 0 ? (
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30 text-xs">
              <Cloud className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
