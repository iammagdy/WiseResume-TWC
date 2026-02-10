import { ReactNode, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Trash2, Copy, Edit2, Archive, Star, MoreHorizontal } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export type SwipeAction = {
  icon: ReactNode;
  label: string;
  color: 'destructive' | 'success' | 'warning' | 'primary';
  onAction: () => void;
};

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  onTap?: () => void;
  className?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 100;
const SNAP_THRESHOLD = 60;

const colorMap = {
  destructive: 'bg-destructive/20 text-destructive',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  primary: 'bg-primary/20 text-primary',
};

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  onTap,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapped, setIsSnapped] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  
  // Transform for action visibility
  const leftActionOpacity = useTransform(x, [0, SNAP_THRESHOLD], [0, 1]);
  const leftActionScale = useTransform(x, [0, SNAP_THRESHOLD], [0.8, 1]);
  const rightActionOpacity = useTransform(x, [-SNAP_THRESHOLD, 0], [1, 0]);
  const rightActionScale = useTransform(x, [-SNAP_THRESHOLD, 0], [1, 0.8]);
  
  // Background reveal
  const leftBgWidth = useTransform(x, [0, SWIPE_THRESHOLD], ['0%', '40%']);
  const rightBgWidth = useTransform(x, [-SWIPE_THRESHOLD, 0], ['40%', '0%']);

  const handleDragStart = () => {
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (disabled) return;
    
    const currentX = x.get();
    const velocity = info.velocity.x;
    
    // Haptic feedback at threshold crossings
    if (leftAction && currentX < SNAP_THRESHOLD && info.offset.x >= SNAP_THRESHOLD) {
      haptics.light();
    }
    if (rightAction && currentX > -SNAP_THRESHOLD && info.offset.x <= -SNAP_THRESHOLD) {
      haptics.light();
    }
    
    // Strong haptic at action threshold
    if (leftAction && currentX < SWIPE_THRESHOLD && info.offset.x >= SWIPE_THRESHOLD) {
      haptics.medium();
    }
    if (rightAction && currentX > -SWIPE_THRESHOLD && info.offset.x <= -SWIPE_THRESHOLD) {
      haptics.medium();
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (disabled) return;
    setIsDragging(false);
    
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Fast swipe triggers action immediately
    if (leftAction && (offset >= SWIPE_THRESHOLD || (offset > SNAP_THRESHOLD && velocity > 500))) {
      haptics.success();
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      leftAction.onAction();
      return;
    }
    
    if (rightAction && (offset <= -SWIPE_THRESHOLD || (offset < -SNAP_THRESHOLD && velocity < -500))) {
      haptics.warning();
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      rightAction.onAction();
      return;
    }
    
    // Snap to reveal action buttons
    if (leftAction && offset >= SNAP_THRESHOLD) {
      setIsSnapped('left');
      animate(x, SNAP_THRESHOLD, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }
    
    if (rightAction && offset <= -SNAP_THRESHOLD) {
      setIsSnapped('right');
      animate(x, -SNAP_THRESHOLD, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }
    
    // Reset
    setIsSnapped(null);
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  const handleTap = () => {
    if (isDragging) return;
    
    // If snapped, reset instead of tap action
    if (isSnapped) {
      setIsSnapped(null);
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }
    
    if (onTap) {
      haptics.light();
      onTap();
    }
  };

  const handleActionClick = (action: SwipeAction, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.medium();
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    setIsSnapped(null);
    action.onAction();
  };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Left action background */}
      {leftAction && (
        <motion.div
          className={cn('absolute inset-y-0 left-0 flex items-center pl-4', colorMap[leftAction.color])}
          style={{ width: leftBgWidth }}
        >
          <motion.button
            className="flex items-center gap-2 touch-manipulation"
            style={{ opacity: leftActionOpacity, scale: leftActionScale }}
            onClick={(e) => handleActionClick(leftAction, e)}
          >
            {leftAction.icon}
            <span className="text-sm font-medium">{leftAction.label}</span>
          </motion.button>
        </motion.div>
      )}
      
      {/* Right action background */}
      {rightAction && (
        <motion.div
          className={cn('absolute inset-y-0 right-0 flex items-center justify-end pr-4', colorMap[rightAction.color])}
          style={{ width: rightBgWidth }}
        >
          <motion.button
            className="flex items-center gap-2 touch-manipulation"
            style={{ opacity: rightActionOpacity, scale: rightActionScale }}
            onClick={(e) => handleActionClick(rightAction, e)}
          >
            <span className="text-sm font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </motion.button>
        </motion.div>
      )}
      
      {/* Main card content */}
      <motion.div
        className="relative bg-card touch-manipulation"
        style={{ x }}
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: rightAction ? -SWIPE_THRESHOLD * 1.2 : 0, right: leftAction ? SWIPE_THRESHOLD * 1.2 : 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        whileTap={!isDragging && !disabled ? { scale: 0.98 } : {}}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pre-configured action helpers
export const swipeActions = {
  delete: (onAction: () => void): SwipeAction => ({
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Delete',
    color: 'destructive',
    onAction,
  }),
  duplicate: (onAction: () => void): SwipeAction => ({
    icon: <Copy className="w-5 h-5" />,
    label: 'Duplicate',
    color: 'success',
    onAction,
  }),
  edit: (onAction: () => void): SwipeAction => ({
    icon: <Edit2 className="w-5 h-5" />,
    label: 'Edit',
    color: 'primary',
    onAction,
  }),
  archive: (onAction: () => void): SwipeAction => ({
    icon: <Archive className="w-5 h-5" />,
    label: 'Archive',
    color: 'warning',
    onAction,
  }),
  favorite: (onAction: () => void): SwipeAction => ({
    icon: <Star className="w-5 h-5" />,
    label: 'Favorite',
    color: 'warning',
    onAction,
  }),
};
