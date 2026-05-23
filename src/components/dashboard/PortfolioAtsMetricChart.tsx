import { memo, useId, useMemo } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export interface PortfolioAtsChartPoint {
  score: number;
  index: number;
}

interface PortfolioAtsMetricChartProps {
  points: PortfolioAtsChartPoint[];
  currentAvg?: number | null;
  className?: string;
}

/** Fixed 0–100 scale mini bar chart — portfolio ATS snapshots (real scores, not normalized). */
export const PortfolioAtsMetricChart = memo(function PortfolioAtsMetricChart({
  points,
  currentAvg,
  className,
}: PortfolioAtsMetricChartProps) {
  const gradId = useId().replace(/:/g, '');

  const data = useMemo(() => {
    const base = points.map((p, i) => ({
      index: i,
      score: Math.min(100, Math.max(0, p.score)),
      isLatest: i === points.length - 1,
    }));

    if (
      currentAvg != null &&
      currentAvg > 0 &&
      base.length > 0 &&
      base[base.length - 1].score !== currentAvg
    ) {
      return [
        ...base.slice(0, -1),
        { ...base[base.length - 1], isLatest: false },
        {
          index: base.length,
          score: Math.min(100, Math.max(0, currentAvg)),
          isLatest: true,
        },
      ].slice(-8);
    }

    return base;
  }, [points, currentAvg]);

  if (data.length < 2) return null;

  return (
    <div
      className={cn('portfolio-ats-metric-chart shrink-0', className)}
      role="img"
      aria-label={`ATS portfolio trend, latest ${data[data.length - 1].score}%`}
    >
      <div className="w-[92px] h-[46px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 2, bottom: 2, left: 2 }} barCategoryGap="18%">
            <defs>
              <linearGradient id={`atsBar-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id={`atsBarMuted-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <YAxis type="number" domain={[0, 100]} hide />
            <ReferenceLine y={80} stroke="hsl(var(--success))" strokeOpacity={0.12} strokeWidth={1} />
            <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} strokeWidth={1} />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={10} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell
                  key={entry.index}
                  fill={entry.isLatest ? `url(#atsBar-${gradId})` : `url(#atsBarMuted-${gradId})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between px-0.5 mt-0.5">
        <span className="text-[8px] text-muted-foreground/70 tabular-nums">0</span>
        <span className="text-[8px] text-muted-foreground/70 tabular-nums">100</span>
      </div>
    </div>
  );
});
