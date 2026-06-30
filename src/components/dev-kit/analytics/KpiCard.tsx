import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';
import type { SeriesPoint } from './types';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'rose';
  current?: number | null;
  previous?: number | null;
  trend?: SeriesPoint[];
  hideDelta?: boolean;
  onClick?: () => void;
  unavailable?: boolean;
}

const ACCENT_MAP: Record<NonNullable<Props['accent']>, { bg: string; text: string; spark: string }> = {
  primary: { bg: 'from-primary/15 to-primary/5', text: 'text-primary', spark: 'hsl(var(--primary))' },
  blue:    { bg: 'from-blue-500/15 to-blue-500/5', text: 'text-blue-600 dark:text-blue-400', spark: '#3b82f6' },
  green:   { bg: 'from-green-500/15 to-green-500/5', text: 'text-green-600 dark:text-green-400', spark: '#10b981' },
  purple:  { bg: 'from-purple-500/15 to-purple-500/5', text: 'text-purple-600 dark:text-purple-400', spark: '#a855f7' },
  amber:   { bg: 'from-amber-500/15 to-amber-500/5', text: 'text-amber-600 dark:text-amber-400', spark: '#f59e0b' },
  rose:    { bg: 'from-rose-500/15 to-rose-500/5', text: 'text-rose-600 dark:text-rose-400', spark: '#f43f5e' },
};

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/70 font-medium tabular-nums"><Minus className="w-3 h-3" />0%</span>;
  }
  const delta = current - previous;
  const pct = previous > 0 ? Math.round((delta / previous) * 100) : (current > 0 ? 100 : 0);
  if (delta > 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600 dark:text-green-400 font-medium tabular-nums"><TrendingUp className="w-3 h-3" />+{pct}%</span>;
  }
  if (delta < 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] text-destructive font-medium tabular-nums"><TrendingDown className="w-3 h-3" />{pct}%</span>;
  }
  return <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/70 font-medium tabular-nums"><Minus className="w-3 h-3" />0%</span>;
}

export function KpiCard({ label, value, sub, icon: Icon, accent = 'primary', current, previous, trend, hideDelta, onClick, unavailable }: Props) {
  const a = ACCENT_MAP[accent];
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? `View ${label} details` : undefined}
      className={cn(
      'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br p-4 shadow-sm text-left w-full',
      onClick && 'transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      a.bg,
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn('rounded-lg bg-background/70 backdrop-blur p-1.5', a.text)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!hideDelta && current != null && previous != null && (
          <Delta current={current} previous={previous} />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{unavailable ? 'Unavailable' : value}</p>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      {trend && trend.length > 0 && (
        <div className="mt-2 -mx-1">
          <Sparkline data={trend} color={a.spark} height={32} />
        </div>
      )}
    </Component>
  );
}
