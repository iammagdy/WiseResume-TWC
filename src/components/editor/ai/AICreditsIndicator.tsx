import { Zap } from 'lucide-react';
import { useAICredits } from '@/hooks/useAICredits';
import { cn } from '@/lib/utils';

export function AICreditsIndicator() {
  const { data: credits } = useAICredits();

  if (!credits) return null;

  const remaining = (credits.daily_limit || 20) - (credits.daily_usage || 0);
  const percentage = ((credits.daily_usage || 0) / (credits.daily_limit || 20)) * 100;

  const color = percentage >= 90
    ? 'text-destructive'
    : percentage >= 70
    ? 'text-warning'
    : 'text-primary';

  return (
    <div className={cn('flex items-center gap-1 text-xs font-medium', color)}>
      <Zap className="w-3.5 h-3.5" />
      <span>{remaining}</span>
    </div>
  );
}
