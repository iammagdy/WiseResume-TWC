import { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export const DragHandle = memo(function DragHandle() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 active:text-muted-foreground transition-colors touch-manipulation cursor-grab active:cursor-grabbing"
      aria-hidden="true"
    >
      <GripVertical className="w-5 h-5" />
    </motion.div>
  );
});
