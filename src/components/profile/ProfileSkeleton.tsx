import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/BackButton";

export function ProfileSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <BackButton />
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Banner Skeleton */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Avatar & Name Skeleton */}
        <div className="flex flex-col items-center text-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 flex flex-col items-center w-full">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* Progress Card Skeleton */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>

        {/* Action Grid Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>

        {/* Portfolio Card Skeleton */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-9 rounded-xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
