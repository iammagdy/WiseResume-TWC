export function BulkScreenSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="space-y-3 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-64 rounded bg-muted" />
            </div>
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-8 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
