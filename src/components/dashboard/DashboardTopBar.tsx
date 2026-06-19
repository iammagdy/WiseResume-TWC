import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { memo, Suspense } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const DashboardUploadWidget = lazyWithRetry(() =>
  import('@/components/dashboard/DashboardUploadWidget').then((m) => ({
    default: m.DashboardUploadWidget,
  })),
);

interface DashboardTopBarProps {
  hasResumes: boolean;
  onOptimize: () => void;
  onBuild?: () => void;
  /** Tighter layout when user already has resumes (workspace mode). */
  compact?: boolean;
  className?: string;
}

export const DashboardTopBar = memo(function DashboardTopBar({
  hasResumes,
  onOptimize,
  onBuild,
  compact = false,
  className,
}: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        'px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between',
        compact ? 'pt-3 pb-1 gap-2' : 'pt-5 pb-2 gap-4 sm:items-end',
        className,
      )}
      aria-label="Dashboard overview"
    >
      <div className="min-w-0 flex-1">
        {compact && (
          <p className="dashboard-workspace-eyebrow mb-1">Resume workspace</p>
        )}
        <h1
          data-dashboard-heading
          className={cn(
            'font-bold tracking-tight text-foreground leading-tight',
            compact
              ? 'text-lg sm:text-xl'
              : 'text-[clamp(1.65rem,5vw,2.25rem)] leading-[1.08]',
          )}
        >
          {compact ? 'Your resumes, prioritized' : 'Make your next application stronger.'}
        </h1>
        {!compact && (
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mt-2">
            Track your resumes, improve ATS score, and continue from the highest-impact action first.
          </p>
        )}
      </div>

      <div className="flex flex-row gap-2 w-full sm:w-auto shrink-0">
        <Suspense
          fallback={
            <div
              className={cn(
                'rounded-xl animate-pulse bg-muted/40 flex-1 sm:flex-none',
                compact ? 'h-10 min-w-[8rem]' : 'h-11 min-w-[9rem]',
              )}
              aria-hidden
            />
          }
        >
          <DashboardUploadWidget variant="compact" />
        </Suspense>
        <Button
          size={compact ? 'default' : 'lg'}
          className={cn(
            'font-bold shadow-soft-md flex-1 sm:flex-none min-h-[44px]',
            'bg-gradient-to-br from-primary to-[hsl(340,68%,48%)] hover:opacity-95',
            compact ? 'h-10 px-3 text-sm rounded-xl' : 'h-11 rounded-2xl',
          )}
          onClick={() => {
            haptics.light();
            if (hasResumes) onOptimize();
            else onBuild?.();
          }}
        >
          <Wand2 className="w-4 h-4 shrink-0" />
          {hasResumes ? 'Optimize Resume' : 'Get Started'}
        </Button>
      </div>
    </header>
  );
});
