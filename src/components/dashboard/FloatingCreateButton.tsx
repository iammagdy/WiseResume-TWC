import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface FloatingCreateButtonProps {
  onClick: () => void;
  pulse?: boolean;
  isLoading?: boolean;
}

export function FloatingCreateButton({ onClick, pulse = false, isLoading = false }: FloatingCreateButtonProps) {
  return (
    <motion.button
      className={cn(
        'fixed bottom-24 sm:bottom-20 right-4 pr-safe z-50 h-16 sm:h-14 px-6 sm:px-5 rounded-full gradient-primary backdrop-blur-md border border-primary/20 flex items-center gap-2 touch-manipulation',
        isLoading && 'pointer-events-none opacity-90'
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptics.medium();
        onClick();
      }}
      style={{
        boxShadow: '0 6px 24px -6px hsl(var(--primary) / 0.4)',
      }}
      aria-label="Create new resume"
    >
      {pulse && !isLoading && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-primary/50"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}
      {isLoading ? (
        <Loader2 className="w-6 h-6 sm:w-5 sm:h-5 text-primary-foreground relative z-10 animate-spin" />
      ) : (
        <Plus className="w-6 h-6 sm:w-5 sm:h-5 text-primary-foreground relative z-10" />
      )}
      <span className="text-sm font-semibold text-primary-foreground relative z-10">
        {isLoading ? 'Creating…' : 'New Resume'}
      </span>
    </motion.button>
  );
}
