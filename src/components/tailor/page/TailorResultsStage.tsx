import type { ReactNode } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TailorResultsStageProps {
  hasContent: boolean;
  children: ReactNode;
  className?: string;
}

export function TailorResultsStage({ hasContent, children, className }: TailorResultsStageProps) {
  return (
    <div className={cn('tailor-results-stage flex flex-1 flex-col min-w-0', className)}>
      <div className="tailor-results-stage__mesh" aria-hidden />
      <div className="tailor-results-stage__chrome">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/25">
            {hasContent ? (
              <BarChart3 className="w-4 h-4 text-primary" aria-hidden />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/85">
              {hasContent ? 'Live results' : 'Preview stage'}
            </p>
            <h2 className="text-sm font-semibold text-foreground leading-tight">
              {hasContent ? 'Optimization output' : 'Your transformation appears here'}
            </h2>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-right max-w-[14rem] leading-relaxed hidden sm:block">
          {hasContent
            ? 'Scores, diffs, and apply actions'
            : 'Run the optimizer to populate this panel'}
        </p>
      </div>
      <div className="tailor-results-stage__scroll">{children}</div>
    </div>
  );
}
