import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  tip?: string;
  status: 'empty' | 'partial' | 'complete';
  children: ReactNode;
}

export const SectionCard = memo(function SectionCard({ icon: Icon, title, tip, status, children }: SectionCardProps) {
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
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          status === 'complete' ? 'bg-success/15' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            'w-4 h-4',
            status === 'complete' ? 'text-success' : 'text-primary'
          )} />
        </div>
        <h3 className="text-sm font-semibold flex-1">{title}</h3>
      </div>

      {/* Tip pill */}
      {tip && (
        <div className="px-4 pb-2">
          <span className="inline-block text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            💡 {tip}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
});
