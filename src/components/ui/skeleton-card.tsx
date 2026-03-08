import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
        'glass rounded-xl border-glow p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        {/* Menu button skeleton */}
        <Skeleton className="w-10 h-10 rounded" />
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
