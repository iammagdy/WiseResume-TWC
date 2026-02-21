import { motion, AnimatePresence } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';

export function SlowConnectionBanner() {
  const { isSlow } = useNetworkQuality();

  return (
    <AnimatePresence>
      {isSlow && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning/10 border-b border-warning/20 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs text-warning font-medium">
            <Wifi className="w-3.5 h-3.5" />
            Slow connection detected — some features may load slowly
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
