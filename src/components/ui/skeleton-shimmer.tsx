import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonShimmerProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export function SkeletonShimmer({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonShimmerProps) {
  const baseClasses = cn(
    'relative overflow-hidden bg-muted',
    animate && 'after:absolute after:inset-0 after:translate-x-[-100%] after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
    variant === 'circular' && 'rounded-full',
    variant === 'rounded' && 'rounded-xl',
    variant === 'text' && 'rounded-md h-4',
    className
  );

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'circular' ? width : undefined),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : '100%', // Last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={style} />;
}

// Pre-configured skeleton patterns
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 space-y-3 glass-card rounded-2xl', className)}>
      <div className="flex items-start gap-3">
        <SkeletonShimmer variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <SkeletonShimmer variant="text" width="60%" height={16} />
          <SkeletonShimmer variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonShimmer variant="rounded" height={8} className="w-full" />
      <div className="flex gap-2">
        <SkeletonShimmer variant="rounded" width={60} height={24} />
        <SkeletonShimmer variant="rounded" width={80} height={24} />
      </div>
    </div>
  );
}

export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <SkeletonShimmer variant="circular" width={40} height={40} />
      <div className="flex-1">
        <SkeletonShimmer variant="text" width="70%" height={14} />
        <SkeletonShimmer variant="text" width="50%" height={12} className="mt-1.5" />
      </div>
      <SkeletonShimmer variant="rounded" width={24} height={24} />
    </div>
  );
}

export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 32, md: 40, lg: 56 };
  return <SkeletonShimmer variant="circular" width={sizes[size]} height={sizes[size]} />;
}

export function ButtonSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const heights = { sm: 36, md: 44, lg: 52 };
  const widths = { sm: 80, md: 120, lg: 160 };
  return <SkeletonShimmer variant="rounded" width={widths[size]} height={heights[size]} />;
}

export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return <SkeletonShimmer variant="text" lines={lines} />;
}
