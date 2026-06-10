import { Sparkles } from 'lucide-react';
import { TailorProgressComponent } from '@/components/editor/tailor/TailorProgress';
import type { TailorProgress, EnhancedTailorProgress } from '@/types/resume';
import { cn } from '@/lib/utils';

interface JobMatchProgressStageProps {
  progress: TailorProgress | EnhancedTailorProgress | null;
  jobTitle?: string;
  company?: string;
  onCancel: () => void;
  className?: string;
}

export function JobMatchProgressStage({
  progress,
  jobTitle,
  company,
  onCancel,
  className,
}: JobMatchProgressStageProps) {
  return (
    <div
      className={cn('jmw-progress-overlay', className)}
      role="status"
      aria-live="polite"
      aria-label="AI tailoring in progress"
    >
      <div className="w-full max-w-[26rem] lg:max-w-[52rem] flex flex-col items-center gap-5 mt-10 mb-20 shrink-0">
        {/* Title area */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/12 border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              AI Tailoring
            </p>
            {(jobTitle || company) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[jobTitle, company].filter(Boolean).join(' @ ')}
              </p>
            )}
          </div>
        </div>

        {/* Progress card */}
        <div className="jmw-progress-overlay__card w-full">
          {progress ? (
            <TailorProgressComponent progress={progress} onCancel={onCancel} noCard={true} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Starting…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
