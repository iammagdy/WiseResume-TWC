import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface FloatingCreateButtonProps {
  onClick: () => void;
}

export function FloatingCreateButton({ onClick }: FloatingCreateButtonProps) {
  return (
    <motion.button
      className="fixed bottom-24 right-4 z-40 h-12 px-5 rounded-full gradient-primary backdrop-blur-md border border-primary/20 flex items-center gap-2 touch-manipulation"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        haptics.medium();
        onClick();
      }}
      style={{
        boxShadow: '0 6px 24px -6px hsl(var(--primary) / 0.4)',
      }}
      aria-label="Create new resume"
    >
      <Plus className="w-5 h-5 text-primary-foreground" />
      <span className="text-sm font-semibold text-primary-foreground">New Resume</span>
    </motion.button>
  );
}
