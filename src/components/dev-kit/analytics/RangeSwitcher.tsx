import { cn } from '@/lib/utils';
import type { AnalyticsRange } from './types';

const OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

interface Props {
  value: AnalyticsRange;
  onChange: (next: AnalyticsRange) => void;
  disabled?: boolean;
}

export function RangeSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 h-7 text-xs font-medium rounded-md transition-colors tabular-nums',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
