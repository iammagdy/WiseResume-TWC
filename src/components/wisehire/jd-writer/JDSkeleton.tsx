export function JDSkeleton() {
  return (
    <div className="animate-pulse space-y-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${75 + Math.sin(i) * 15}%` }} />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${70 + Math.cos(i) * 12}%` }} />
        ))}
      </div>
    </div>
  );
}
