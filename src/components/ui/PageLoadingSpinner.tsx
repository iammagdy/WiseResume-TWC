import { motion } from 'framer-motion';

export function PageLoadingSpinner() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Simple spinner */}
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-muted border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </motion.div>
    </div>
  );
}
