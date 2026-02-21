import { motion } from 'framer-motion';
import { Globe, ArrowRight } from 'lucide-react';

interface EmptyPortfolioProps {
  onSetUp: () => void;
}

export function EmptyPortfolio({ onSetUp }: EmptyPortfolioProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg"
      >
        <Globe className="w-8 h-8 text-primary-foreground" />
      </motion.div>
      <h3 className="font-semibold text-foreground text-lg mb-1">Build Your Online Presence</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
        Create a beautiful portfolio website from your resume — share it with a single link.
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        style={{ touchAction: 'pan-y' }}
        onClick={onSetUp}
        className="gradient-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 active:scale-95 min-h-[44px] touch-manipulation"
      >
        Set Up Portfolio
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
