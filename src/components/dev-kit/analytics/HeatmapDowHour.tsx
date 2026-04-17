import { Fragment } from 'react';
import { cn } from '@/lib/utils';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  matrix: number[][]; // 7 rows × 24 cols
}

function intensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return 'bg-muted/40';
  const pct = value / max;
  if (pct < 0.15) return 'bg-primary/10';
  if (pct < 0.3) return 'bg-primary/20';
  if (pct < 0.5) return 'bg-primary/40';
  if (pct < 0.7) return 'bg-primary/60';
  if (pct < 0.85) return 'bg-primary/80';
  return 'bg-primary';
}

export function HeatmapDowHour({ matrix }: Props) {
  const max = matrix.reduce((m, row) => Math.max(m, ...row), 0);
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[28px_repeat(24,minmax(14px,1fr))] gap-0.5">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-[9px] text-muted-foreground/60 text-center tabular-nums">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
          {DOW_LABELS.map((label, dow) => (
            <Fragment key={`row-${dow}`}>
              <div className="text-[10px] text-muted-foreground pr-1 flex items-center justify-end">
                {label}
              </div>
              {Array.from({ length: 24 }, (_, hod) => {
                const value = matrix[dow]?.[hod] ?? 0;
                return (
                  <div
                    key={`${dow}-${hod}`}
                    title={`${label} ${hod}:00 — ${value}`}
                    className={cn('aspect-square rounded-sm transition-colors', intensityClass(value, max))}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-muted/40" />
          <span className="w-3 h-3 rounded-sm bg-primary/20" />
          <span className="w-3 h-3 rounded-sm bg-primary/40" />
          <span className="w-3 h-3 rounded-sm bg-primary/60" />
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
