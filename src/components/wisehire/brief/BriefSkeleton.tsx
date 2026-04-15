export function BriefSkeleton() {
  return (
    <div className="animate-pulse space-y-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      {/* Score ring */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-slate-700 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      {/* Sections */}
      {['Strengths', 'Concerns', 'Questions'].map((label) => (
        <div key={label} className="space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${65 + i * 8}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
