import { useState, useRef, ReactNode, useEffect, useCallback } from 'react';
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

/** Walk up from `el` to find the nearest ancestor with overflow scroll/auto */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const isDragging = useRef(false);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  const y = useMotionValue(0);

  const indicatorY = useTransform(y, [0, threshold], [-40, 20]);
  const rotation = useTransform(y, [0, threshold], [0, 180]);
  const opacity = useTransform(y, [0, threshold / 2], [0, 1]);

  // Resolve scroll parent once on mount
  useEffect(() => {
    scrollParentRef.current = findScrollParent(wrapperRef.current);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const getScrollTop = () => scrollParentRef.current?.scrollTop ?? 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (getScrollTop() <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
        isDragging.current = false;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && getScrollTop() <= 0) {
        if (diff > 5) isDragging.current = true;

        if (isDragging.current) {
          if (e.cancelable) e.preventDefault();

          const damped = diff * 0.5 * (1 - Math.min(diff / (window.innerHeight * 0.5), 0.5));
          const limited = Math.min(damped, threshold * 2.5);

          y.set(limited);

          if (limited >= threshold && (y.getPrevious() ?? 0) < threshold) {
            haptics.light();
          }
        }
      } else {
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
        animate(y, threshold, { type: 'spring', stiffness: 300, damping: 30 });

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
        }
      } else {
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrapper.addEventListener('touchend', handleTouchEnd);
    wrapper.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchmove', handleTouchMove);
      wrapper.removeEventListener('touchend', handleTouchEnd);
      wrapper.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, threshold, y]);

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
        style={{ y: indicatorY, opacity }}
      >
        <div className="w-10 h-10 rounded-full bg-background/95 backdrop-blur border border-border flex items-center justify-center shadow-lg">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div style={{ rotate: rotation }}>
              <ArrowDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content wrapper — no internal scroll, content flows into parent scroll */}
      <motion.div style={{ y }}>
        <div ref={wrapperRef}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
