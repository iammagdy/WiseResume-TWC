import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

// Resume Card Skeleton - matches ResumeCard structure
export function ResumeCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      <div className="p-4 flex items-center gap-4">
        {/* Resume icon/preview */}
        <Skeleton className="w-14 h-16 rounded-lg shrink-0" />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />
          {/* Completion */}
          <Skeleton className="h-4 w-24" />
          {/* Match score badge */}
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Arrow */}
        <Skeleton className="w-5 h-5 shrink-0" />
      </div>
    </motion.div>
  );
}

// Action Card Skeleton - matches ActionCard structure
export function ActionCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-start p-4 rounded-2xl bg-card border border-border min-h-[120px]"
    >
      {/* Icon */}
      <Skeleton className="w-12 h-12 rounded-xl mb-3" />
      {/* Title */}
      <Skeleton className="h-5 w-24 mb-1" />
      {/* Description */}
      <Skeleton className="h-4 w-32" />
    </motion.div>
  );
}

// Grid of Action Card Skeletons
export function ActionCardsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionCardSkeleton />
      <ActionCardSkeleton />
    </div>
  );
}
