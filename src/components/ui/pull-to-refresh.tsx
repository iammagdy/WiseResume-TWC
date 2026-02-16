import { useState, useRef, ReactNode, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const isDragging = useRef(false);
  
  const y = useMotionValue(0);

  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  // Indicator moves down with content but slightly faster/slower?
  // Standard iOS behavior: indicator appears as content pulls down.
  // We'll keep indicator fixed relative to content or strictly above?
  // Let's have indicator slide in from top.
  const indicatorY = useTransform(y, [0, threshold], [-40, 20]);
  const rotation = useTransform(y, [0, threshold], [0, 180]);
  const opacity = useTransform(y, [0, threshold / 2], [0, 1]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull if we are at the top
      if (container.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
        isDragging.current = false;
        // Don't stop propagation here, let scroll happen if needed
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      
      // Check if user is pulling down
      if (diff > 0 && container.scrollTop <= 0) {
        // If we have moved significantly, lock into drag mode
        if (diff > 5) isDragging.current = true;

        if (isDragging.current) {
          // Prevent native scrolling (rubber banding of the page body)
          if (e.cancelable) e.preventDefault();

          // Apply resistance (logarithmic)
          // y = threshold * log(diff) or similar?
          // Simple resistance: y = diff * 0.5
          // Damping as it gets further:
          const damped = diff * 0.5 * (1 - Math.min(diff / (window.innerHeight * 0.5), 0.5));
          const limited = Math.min(damped, threshold * 2.5);

          y.set(limited);

          // Haptic tick when crossing threshold
          if (limited >= threshold && y.getPrevious() < threshold) {
            haptics.light();
          }
        }
      } else {
        // If user pushes up, we might be scrolling normally.
        // If we were dragging, we should reset.
        if (y.get() > 0) {
           y.set(0);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      
      const currentPull = y.get();
      isPulling.current = false;
      isDragging.current = false;

      if (currentPull >= threshold) {
        setIsRefreshing(true);
        haptics.medium();

        // Snap to threshold to show loading
        animate(y, threshold, { type: "spring", stiffness: 300, damping: 30 });

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          // Animate back to 0
          animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
      } else {
        // Snap back to 0
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    };

    // Passive: false is crucial for preventing scroll on iOS/Android
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, threshold, y]);

  return (
    <div className={cn('relative h-full flex flex-col', className)}>
      {/* Pull indicator - positioned absolute at top, behind or above content?
          Standard behavior: Above content, pushes content down or overlays.
          If we translate content, we can put indicator behind or above.
          Let's put it above (z-index) but visually moving with the pull.
      */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
        style={{ y: indicatorY, opacity }}
      >
        <div
          className="w-10 h-10 rounded-full bg-background/95 backdrop-blur border border-border flex items-center justify-center shadow-lg"
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div style={{ rotate: rotation }}>
              <ArrowDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Scroll Container - transform and scroll separated for Android WebView */}
      <motion.div
        className="flex-1 flex flex-col min-h-0 relative z-10"
        style={{ y: y }}
      >
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
