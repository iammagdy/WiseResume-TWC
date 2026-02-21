import { useCallback, useRef } from 'react';
import { motion, PanInfo, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Minimum horizontal velocity (px/s) to trigger back navigation. Default 400 */
  velocityThreshold?: number;
}

/**
 * Wraps a page to enable swipe-right-to-go-back gesture on mobile.
 * Respects prefers-reduced-motion and only triggers above a velocity threshold.
 */
export function SwipeBackWrapper({ children, className, velocityThreshold = 400 }: SwipeBackWrapperProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const triggered = useRef(false);

  const handlePanEnd = useCallback((_: unknown, info: PanInfo) => {
    if (triggered.current) return;
    // Only trigger on rightward swipe that starts from the left edge area
    if (
      info.velocity.x > velocityThreshold &&
      info.offset.x > 80 &&
      Math.abs(info.offset.y) < 100
    ) {
      triggered.current = true;
      haptics.light();
      navigate(-1);
      // Reset after navigation settles
      setTimeout(() => { triggered.current = false; }, 500);
    }
  }, [navigate, velocityThreshold]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      onPanEnd={handlePanEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </motion.div>
  );
}
