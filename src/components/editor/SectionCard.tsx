import { ReactNode, memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  tip?: string;
  status?: 'empty' | 'partial' | 'complete';
  action?: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  isCollapsible?: boolean;
}

export const SectionCard = memo(function SectionCard({
  icon: Icon,
  title,
  tip,
  status,
  action,
  children,
  isOpen = false,
  onToggle,
  isCollapsible = true,
}: SectionCardProps) {
  const collapsible = isCollapsible && onToggle !== undefined;

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <Collapsible
      open={collapsible ? isOpen : true}
      onOpenChange={collapsible ? (open) => { if (open !== isOpen) onToggle?.(); } : undefined}
    >
      <div
        className={cn(
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
          'bg-card border border-border shadow-soft-sm rounded-2xl overflow-hidden relative flex flex-col',
          'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-l-2xl',
          status === 'complete' && 'before:bg-success',
          status === 'partial' && 'before:bg-warning',
          status === 'empty' && 'before:bg-muted-foreground/20',
        )}
      >
        {/* Header — full row is the toggle target when collapsible (no nested buttons) */}
        <div
          className={cn(
            'flex items-center min-h-[52px]',
            collapsible && 'cursor-pointer select-none active:opacity-80 touch-manipulation',
          )}
          onClick={collapsible ? onToggle : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          onKeyDown={collapsible ? handleHeaderKeyDown : undefined}
        >
          <div className="flex flex-1 items-center gap-2.5 pl-4 pr-2 py-3 min-w-0">
            <div className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
              status === 'complete' ? 'bg-success/15' : 'bg-primary/10',
            )}>
              <Icon className={cn(
                'w-3.5 h-3.5',
                status === 'complete' ? 'text-success' : 'text-primary',
              )} />
            </div>

            <h2 className="text-h3 !text-sm flex-1 min-w-0 truncate">{title}</h2>

            {collapsible && (
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-90',
                )}
              />
            )}
          </div>

          {/* AI action — stop click + keyboard propagation so it never toggles the header */}
          {action && (
            <div
              className="shrink-0 pr-3 flex items-center min-h-[44px]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {action}
            </div>
          )}
        </div>

        {/* Tip pill — always visible so users understand the section purpose while collapsed */}
        {tip && status !== 'complete' && (
          <div className="px-4 pb-2">
            <span className="inline-block text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              💡 {tip}
            </span>
          </div>
        )}

        {/* Section content — hidden when collapsed */}
        <CollapsibleContent>
          <div className="px-4 pb-4 flex-1">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
