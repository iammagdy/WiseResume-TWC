import { Skeleton } from '@/components/ui/skeleton';

export function HRAnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 flex-1 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-end gap-2 h-20">
              <Skeleton className="w-8 rounded-t" style={{ height: `${30 + i * 10}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
