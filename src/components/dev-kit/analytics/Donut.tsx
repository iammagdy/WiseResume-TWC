import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { NamedCount } from './types';

const COLORS = ['hsl(var(--primary))', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#f43f5e', '#06b6d4', '#84cc16'];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

export function Donut({ items, height = 180 }: { items: NamedCount[]; height?: number }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={items} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5">
        {items.map((item, i) => {
          const pct = Math.round((item.count / total) * 1000) / 10;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate text-foreground capitalize">{item.name}</span>
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
