import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const indicatorY = useTransform(y, [0, threshold], [-40, 0]);
  const rotation = useTransform(y, [0, threshold], [0, 180]);

  const handleDragStart = () => {
    // Only allow pull if at top of scroll (use threshold for iOS bounce & sub-pixel precision)
    if (containerRef.current && containerRef.current.scrollTop <= 1) {
      setIsPulling(true);
    }
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (!isPulling || isRefreshing) return;
    
    // Only pull down
    if (info.offset.y > 0) {
      y.set(Math.min(info.offset.y * 0.5, threshold * 1.5));
      
      // Haptic when crossing threshold
      if (info.offset.y * 0.5 >= threshold && y.getPrevious() < threshold) {
        haptics.light();
      }
    }
  };

  const handleDragEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (y.get() >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      haptics.medium();
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    y.set(0);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ y: indicatorY }}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg"
          style={{ opacity: pullProgress }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div style={{ rotate: rotation }}>
              <ArrowDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={containerRef}
        className="h-full overflow-y-auto"
        drag={isPulling || containerRef.current?.scrollTop === 0 ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: isRefreshing ? threshold / 2 : y }}
      >
        {children}
      </motion.div>
    </div>
  );
}
