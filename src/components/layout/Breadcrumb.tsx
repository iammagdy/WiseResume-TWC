import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb trail for deep pages. Shows the hierarchy path.
 * Usage: <Breadcrumb items={['Home', 'Editor']} links={['/dashboard']} />
 * The last item is always the current page (never a link).
 * links[] maps to items[] by index; any item without a link renders as plain text.
 */
interface BreadcrumbProps {
  items: string[];
  links?: string[];
  className?: string;
}

export function Breadcrumb({ items, links = [], className }: BreadcrumbProps) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-[11px] text-muted-foreground ${className ?? ''}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const href = links[i];
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />}
            {!isLast && href ? (
              <Link to={href} className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
                {item}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground font-medium truncate max-w-[180px] sm:max-w-none' : ''} aria-current={isLast ? 'page' : undefined}>
                {item}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
