import { PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';

export function PipelineSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Loading pipeline board" aria-busy="true">
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage.id}
          className="flex flex-col gap-2 min-w-[200px] w-52 shrink-0 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
