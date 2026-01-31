import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIFloatingButtonProps {
  onClick: () => void;
  hasNotification?: boolean;
  className?: string;
}

export function AIFloatingButton({
  onClick,
  hasNotification = false,
  className,
}: AIFloatingButtonProps) {
  return (
    <motion.button
      className={cn(
        'fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full',
        'gradient-primary shadow-lg flex items-center justify-center',
        'touch-manipulation active:scale-95 transition-transform',
        className
      )}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
      }}
    >
      <Sparkles className="w-6 h-6 text-primary-foreground" />
      
      {/* Notification dot */}
      {hasNotification && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
      )}
      
      {/* Subtle pulse animation */}
      <motion.span
        className="absolute inset-0 rounded-full gradient-primary"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}
