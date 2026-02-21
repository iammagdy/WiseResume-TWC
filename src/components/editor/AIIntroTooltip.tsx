import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';

interface AIIntroTooltipProps {
  show: boolean;
  onDismiss: () => void;
}

export function AIIntroTooltip({ show, onDismiss }: AIIntroTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    // Show after a short delay
    const showTimer = setTimeout(() => setVisible(true), 500);
    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      haptics.light();
      onDismiss();
    }, 5500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 z-[60] md:left-auto md:right-4 md:max-w-sm"
        >
          <button
            onClick={() => { haptics.light(); onDismiss(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-lg backdrop-blur-sm text-left touch-manipulation active:scale-[0.98] transition-transform"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Look for ✨ AI buttons in each section</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to tailor, score & improve your resume</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
