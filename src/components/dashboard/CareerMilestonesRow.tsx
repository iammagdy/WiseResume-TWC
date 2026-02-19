import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown } from 'lucide-react';
import { useCareerMilestones, Milestone } from '@/hooks/useCareerMilestones';
import { haptics } from '@/lib/haptics';

function MilestoneBadge({ milestone }: { milestone: Milestone }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleTap = () => {
    haptics.light();
    setShowTooltip(v => !v);
    if (!showTooltip) {
      setTimeout(() => setShowTooltip(false), 2500);
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={handleTap}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 min-w-[72px] ${
          milestone.earned
            ? 'bg-primary/10 border border-primary/20'
            : 'bg-muted/30 border border-border/30 opacity-50 grayscale'
        }`}
        aria-label={milestone.label}
      >
        <span className="text-2xl leading-none">{milestone.emoji}</span>
        <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2 max-w-[60px]">
          {milestone.label}
        </span>
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <div className="glass-elevated rounded-xl px-3 py-2 text-xs text-center max-w-[160px] shadow-lg border border-border/50">
              {milestone.earned ? (
                <span className="font-medium text-primary">✓ {milestone.description}</span>
              ) : (
                <span className="text-muted-foreground">{milestone.unlockHint}</span>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
              <div className="w-2 h-2 bg-card border-b border-r border-border/50 rotate-45 -translate-y-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CareerMilestonesRow() {
  const { milestones, earnedCount } = useCareerMilestones();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    haptics.light();
    setExpanded(v => !v);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="px-4 pb-2"
    >
      <div className="glass-elevated rounded-2xl overflow-hidden">
        {/* Collapsed header - always visible */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between p-4 touch-manipulation active:scale-[0.98] transition-transform min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Career Milestones</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {earnedCount}/{milestones.length} earned
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(earnedCount / milestones.length) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                  />
                </div>

                {/* Scrollable badge row */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {milestones.map(milestone => (
                    <MilestoneBadge key={milestone.id} milestone={milestone} />
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  Tap any badge to learn how to unlock it
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
