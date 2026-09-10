import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface JobCardSkeletonProps {
  count?: number;
  className?: string;
}

export function JobCardSkeleton({ count = 1, className }: JobCardSkeletonProps) {
  const { direction } = useLocale();
  const isRtl = direction === 'rtl';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col rounded-xl border bg-card p-4 sm:p-5 shadow-sm h-[200px] animate-pulse",
            className
          )}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Top Line */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted rounded-full" />
              <div className="h-5 w-24 bg-muted rounded-full hidden sm:block" />
            </div>
            <div className="h-8 w-8 bg-muted rounded-md" />
          </div>

          {/* Title and Meta */}
          <div className="space-y-3 mb-6">
            <div className="h-6 w-3/4 sm:w-2/3 bg-muted rounded" />

            <div className="flex flex-wrap gap-4">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto flex flex-wrap gap-3">
            <div className="h-9 w-28 bg-muted rounded-md" />
            <div className="h-9 w-32 bg-muted rounded-md" />
          </div>
        </div>
      ))}
    </>
  );
}
