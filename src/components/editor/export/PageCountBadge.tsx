import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

interface PageCountBadgeProps {
  pageCount: number;
  onClick: () => void;
  className?: string;
  showPulse?: boolean;
}

export function PageCountBadge({ pageCount, onClick, className, showPulse }: PageCountBadgeProps) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.light();
        onClick();
      }}
      className={cn(
        'text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap touch-manipulation active:scale-95 transition-colors',
        'hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        showPulse && 'ring-2 ring-primary/40 animate-pulse',
        pageCount <= 2
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : pageCount <= 4
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-destructive/10 text-destructive',
        className,
      )}
      aria-label={`${pageCount} pages — set where each page ends`}
    >
      {pageCount} {pageCount === 1 ? 'page' : 'pages'}
    </button>
  );
}
