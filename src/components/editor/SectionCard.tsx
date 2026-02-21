import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  tip?: string;
  status?: 'empty' | 'partial' | 'complete';
  action?: ReactNode;
  children: ReactNode;
}

export const SectionCard = memo(function SectionCard({ icon: Icon, title, tip, status, action, children }: SectionCardProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        'glass-card rounded-2xl overflow-hidden relative',
        // Left accent stripe
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-2xl',
        status === 'complete' && 'before:bg-success',
        status === 'partial' && 'before:bg-warning',
        status === 'empty' && 'before:bg-muted-foreground/20',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
        <div className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center',
          status === 'complete' ? 'bg-success/15' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            'w-3.5 h-3.5',
            status === 'complete' ? 'text-success' : 'text-primary'
          )} />
        </div>
        <h2 className="text-h3 !text-sm flex-1">{title}</h2>
        {action && <div className="shrink-0 min-h-[44px] flex items-center">{action}</div>}
      </div>

      {/* Tip pill - hidden when section is complete */}
      {tip && status !== 'complete' && (
        <div className="px-3 pb-1">
          <span className="inline-block text-tiny text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            💡 {tip}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="px-3 pb-3">
        {children}
      </div>
    </div>
  );
});
