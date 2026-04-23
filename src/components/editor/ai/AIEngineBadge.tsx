import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import './AIEngineBadge.css';

interface AIEngineBadgeProps {
  showSettingsLink?: boolean;
  className?: string;
}

/**
 * Static "Powered by WiseResume AI" badge. The flat 6-key pool is the
 * only engine — there is nothing for the user to configure, so the
 * showSettingsLink prop is accepted for backward compatibility but has
 * no effect.
 */
export const AIEngineBadge = memo(function AIEngineBadge({
  className,
}: AIEngineBadgeProps) {
  return (
    <div
      className={cn(
        'ai-engine-badge cursor-default',
        className
      )}
    >
      <div className="ai-engine-badge-inner opacity-90">
        <span className="ai-engine-particle" />
        <span className="ai-engine-particle" />
        <Sparkles className="w-4 h-4 ai-engine-icon text-primary" />
        <span className="ai-engine-text text-sm font-medium">
          Powered by WiseResume AI
        </span>
      </div>
    </div>
  );
});
