import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import '@/components/editor/ai-intro-coachmark.css';

interface AIIntroTooltipProps {
  show: boolean;
  onDismiss: () => void;
}

/**
 * One-time inline hint below the editor header (not a fixed overlay).
 */
export function AIIntroTooltip({ show, onDismiss }: AIIntroTooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!show) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(true), 400);
    return () => window.clearTimeout(t);
  }, [show]);

  const dismiss = useCallback(() => {
    haptics.light();
    onDismiss();
  }, [onDismiss]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          key="ai-intro-banner"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="editor-ai-intro-banner shrink-0 overflow-hidden"
        >
          <div className="editor-ai-intro-banner__icon" aria-hidden>
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="editor-ai-intro-banner__text">
            <p className="editor-ai-intro-banner__title">
              Section AI — tap the sparkle on any block
            </p>
            <p className="editor-ai-intro-banner__desc">
              Tailor, score, and improve without leaving the editor
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all touch-manipulation min-h-[36px]"
          >
            Got it
          </button>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors touch-manipulation"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
