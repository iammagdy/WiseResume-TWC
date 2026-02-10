import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

type GestureType = 'swipe-left' | 'swipe-right' | 'swipe-down' | 'pull-refresh' | 'tap' | 'long-press';

interface GestureHintProps {
  gesture: GestureType;
  text?: string;
  show: boolean;
  onDismiss?: () => void;
  position?: 'center' | 'bottom' | 'top';
  autoHide?: number; // ms to auto-hide, 0 for manual
}

const gestureConfig: Record<GestureType, { icon: React.ReactNode; animation: object; defaultText: string }> = {
  'swipe-left': {
    icon: <ChevronLeft className="w-6 h-6" />,
    animation: { x: [0, -15, 0] },
    defaultText: 'Swipe left for actions',
  },
  'swipe-right': {
    icon: <ChevronRight className="w-6 h-6" />,
    animation: { x: [0, 15, 0] },
    defaultText: 'Swipe right for actions',
  },
  'swipe-down': {
    icon: <ChevronDown className="w-6 h-6" />,
    animation: { y: [0, 10, 0] },
    defaultText: 'Swipe down to dismiss',
  },
  'pull-refresh': {
    icon: <ChevronDown className="w-6 h-6" />,
    animation: { y: [0, 15, 0] },
    defaultText: 'Pull down to refresh',
  },
  'tap': {
    icon: <Hand className="w-6 h-6" />,
    animation: { scale: [1, 0.9, 1] },
    defaultText: 'Tap to select',
  },
  'long-press': {
    icon: <Hand className="w-6 h-6" />,
    animation: { scale: [1, 0.85, 0.85, 1] },
    defaultText: 'Long press for options',
  },
};

export function GestureHint({
  gesture,
  text,
  show,
  onDismiss,
  position = 'bottom',
  autoHide = 3000,
}: GestureHintProps) {
  const [isVisible, setIsVisible] = useState(show);
  const config = gestureConfig[gesture];

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (isVisible && autoHide > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, onDismiss]);

  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    bottom: 'bottom-24 left-1/2 -translate-x-1/2',
    top: 'top-20 left-1/2 -translate-x-1/2',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'fixed z-50 flex items-center gap-3 px-4 py-3 rounded-full',
            'glass-elevated border border-primary/20 shadow-lg',
            positionClasses[position]
          )}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
        >
          <motion.div
            className="text-primary"
            animate={config.animation}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {config.icon}
          </motion.div>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {text || config.defaultText}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to track first-time users and show hints
export function useGestureHints(storageKey: string) {
  const [hasSeenHint, setHasSeenHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(storageKey) === 'true';
  });

  const markAsSeen = () => {
    localStorage.setItem(storageKey, 'true');
    setHasSeenHint(true);
  };

  const reset = () => {
    localStorage.removeItem(storageKey);
    setHasSeenHint(false);
  };

  return { hasSeenHint, markAsSeen, reset, showHint: !hasSeenHint };
}
