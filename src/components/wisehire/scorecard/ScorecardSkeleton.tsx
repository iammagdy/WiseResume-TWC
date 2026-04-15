export function ScorecardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-56 rounded-lg bg-muted" />
      <div className="h-5 w-40 rounded bg-muted" />
      <div className="space-y-4 mt-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="flex gap-2">
              {[...Array(5)].map((__, j) => (
                <div key={j} className="h-8 w-8 rounded-full bg-muted" />
              ))}
            </div>
            <div className="h-16 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        <div className="h-10 w-28 rounded-lg bg-muted" />
        <div className="h-10 w-24 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
