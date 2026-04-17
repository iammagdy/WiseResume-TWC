import { cn } from '@/lib/utils';
import type { NamedCount } from './types';

interface Props {
  items: NamedCount[];
  maxItems?: number;
  formatLabel?: (name: string) => string;
}

export function RankedList({ items, maxItems = 8, formatLabel }: Props) {
  const top = items.slice(0, maxItems);
  const total = top.reduce((s, i) => s + i.count, 0) || 1;
  const max = Math.max(...top.map(i => i.count), 1);
  return (
    <ul className="space-y-2">
      {top.map((item, idx) => {
        const sharePct = Math.round((item.count / total) * 1000) / 10;
        const widthPct = Math.max(2, Math.round((item.count / max) * 100));
        return (
          <li key={`${item.name}-${idx}`} className="text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="truncate text-foreground font-medium">
                {formatLabel ? formatLabel(item.name) : item.name}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {item.count.toLocaleString()} <span className="text-muted-foreground/60">· {sharePct}%</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full bg-primary/70')}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
