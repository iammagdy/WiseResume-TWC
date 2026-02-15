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
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory px-1 -mx-1">
      {STATUSES.map((s, i) => (
        <button
          key={s.value}
          onClick={() => {
            haptics.selection();
            onChange(s.value);
          }}
          className={cn(
            'shrink-0 min-w-fit px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation snap-start',
            i === STATUSES.length - 1 && 'mr-4',
            value === s.value
              ? s.color
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
