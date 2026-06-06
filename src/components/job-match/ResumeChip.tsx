import { FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeChipProps {
  title: string | null;
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
}

export function ResumeChip({ title, isLoading, onClick, className }: ResumeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('jmw-resume-chip', className)}
      aria-label={title ? `Selected resume: ${title}. Tap to change.` : 'Select a resume'}
    >
      <span className="jmw-resume-chip__icon">
        <FileText className="w-4 h-4 text-primary" aria-hidden />
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
          Resume
        </p>
        {isLoading ? (
          <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
        ) : (
          <p className="text-sm font-semibold text-foreground truncate leading-snug">
            {title ?? 'Select a resume'}
          </p>
        )}
      </div>
      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
    </button>
  );
}
