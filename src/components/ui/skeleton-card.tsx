import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  delay?: number;
}

export function SkeletonCard({ className, delay = 0 }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={cn(
        'glass rounded-xl border border-border p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <div className="w-12 h-12 rounded-lg bg-muted relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Title */}
          <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          
          {/* Subtitle */}
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          
          {/* Bottom row */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>
        
        {/* Menu button skeleton */}
        <div className="w-10 h-10 rounded bg-muted animate-pulse" />
      </div>
    </motion.div>
  );
}

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 0.1} />
      ))}
    </div>
  );
}
