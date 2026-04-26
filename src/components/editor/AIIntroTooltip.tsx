import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
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
    const showTimer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(showTimer);
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 z-ai-dialog md:right-auto md:max-w-sm"
        >
          <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-lg backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Look for ✨ AI buttons in each section</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to tailor, score & improve your resume</p>
            </div>
            <button
              onClick={() => { haptics.light(); onDismiss(); }}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-manipulation"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
