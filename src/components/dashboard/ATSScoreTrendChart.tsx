import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ScoreHistoryEntry } from '@/store/atsScoreHistoryStore';
import { cn } from '@/lib/utils';

interface ATSScoreTrendChartProps {
  history: ScoreHistoryEntry[];
  mode: 'sparkline' | 'full';
}

const chartConfig: ChartConfig = {
  score: {
    label: 'ATS Score',
    color: 'hsl(var(--primary))',
  },
};

export function ATSScoreTrendChart({ history, mode }: ATSScoreTrendChartProps) {
  const data = useMemo(
    () =>
      history.map((entry, i) => ({
        index: i,
        score: entry.score,
        date: format(new Date(entry.timestamp), 'MMM d'),
        fullDate: format(new Date(entry.timestamp), 'MMM d, h:mm a'),
      })),
    [history]
  );

  const delta = useMemo(() => {
    if (data.length < 2) return null;
    return data[data.length - 1].score - data[data.length - 2].score;
  }, [data]);

  if (data.length < 2) return null;

  if (mode === 'sparkline') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-[72px] h-[28px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill="url(#sparkFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {delta !== null && <DeltaBadge delta={delta} compact />}
      </div>
    );
  }

  // Full mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Score Trend</p>
        {delta !== null && <DeltaBadge delta={delta} />}
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="fullFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ReferenceLine y={80} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={50} stroke="hsl(var(--warning))" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullDate || '';
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#fullFill)"
            dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function DeltaBadge({ delta, compact = false }: { delta: number; compact?: boolean }) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium',
        compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        isPositive && 'bg-success/15 text-success',
        isNeutral && 'bg-muted text-muted-foreground',
        !isPositive && !isNeutral && 'bg-destructive/15 text-destructive'
      )}
    >
      <Icon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {isPositive ? '+' : ''}{delta}
    </span>
  );
}
