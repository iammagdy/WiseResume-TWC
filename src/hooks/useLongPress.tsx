import { useState, useRef, useEffect, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseLongPressOptions {
  threshold?: number; // ms to trigger long press
  onLongPress?: () => void;
  onPress?: () => void;
  onCancel?: () => void;
  hapticFeedback?: boolean;
}

interface UseLongPressReturn {
  isPressed: boolean;
  isLongPressed: boolean;
  progress: number; // 0-1 progress toward long press
  handlers: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
}

/**
 * Hook for handling long press gestures with progress indicator
 */
export function useLongPress({
  threshold = 500,
  onLongPress,
  onPress,
  onCancel,
  hapticFeedback = true,
}: UseLongPressOptions = {}): UseLongPressReturn {
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isLongPressedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setIsPressed(true);
    setProgress(0);
    isLongPressedRef.current = false;
    startTimeRef.current = Date.now();

    // Haptic feedback on press start
    if (hapticFeedback) {
      haptics.light();
    }

    // Progress update interval
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / threshold, 1);
      setProgress(newProgress);
      
      // Mid-point haptic
      if (hapticFeedback && newProgress > 0.5 && newProgress < 0.55) {
        haptics.light();
      }
    }, 16); // ~60fps

    // Long press timer
    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setIsLongPressed(true);
      setProgress(1);
      clearTimers();
      
      if (hapticFeedback) {
        haptics.medium();
      }
      
      onLongPress?.();
    }, threshold);
  }, [threshold, onLongPress, hapticFeedback, clearTimers]);

  const end = useCallback(() => {
    clearTimers();
    
    if (!isLongPressedRef.current && isPressed) {
      // Short press
      onPress?.();
    }
    
    setIsPressed(false);
    setIsLongPressed(false);
    setProgress(0);
  }, [clearTimers, isPressed, onPress]);

  const cancel = useCallback(() => {
    clearTimers();
    setIsPressed(false);
    setIsLongPressed(false);
    setProgress(0);
    onCancel?.();
  }, [clearTimers, onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    isPressed,
    isLongPressed,
    progress,
    handlers: {
      onMouseDown: start,
      onMouseUp: end,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: end,
      onTouchCancel: cancel,
    },
  };
}

/**
 * Component wrapper for long press with visual feedback
 */
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LongPressButtonProps {
  children: ReactNode;
  onLongPress: () => void;
  onPress?: () => void;
  threshold?: number;
  className?: string;
  progressClassName?: string;
  showProgress?: boolean;
}

export function LongPressButton({
  children,
  onLongPress,
  onPress,
  threshold = 500,
  className,
  progressClassName,
  showProgress = true,
}: LongPressButtonProps) {
  const { isPressed, progress, handlers } = useLongPress({
    threshold,
    onLongPress,
    onPress,
  });

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden touch-manipulation',
        className
      )}
      animate={isPressed ? { scale: 0.96 } : { scale: 1 }}
      {...handlers}
    >
      {/* Progress indicator */}
      {showProgress && isPressed && (
        <motion.div
          className={cn(
            'absolute inset-0 bg-primary/20 origin-left',
            progressClassName
          )}
          style={{ scaleX: progress }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
