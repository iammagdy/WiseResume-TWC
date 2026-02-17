import { Zap } from 'lucide-react';
import { getAICost } from '@/lib/aiCostEstimates';
import { cn } from '@/lib/utils';

interface AICostBadgeProps {
  operation: string;
  className?: string;
}

export function AICostBadge({ operation, className }: AICostBadgeProps) {
  const cost = getAICost(operation);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5',
        className
      )}
    >
      <Zap className="w-3 h-3" />
      ~{cost} credit{cost > 1 ? 's' : ''}
    </span>
  );
}
