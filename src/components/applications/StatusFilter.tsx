import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ApplicationStatus } from '@/hooks/useJobApplications';

const STATUSES: { value: ApplicationStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-muted text-foreground' },
  { value: 'saved', label: 'Saved', color: 'bg-secondary/15 text-secondary-foreground' },
  { value: 'applied', label: 'Applied', color: 'bg-primary/15 text-primary' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-warning/15 text-warning' },
  { value: 'offer', label: 'Offer', color: 'bg-success/15 text-success' },
  { value: 'rejected', label: 'Rejected', color: 'bg-destructive/15 text-destructive' },
];

interface StatusFilterProps {
  value: ApplicationStatus | 'all';
  onChange: (status: ApplicationStatus | 'all') => void;
  counts?: Record<string, number>;
}

export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory px-1 -mx-1">
      {STATUSES.map((s, i) => {
        const count = s.value === 'all' ? total : counts?.[s.value];
        return (
          <button
            key={s.value}
            onClick={() => {
              haptics.selection();
              onChange(s.value);
            }}
            className={cn(
              'shrink-0 min-w-fit min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation snap-start flex items-center gap-1.5',
              i === STATUSES.length - 1 && 'mr-4',
              value === s.value
                ? s.color
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {s.label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1',
                value === s.value
                  ? 'bg-foreground/15'
                  : 'bg-muted-foreground/15'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
