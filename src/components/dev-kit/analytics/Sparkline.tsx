import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { SeriesPoint } from './types';

interface Props {
  data: SeriesPoint[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = 'hsl(var(--primary))', height = 36 }: Props) {
  if (!data || data.length === 0) {
    return <div style={{ height }} className="w-full" />;
  }
  const id = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
