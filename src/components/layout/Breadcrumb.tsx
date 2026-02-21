import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb trail for deep pages. Shows the hierarchy path.
 * Usage: <Breadcrumb items={['AI Tools', 'Cover Letters', 'Edit']} />
 */
interface BreadcrumbProps {
  items: string[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length < 2) return null;
  return (
    <div className={`flex items-center gap-1 text-[11px] text-muted-foreground ${className ?? ''}`}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
          <span className={i === items.length - 1 ? 'text-foreground font-medium' : ''}>{item}</span>
        </span>
      ))}
    </div>
  );
}
