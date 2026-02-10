import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface FloatingCreateButtonProps {
  onClick: () => void;
}

export function FloatingCreateButton({ onClick }: FloatingCreateButtonProps) {
  return (
    <motion.button
      className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full gradient-primary backdrop-blur-md border border-primary/20 flex items-center justify-center touch-manipulation"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        haptics.medium();
        onClick();
      }}
      style={{
        boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.5)',
      }}
      aria-label="Create new resume"
    >
      <Plus className="w-6 h-6 text-primary-foreground" />
      {/* Pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-full gradient-primary"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0, 0.4],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}
