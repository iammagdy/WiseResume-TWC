import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning/20 border-b border-warning/30 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4">
            <WifiOff className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning font-medium">
              You're offline. Changes will sync when reconnected.
            </span>
          </div>
        </motion.div>
      )}
      
      {isOnline && wasOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-success/20 border-b border-success/30 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4">
            <Wifi className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">
              Back online! Syncing changes...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
