import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface AIContextualNudgeProps {
  show: boolean;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

export function AIContextualNudge({
  show,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: AIContextualNudgeProps) {
  const handleAction = () => {
    haptics.medium();
    onAction();
  };

  const handleDismiss = () => {
    haptics.light();
    onDismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 16 }}
          exit={{ opacity: 0, y: -10, height: 0, marginTop: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">{message}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleAction}
                    className="h-8 px-3 text-xs"
                  >
                    {actionLabel}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDismiss}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
