import { ReactNode, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  isOpen = true,
  onToggle,
  isCollapsible = true,
}: SectionCardProps) {
  const collapsible = isCollapsible && onToggle !== undefined;

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
        {/* Header row — trigger + AI action are siblings, never nested */}
        <div className="flex items-center min-h-[52px]">
          {collapsible ? (
            <CollapsibleTrigger className="flex flex-1 items-center gap-2.5 pl-4 pr-2 py-3 text-left select-none active:opacity-80 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset rounded-tl-2xl min-w-0">
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
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
          ) : (
            <div className="flex flex-1 items-center gap-2.5 pl-4 pr-2 pt-4 pb-1 min-w-0">
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
            </div>
          )}

          {/* AI action — sibling of the trigger, not inside it */}
          {action && (
            <div className="shrink-0 pr-3 flex items-center min-h-[44px]">
              {action}
            </div>
          )}
        </div>

        {/* Tip pill — always visible so users know what the section is for */}
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
